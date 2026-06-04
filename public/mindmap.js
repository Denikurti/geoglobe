// Mind map — Cytoscape + dagre, polished visuals
const GeoMindmap = (() => {
  let cy = null;

  // Register dagre if available
  if (typeof cytoscapeDagre !== "undefined") cytoscape.use(cytoscapeDagre);

  const BRANCH_META = {
    History:           { color: "#d29922", bg: "#2a2200", icon: "🏛" },
    Geopolitics:       { color: "#ff7b72", bg: "#2a0a08", icon: "🌍" },
    Finance:           { color: "#56d364", bg: "#051f0a", icon: "💰" },
    "Tech & Startups": { color: "#58a6ff", bg: "#031526", icon: "💻" },
    Resources:         { color: "#3fb950", bg: "#041a08", icon: "⛏️" },
    "Follow the Money":{ color: "#e3b341", bg: "#1f1600", icon: "💵" },
    Theories:          { color: "#bc8cff", bg: "#1a0a2a", icon: "🔍" },
    Connections:       { color: "#79c0ff", bg: "#031020", icon: "🔗" },
  };

  const STATUS_COLOR = {
    CONFIRMED: "#56d364", DISPUTED: "#f85149", "PARTIALLY CONFIRMED": "#e3b341",
  };

  const LAYOUT = {
    name: "dagre", rankDir: "LR",
    nodeSep: 28, rankSep: 110, edgeSep: 5,
    fit: true, padding: 24,
    animate: true, animationDuration: 300,
    animationEasing: "ease-out-cubic",
  };

  function buildBranches(d, year, showTheories) {
    const B = [];
    B.push({
      name: "History",
      leaves: (d.history || [])
        .filter(h => h.year <= year)
        .map(h => ({ label: `${h.year} · ${h.event}`, title: `${h.year} — ${h.event}`, detail: h.detail })),
    });
    const g = d.geopolitics || {};
    B.push({
      name: "Geopolitics",
      leaves: [
        { label: `Allies (${(g.allies||[]).length})`, title: "Allies", detail: (g.allies||[]).join(", ") || "—" },
        { label: `Rivals (${(g.enemies_rivals||[]).length})`, title: "Enemies / Rivals", detail: (g.enemies_rivals||[]).join(", ") || "—" },
        { label: "Alliances", title: "Alliances", detail: (g.alliances||[]).join(", ") },
        { label: "Doctrines", title: "Key Doctrines", detail: (g.key_doctrines||[]).join(", ") },
        { label: `Bases abroad: ${g.military_bases_abroad ?? "?"}`, title: "Military Bases Abroad", detail: String(g.military_bases_abroad ?? "unknown") },
      ],
    });
    const f = d.finance || {};
    B.push({
      name: "Finance",
      leaves: [
        { label: "Currency", title: "Currency role", detail: f.currency_role },
        { label: "Central bank", title: "Central bank", detail: f.central_bank },
        { label: `Debt $${f.national_debt_usd_trillions}T`, title: "National Debt", detail: `$${f.national_debt_usd_trillions} trillion` },
        { label: "Institutions", title: "Key Institutions", detail: (f.key_institutions||[]).join(", ") },
        { label: "Leverage", title: "Leverage Tools", detail: (f.leverage_tools||[]).join(", ") },
      ],
    });
    const t = d.tech_startups || {};
    B.push({
      name: "Tech & Startups",
      leaves: [
        { label: "Hubs", title: "Tech Hubs", detail: (t.hubs||[]).join(", ") },
        { label: "Big tech", title: "Big Tech", detail: (t.big_tech||[]).join(", ") || "—" },
        { label: "VC ecosystem", title: "VC Ecosystem", detail: t.vc_ecosystem || "—" },
        { label: "Gov–tech links", title: "Gov–Tech Links", detail: (t.gov_tech_links||[]).join(", ") || "—" },
        { label: "AI leaders", title: "AI Leaders", detail: (t.ai_leaders||[]).join(", ") || "—" },
      ],
    });
    const r = d.resources || {};
    B.push({
      name: "Resources",
      leaves: Object.entries(r).map(([k, v]) => ({ label: k.replace(/_/g," "), title: k.replace(/_/g," "), detail: v })),
    });
    B.push({
      name: "Follow the Money",
      leaves: (d.follow_the_money||[]).map(m => ({ label: m.flow, title: m.flow, detail: m.detail })),
    });
    if (showTheories) {
      B.push({
        name: "Theories",
        leaves: (d.theories_disputed||[]).map(th => ({
          label: th.topic, title: th.topic, detail: th.detail,
          status: th.status, tags: th.tags,
        })),
      });
    }
    B.push({
      name: "Connections",
      leaves: (d.connections||[])
        .filter(c => !c.year || c.year <= year)
        .map(c => ({ label: `${c.to} · ${c.type}`, title: `→ ${c.to}`, detail: c.detail })),
    });
    return B.filter(b => b.leaves.length);
  }

  function render(container, data, opts, onLeafClick) {
    const { year, showTheories } = opts;
    const branches = buildBranches(data, year, showTheories);
    const elements = [];

    elements.push({ data: { id: "root", label: data.country, kind: "root" } });

    branches.forEach((b, bi) => {
      const m = BRANCH_META[b.name] || { color: "#8b949e", bg: "#1a1a2a", icon: "•" };
      const bid = `b${bi}`;
      elements.push({ data: { id: bid, label: `${m.icon}  ${b.name}`, kind: "branch", color: m.color, bg: m.bg, branch: b.name } });
      elements.push({ data: { source: "root", target: bid, edgeKind: "root-branch", color: m.color } });
      b.leaves.forEach((leaf, li) => {
        const lid = `${bid}_${li}`;
        const sc = leaf.status ? (STATUS_COLOR[leaf.status] || m.color) : m.color;
        elements.push({
          data: { id: lid, label: leaf.label, kind: "leaf", color: m.color, statusColor: sc, payload: leaf, branch: b.name },
          classes: "leaf hidden-node",
        });
        elements.push({ data: { source: bid, target: lid, edgeKind: "branch-leaf", color: m.color }, classes: "hidden-node" });
      });
    });

    renderRaw(container, data.country, elements, onLeafClick);
  }

  function renderRaw(container, rootLabel, elements, onLeafClick) {
    if (cy) cy.destroy();
    cy = cytoscape({
      container,
      elements,
      style: [
        // Root node
        {
          selector: 'node[kind="root"]',
          style: {
            "shape": "ellipse",
            "width": 64, "height": 64,
            "background-color": "#1f6feb",
            "background-gradient-stop-colors": "#58a6ff #1f6feb",
            "background-gradient-direction": "to-bottom-right",
            "border-width": 3, "border-color": "#79c0ff", "border-opacity": 0.9,
            "shadow-blur": 20, "shadow-color": "#58a6ff", "shadow-opacity": 0.6,
            "shadow-offset-x": 0, "shadow-offset-y": 0,
            "label": "data(label)",
            "color": "#ffffff", "font-size": 15, "font-weight": "bold",
            "text-valign": "center", "text-halign": "center",
            "text-wrap": "wrap", "text-max-width": 56,
          },
        },
        // Branch nodes
        {
          selector: 'node[kind="branch"]',
          style: {
            "shape": "round-rectangle",
            "width": 160, "height": 34,
            "background-color": "data(bg)",
            "border-width": 2, "border-color": "data(color)", "border-opacity": 0.85,
            "shadow-blur": 12, "shadow-color": "data(color)", "shadow-opacity": 0.4,
            "shadow-offset-x": 0, "shadow-offset-y": 2,
            "label": "data(label)",
            "color": "data(color)", "font-size": 12, "font-weight": "600",
            "text-valign": "center", "text-halign": "center",
            "text-wrap": "none",
            "cursor": "pointer",
          },
        },
        // Branch hover
        {
          selector: 'node[kind="branch"]:active, node[kind="branch"]:selected',
          style: {
            "border-width": 2.5,
            "shadow-opacity": 0.8,
          },
        },
        // Leaf nodes
        {
          selector: 'node[kind="leaf"]',
          style: {
            "shape": "round-rectangle",
            "width": 180, "height": 26,
            "background-color": "#161b22",
            "background-opacity": 0.95,
            "border-width": 1.5, "border-color": "data(statusColor)", "border-opacity": 0.6,
            "label": "data(label)",
            "color": "#c9d1d9", "font-size": 10,
            "text-valign": "center", "text-halign": "center",
            "text-wrap": "ellipsis", "text-max-width": 168,
            "cursor": "pointer",
          },
        },
        // Leaf hover
        {
          selector: 'node[kind="leaf"]:active',
          style: { "border-opacity": 1, "border-width": 2, "background-color": "#21262d" },
        },
        // Edges root→branch
        {
          selector: 'edge[edgeKind="root-branch"]',
          style: {
            "width": 2,
            "line-color": "data(color)", "line-opacity": 0.5,
            "curve-style": "bezier",
            "target-arrow-shape": "triangle", "target-arrow-color": "data(color)",
            "arrow-scale": 0.7,
          },
        },
        // Edges branch→leaf
        {
          selector: 'edge[edgeKind="branch-leaf"]',
          style: {
            "width": 1,
            "line-color": "data(color)", "line-opacity": 0.3,
            "curve-style": "bezier",
            "target-arrow-shape": "none",
            "line-style": "dashed", "line-dash-pattern": [4, 3],
          },
        },
        // Hidden
        { selector: ".hidden-node", style: { "display": "none" } },
      ],
      layout: { name: "grid" },
      wheelSensitivity: 0.25,
      minZoom: 0.15,
      maxZoom: 3,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    // Tap branch → toggle leaves
    cy.on("tap", 'node[kind="branch"]', e => {
      const node = e.target;
      const kids = node.outgoers();
      const hidden = kids.nodes().first().hasClass("hidden-node");
      kids.toggleClass("hidden-node", !hidden);
      relayout();
    });

    // Tap leaf → popup
    cy.on("tap", 'node[kind="leaf"]', e => onLeafClick(e.target.data("payload")));

    // Hover glow on leaves
    cy.on("mouseover", 'node[kind="leaf"]', e => {
      e.target.style({ "border-opacity": 1, "shadow-blur": 8, "shadow-color": e.target.data("statusColor"), "shadow-opacity": 0.5 });
    });
    cy.on("mouseout", 'node[kind="leaf"]', e => {
      e.target.style({ "border-opacity": 0.6, "shadow-blur": 0, "shadow-opacity": 0 });
    });
    cy.on("mouseover", 'node[kind="branch"]', e => {
      e.target.style({ "shadow-opacity": 0.8, "border-width": 2.5 });
    });
    cy.on("mouseout", 'node[kind="branch"]', e => {
      e.target.style({ "shadow-opacity": 0.4, "border-width": 2 });
    });

    function relayout() {
      cy.elements(":visible").layout(LAYOUT).run();
    }
    relayout();
    return cy;
  }

  return { render, renderRaw };
})();
