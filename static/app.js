// The dashboard keeps the loaded graph and the current D3 simulation here.
const communityColors = d3.scaleOrdinal(d3.schemeTableau10);
let data = null;
let simulation = null;
let selectedPerson = null;

// Switch between the three dashboard views.
document.querySelectorAll('.tab').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab, .pane').forEach((element) => {
      element.classList.remove('active');
    });

    button.classList.add('active');
    document.getElementById(button.dataset.tab).classList.add('active');

    // The relationship graph needs to be redrawn when its tab becomes visible.
    if (button.dataset.tab === 'relationships' && data) {
      drawNetwork('#relationship-network', true);
    }
  });
});

// Store a dataset, refresh the summary cards and controls, then draw the graphs.
async function loadNetwork(payload) {
  data = payload;
  document.getElementById('status').textContent = '';
  document.getElementById('dataset-name').textContent =
    `Discrete mathematics project · ${data.name}`;

  const stats = data.stats;
  const metrics = [
    ['People', stats.people],
    ['Friendships', stats.friendships],
    ['Communities', stats.communities],
    ['Modularity', stats.modularity.toFixed(3)],
  ];

  document.getElementById('metrics').innerHTML = metrics
    .map(([label, value]) => (
      `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`
    ))
    .join('');

  // Both person selectors use the same list of nodes.
  const options = data.nodes
    .map((person) => (
      `<option value="${escapeHtml(person.id)}">${escapeHtml(person.label)}</option>`
    ))
    .join('');

  const firstPerson = document.getElementById('person-a');
  const secondPerson = document.getElementById('person-b');
  firstPerson.innerHTML = options;
  secondPerson.innerHTML = options;

  if (data.nodes.length > 1) {
    secondPerson.selectedIndex = 1;
  }

  firstPerson.onchange = secondPerson.onchange = drawRelationship;
  selectedPerson = null;
  drawNetwork('#network', false);
  drawRelationship();
}

// Escape text before inserting data values into HTML markup.
function escapeHtml(value) {
  const replacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return String(value).replace(/[&<>"']/g, (character) => replacements[character]);
}

// Draw either the community overview or the relationship path view with D3.
function drawNetwork(selector, relationshipView) {
  const root = d3.select(selector);
  root.selectAll('*').remove();

  if (!data || !data.nodes.length) {
    return;
  }

  const bounds = root.node().getBoundingClientRect();
  const width = Math.max(300, bounds.width);
  const height = Math.max(300, bounds.height);
  const svg = root.append('svg').attr('viewBox', [0, 0, width, height]);

  // D3's forceLink updates source and target values, so use fresh objects
  // instead of allowing it to modify the dataset used by the rest of the app.
  const nodes = data.nodes.map((person) => ({ ...person }));
  const edges = data.edges.map((edge) => ({ ...edge }));
  const largestDegree = d3.max(nodes, (person) => person.degree) || 1;

  const links = svg.append('g')
    .selectAll('line')
    .data(edges)
    .join('line')
    .attr('class', 'edge')
    .attr('stroke-width', (edge) => Math.max(1, Math.min(4, edge.weight)));

  // In the relationship view, emphasize only the edges on the chosen route.
  const path = relationshipView ? currentPath() : [];
  const pathEdges = new Set(
    path.slice(1).map((personId, index) => (
      [path[index], personId].sort().join('|')
    )),
  );

  if (relationshipView) {
    links
      .attr('stroke', (edge) => (
        pathEdges.has([String(edge.source), String(edge.target)].sort().join('|'))
          ? '#172033'
          : '#aab2bf'
      ))
      .attr('stroke-opacity', (edge) => (
        pathEdges.has([String(edge.source), String(edge.target)].sort().join('|'))
          ? 0.9
          : 0.17
      ))
      .attr('stroke-width', (edge) => (
        pathEdges.has([String(edge.source), String(edge.target)].sort().join('|'))
          ? 3
          : 1
      ));
  }

  const circles = svg.append('g')
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('class', (person) => (
      `node ${(!relationshipView && selectedPerson === person.id) ? 'selected' : ''}`
    ))
    .attr('r', (person) => 5 + Math.sqrt(person.degree / largestDegree) * 12)
    .attr('fill', (person) => communityColors(person.community))
    .on('click', (event, person) => {
      if (relationshipView) {
        return;
      }

      selectedPerson = person.id;
      document.getElementById('person-detail').textContent =
        `Person ${person.label} · community ${person.community + 1} · ${person.degree} direct friendships`;
      drawNetwork('#network', false);
    })
    .call(
      d3.drag()
        .on('start', (event, person) => {
          if (!event.active) simulation.alphaTarget(0.25).restart();
          person.fx = person.x;
          person.fy = person.y;
        })
        .on('drag', (event, person) => {
          person.fx = event.x;
          person.fy = event.y;
        })
        .on('end', (event, person) => {
          if (!event.active) simulation.alphaTarget(0);
          person.fx = null;
          person.fy = null;
        }),
    );

  const labels = svg.append('g')
    .selectAll('text')
    .data(nodes)
    .join('text')
    .attr('class', 'node-label')
    .text((person) => person.label);

  // The force simulation spaces nodes and moves the links and labels with them.
  simulation = d3.forceSimulation(nodes)
    .force(
      'link',
      d3.forceLink(edges)
        .id((person) => person.id)
        .distance(relationshipView ? 62 : 45)
        .strength(0.5),
    )
    .force('charge', d3.forceManyBody().strength(relationshipView ? -190 : -90))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force(
      'collide',
      d3.forceCollide()
        .radius((person) => 10 + Math.sqrt(person.degree / largestDegree) * 12),
    )
    .on('tick', () => {
      links
        .attr('x1', (edge) => edge.source.x)
        .attr('y1', (edge) => edge.source.y)
        .attr('x2', (edge) => edge.target.x)
        .attr('y2', (edge) => edge.target.y);

      circles.attr('cx', (person) => person.x).attr('cy', (person) => person.y);
      labels.attr('x', (person) => person.x).attr('y', (person) => person.y);
    });
}

// The selected shortest path is shared with the relationship graph renderer.
function currentPath() {
  return window.relationshipPath || [];
}

// Find the strongest route between the two selected people using Dijkstra's
// algorithm. A larger friendship weight means a lower travel cost (1 / weight).
function drawRelationship() {
  if (!data) {
    return;
  }

  const source = document.getElementById('person-a').value;
  const target = document.getElementById('person-b').value;
  const adjacency = new Map(data.nodes.map((person) => [person.id, []]));

  // The friendship graph is undirected, so record each edge in both directions.
  for (const edge of data.edges) {
    const cost = 1 / edge.weight;
    const firstId = String(edge.source);
    const secondId = String(edge.target);
    adjacency.get(firstId).push({ id: secondId, cost });
    adjacency.get(secondId).push({ id: firstId, cost });
  }

  // Dijkstra keeps the best known distance and predecessor for each node.
  const distances = new Map([[source, 0]]);
  const previous = new Map();
  const unvisited = new Set(adjacency.keys());

  while (unvisited.size) {
    let current = null;

    // Choose the unvisited person with the smallest known distance.
    for (const personId of unvisited) {
      if (
        current === null
        || distances.get(personId) < (distances.get(current) ?? Infinity)
      ) {
        current = personId;
      }
    }

    if (
      current === null
      || !Number.isFinite(distances.get(current))
      || current === target
    ) {
      break;
    }

    unvisited.delete(current);

    // Update neighboring routes whenever this route is shorter.
    for (const neighbor of adjacency.get(current)) {
      const candidate = distances.get(current) + neighbor.cost;
      if (candidate < (distances.get(neighbor.id) ?? Infinity)) {
        distances.set(neighbor.id, candidate);
        previous.set(neighbor.id, current);
      }
    }
  }

  // Walk backward through predecessors to rebuild the route from source to target.
  let route = [];
  if (source === target) {
    route = [source];
  } else if (previous.has(target)) {
    let personId = target;
    route = [personId];

    while (personId !== source) {
      personId = previous.get(personId);
      route.unshift(personId);
    }
  }

  window.relationshipPath = route;

  const isDirect = data.edges.some((edge) => (
    (String(edge.source) === source && String(edge.target) === target)
    || (String(edge.source) === target && String(edge.target) === source)
  ));
  const sourcePerson = data.nodes.find((person) => person.id === source);
  const targetPerson = data.nodes.find((person) => person.id === target);
  const sameCommunity = sourcePerson?.community === targetPerson?.community;

  document.getElementById('relation-summary').textContent =
    `${isDirect ? 'Direct friends' : 'Not direct friends'} · ${sameCommunity ? 'same community' : 'different communities'}`;

  document.getElementById('path-display').innerHTML = route.length
    ? route.map((personId, index) => (
      `${index ? '<span class="path-arrow">→</span>' : ''}`
      + `<span class="path-node">${escapeHtml(personId)}</span>`
    )).join('')
    : '<span class="muted">No connection found.</span>';

  drawNetwork('#relationship-network', true);
}

// Read an uploaded edge-list CSV and ask the server to analyze it.
document.getElementById('csv-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Could not load this file.');
    }

    await loadNetwork(result);
  } catch (error) {
    document.getElementById('status').textContent = error.message;
  }

  // Clear the input so the same file can be selected and uploaded again.
  event.target.value = '';
});

// Load the built-in Karate Club dataset when the dashboard first opens.
fetch('/api/network')
  .then((response) => response.json())
  .then(loadNetwork)
  .catch(() => {
    document.getElementById('status').textContent =
      'Could not connect to the analysis server. Start it with python app.py.';
  });

// Rebuild visible graphs when the browser size changes.
window.addEventListener('resize', () => {
  if (!data) {
    return;
  }

  drawNetwork('#network', false);
  if (document.getElementById('relationships').classList.contains('active')) {
    drawNetwork('#relationship-network', true);
  }
});


