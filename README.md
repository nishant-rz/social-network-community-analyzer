# Social Network Community & Relationship Analyzer

A small Flask dashboard for exploring an undirected social graph. NetworkX runs Louvain community detection and graph measures; D3.js provides interactive force-directed views; Matplotlib exports a static network figure.

## Run

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Open <http://127.0.0.1:5000>.

## Use another network

Choose **Load edge list** on the Communities tab. CSV columns are `source,target` with an optional positive `weight` column. For example:

```csv
source,target,weight
Alex,Blair,2
Blair,Casey,1
Alex,Casey,3
```

The graph is undirected. Repeated pairs are combined by NetworkX, with the last row's weight used. Uploads are held in memory for the current server process.

## Project structure

- `app.py` — Flask routes, CSV input validation, NetworkX analysis, and Matplotlib export endpoint (`/api/plot.png`).
- `templates/index.html` — three dashboard tabs: Communities, Relationships, Concepts.
- `static/app.js` — D3 network interaction and relationship path calculation.
- `static/styles.css` — responsive, minimal dashboard styling.
- `sample-friendships.csv` — a small edge list for testing CSV uploads.
- `data/` — a compact DNA-repair protein association network and its source notes for a second demonstration.
- `docs/` — the project report for review preparation.

The Relationships tab uses Dijkstra's algorithm with edge cost `1 / weight`, so larger friendship weights represent stronger, shorter-cost connections. Louvain uses a fixed seed for repeatable community colours and modularity results.

The protein network is a small teaching subset of reported BioGRID associations, not a complete interactome. Its edge weights are all `1` and do not encode biological confidence or binding strength. See `data/README.md` for the evidence sources and interpretation notes.
