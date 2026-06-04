// Religion mode — panel + mindmap data builder
const ReligionPanel = (() => {

  const BRANCH_META = {
    "Origins":      { color: "#d29922", icon: "🏛" },
    "Branches":     { color: "#58a6ff", icon: "✦" },
    "Geopolitics":  { color: "#ff7b72", icon: "🌍" },
    "Theories":     { color: "#bc8cff", icon: "🔍" },
    "Timeline":     { color: "#3fb950", icon: "📅" },
  };

  // Build mindmap data from religion profile for a country
  function buildCountryData(countryName) {
    const profile = RELIGION_DATA.countries[countryName];
    if (!profile) return null;

    // Find matching religion objects
    const relNames = [profile.dominant, ...(profile.secondary || [])];
    const relKey = detectRelKey(profile.dominant);
    const rel = RELIGION_DATA.religions[relKey];

    const data = {
      country: countryName,
      _religionMode: true,
      summary: profile.dominant + (profile.secondary?.length ? " · " + profile.secondary.join(", ") : ""),
      origins: rel ? [{ label: "Overview", title: "Overview", detail: rel.summary }] : [],
      geopolitics: rel ? [{ label: "Geopolitical Impact", title: "Geopolitical Impact", detail: rel.geopolitical_impact }] : [],
      branches: rel ? rel.branches.map(b => ({ label: b.name, title: b.name, detail: b.detail, status: b.status })) : [],
      theories: rel ? rel.theories.map(t => ({ label: t.topic, title: t.topic, detail: t.detail, status: t.status })) : [],
      timeline: RELIGION_DATA.timeline.slice(0, 8).map(t => ({
        label: `${t.year > 0 ? t.year : Math.abs(t.year)+"BC"} · ${t.event}`,
        title: t.event, detail: t.detail,
      })),
    };
    return data;
  }

  function detectRelKey(dominant) {
    const d = (dominant || "").toLowerCase();
    if (d.includes("shia")) return "Islam";
    if (d.includes("sunni") || d.includes("islam") || d.includes("wahhabi")) return "Islam";
    if (d.includes("orthodox") && !d.includes("jewish")) return "Christianity";
    if (d.includes("protestant") || d.includes("catholic") || d.includes("christian") || d.includes("anglican") || d.includes("lutheran")) return "Christianity";
    if (d.includes("judai") || d.includes("jewish") || d.includes("zion")) return "Judaism";
    if (d.includes("greek") || d.includes("roman")) return "GreekRoman";
    return "Christianity";
  }

  // Build mindmap branches from religion data
  function buildBranches(data) {
    return [
      { name: "Origins",     leaves: data.origins },
      { name: "Branches",    leaves: data.branches },
      { name: "Geopolitics", leaves: data.geopolitics },
      { name: "Theories",    leaves: data.theories },
      { name: "Timeline",    leaves: data.timeline },
    ].filter(b => b.leaves && b.leaves.length);
  }

  // Render the mindmap using the same Cytoscape setup as GeoMindmap
  function renderMindmap(container, countryName, onLeafClick) {
    const data = buildCountryData(countryName);
    if (!data) {
      container.innerHTML = `<div style="padding:20px;color:#8b949e;">No religion data for ${countryName}</div>`;
      return;
    }

    const STATUS_COLOR = { CONFIRMED: "#56d364", DISPUTED: "#f85149", "PARTIALLY CONFIRMED": "#e3b341" };
    const branches = buildBranches(data);
    const elements = [];

    elements.push({ data: { id: "root", label: countryName, kind: "root" } });

    branches.forEach((b, bi) => {
      const m = BRANCH_META[b.name] || { color: "#8b949e", icon: "•" };
      const bid = `b${bi}`;
      elements.push({ data: { id: bid, label: `${m.icon}  ${b.name}`, kind: "branch", color: m.color, bg: "#1a1a2a", branch: b.name } });
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

    // Reuse GeoMindmap's render by passing our own elements
    GeoMindmap.renderRaw(container, data.country, elements, onLeafClick);
  }

  // Stat cards for religion mode
  function statCards(countryName) {
    const profile = RELIGION_DATA.countries[countryName];
    if (!profile) return [];
    const relKey = detectRelKey(profile.dominant);
    const rel = RELIGION_DATA.religions[relKey];
    const branchCount = rel ? rel.branches.length : 0;
    const theoryCount = rel ? rel.theories.length : 0;
    return [
      { label: "Religion",  value: profile.dominant.split(" ")[0] },
      { label: "Branches",  value: `${branchCount}` },
      { label: "Theories",  value: `${theoryCount} disputed` },
      { label: "Mode",      value: "Ancient" },
    ];
  }

  // Suggested chips for religion mode
  const CHIPS = [
    "How did this religion start?",
    "Sunni vs Shia — what split?",
    "How did the Church control kings?",
    "Role in modern geopolitics?",
    "Hidden theories & mysteries?",
  ];

  return { buildCountryData, renderMindmap, statCards, CHIPS };
})();
