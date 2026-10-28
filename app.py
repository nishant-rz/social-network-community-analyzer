from __future__ import annotations

import io
from pathlib import Path

import matplotlib

# The app creates image files in memory, so it does not need a desktop window.
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import networkx as nx
from flask import Flask, jsonify, render_template, request, send_file


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024  # Keep CSV uploads small.

# Keep the active graph in memory. NetworkX's built-in example lets the app
# work as soon as it starts, without a separate data download.
social_graph = nx.karate_club_graph()
dataset_name = "Zachary's Karate Club (1977)"


def get_network_data() -> dict:
    """Return graph details in the format used by the dashboard's D3 view."""
    if social_graph.number_of_nodes() == 0:
        return {
            "name": dataset_name,
            "nodes": [],
            "edges": [],
            "communities": [],
            "stats": {
                "people": 0,
                "friendships": 0,
                "communities": 0,
                "modularity": 0,
            },
        }

    # NetworkX runs Louvain. The seed keeps community assignments repeatable
    # between refreshes, which makes the colours easier to compare.
    groups = list(
        nx.community.louvain_communities(social_graph, weight="weight", seed=42)
    )
    groups.sort(key=lambda group: min(str(person) for person in group))
    community_by_person = {
        person: group_number
        for group_number, group in enumerate(groups)
        for person in group
    }

    modularity = nx.community.modularity(social_graph, groups, weight="weight")
    weighted_degrees = dict(social_graph.degree(weight="weight"))

    # Convert node IDs to strings so JSON and JavaScript handle all labels alike.
    nodes = []
    for person in social_graph.nodes():
        nodes.append(
            {
                "id": str(person),
                "label": str(person),
                "community": community_by_person[person],
                "degree": social_graph.degree(person),
                "strength": round(float(weighted_degrees[person]), 2),
            }
        )

    edges = []
    for first, second, details in social_graph.edges(data=True):
        edges.append(
            {
                "source": str(first),
                "target": str(second),
                "weight": float(details.get("weight", 1)),
            }
        )

    return {
        "name": dataset_name,
        "nodes": nodes,
        "edges": edges,
        "communities": [
            {
                "id": group_number,
                "size": len(group),
                "members": sorted(str(person) for person in group),
            }
            for group_number, group in enumerate(groups)
        ],
        "stats": {
            "people": social_graph.number_of_nodes(),
            "friendships": social_graph.number_of_edges(),
            "communities": len(groups),
            "modularity": round(modularity, 3),
        },
    }


@app.get("/")
def home():
    """Show the dashboard page."""
    return render_template("index.html")


@app.get("/api/network")
def network_data():
    """Provide the current graph and its analysis to the browser."""
    return jsonify(get_network_data())


@app.post("/api/upload")
def upload_edge_list():
    """Read a CSV edge list and use it as the current graph."""
    global social_graph, dataset_name

    uploaded_file = request.files.get("file")
    if not uploaded_file or not uploaded_file.filename:
        return jsonify(error="Choose a CSV file first."), 400

    try:
        file_text = uploaded_file.stream.read().decode("utf-8-sig")
        rows = [
            line.strip()
            for line in file_text.splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        ]
        if not rows:
            raise ValueError("The CSV has no rows.")

        first_row = [part.strip().lower() for part in rows[0].split(",")]
        has_header = first_row[:2] in (["source", "target"], ["from", "to"])
        if has_header:
            rows = rows[1:]

        # Build a candidate graph first. If a row is invalid, the current
        # dashboard data stays intact rather than being partially replaced.
        uploaded_graph = nx.Graph()
        first_data_line = 2 if has_header else 1
        for line_number, line in enumerate(rows, start=first_data_line):
            columns = [part.strip() for part in line.split(",")]
            if len(columns) not in (2, 3) or not columns[0] or not columns[1]:
                raise ValueError(f"Row {line_number}: use source,target[,weight].")

            weight = float(columns[2]) if len(columns) == 3 and columns[2] else 1.0
            if weight <= 0:
                raise ValueError(f"Row {line_number}: weight must be greater than zero.")
            uploaded_graph.add_edge(columns[0], columns[1], weight=weight)

        if uploaded_graph.number_of_nodes() < 2 or uploaded_graph.number_of_edges() == 0:
            raise ValueError("Include at least two people and one friendship.")

        social_graph = uploaded_graph
        # Use the uploaded filename as a convenient dataset label.
        dataset_name = Path(uploaded_file.filename).stem.replace("_", " ").replace("-", " ").title()
        return jsonify(get_network_data())
    except (UnicodeDecodeError, ValueError) as error:
        return jsonify(error=str(error)), 400


@app.get("/api/plot.png")
def community_plot():
    """Create a Matplotlib image of the current graph and its communities."""
    network_data = get_network_data()
    community_by_person = {
        node["id"]: node["community"] for node in network_data["nodes"]
    }
    node_colours = [community_by_person[str(person)] for person in social_graph.nodes()]
    node_sizes = [150 + 55 * social_graph.degree(person) for person in social_graph.nodes()]
    positions = nx.spring_layout(social_graph, seed=42, weight="weight")

    figure, axis = plt.subplots(figsize=(9, 6), facecolor="white")
    nx.draw_networkx_edges(
        social_graph, positions, ax=axis, alpha=0.22, width=0.8, edge_color="#667085"
    )
    nx.draw_networkx_nodes(
        social_graph,
        positions,
        ax=axis,
        node_color=node_colours,
        cmap=plt.get_cmap("Set2"),
        node_size=node_sizes,
        linewidths=0.7,
        edgecolors="white",
    )
    if social_graph.number_of_nodes() <= 80:
        nx.draw_networkx_labels(
            social_graph, positions, ax=axis, font_size=7, font_color="#172033"
        )

    axis.set_title(f"{dataset_name} · Louvain communities", loc="left", color="#172033", pad=14)
    axis.axis("off")
    figure.tight_layout()

    # Send the PNG directly from memory; no temporary image needs to be saved.
    image_buffer = io.BytesIO()
    figure.savefig(image_buffer, format="png", dpi=160, bbox_inches="tight")
    plt.close(figure)
    
    image_buffer.seek(0)
    return send_file(
        image_buffer,
        mimetype="image/png",
        download_name="community-network.png",
    )


if __name__ == "__main__":
    # debug=True is useful while developing the class project locally.
    app.run(debug=True, port=5000)
