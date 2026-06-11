// Coordinator: wires the map, mind map, overlays, timeline, toggles and chat.
const state = {
  country: null,
  data: null,
  year: 2025,
  mode: "states", // "states" | "religion"
  toggles: { theories: false, money: false, connections: false, resources: false },
};

const $ = (id) => document.getElementById(id);

// ── Agent sidebar ───────────────────────────────────────────────────────────
let activeAgent = null;

function buildAgentBar() {
  const bar = $("agentBar");
  AGENTS.forEach(agent => {
    const btn = document.createElement("button");
    btn.className = "agent-btn";
    btn.dataset.id = agent.id;
    btn.innerHTML = `${agent.icon}<span class="agent-btn-tooltip">${agent.name}</span>`;
    btn.style.borderColor = "transparent";
    btn.addEventListener("click", () => toggleAgent(agent));
    bar.appendChild(btn);
  });

}

// ---- suggestions section in drawer ----
let suggestOpen = false;

function renderSuggestChips() {
  const chips = $("suggestSectionChips");
  chips.innerHTML = "";
  let questions = [];
  if (activeAgent) questions = activeAgent.chips;
  else if (state.mode === "religion") questions = ReligionPanel.CHIPS;
  else questions = ["Key alliances?", "Main resources?", "Biggest threats?", "Economic power?", "Recent conflicts?"];
  questions.forEach(q => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = q;
    btn.addEventListener("click", () => enqueue(q));
    chips.appendChild(btn);
  });
}

$("suggestSectionHeader").addEventListener("click", () => {
  suggestOpen = !suggestOpen;
  $("suggestSectionChips").classList.toggle("open", suggestOpen);
  $("suggestSectionToggle").textContent = suggestOpen ? "▼" : "▶";
});


// ---- agent drawer width resize ----
let _drawerW = 340;
$("agentDrawerResizeHandle").addEventListener("mousedown", () => {
  _drawerW = $("agentDrawer").getBoundingClientRect().width;
});
makeDraggable($("agentDrawerResizeHandle"), (dx) => {
  _drawerW = Math.max(200, Math.min(600, _drawerW + dx));
  $("agentDrawer").style.width = `${_drawerW}px`;
});

// ---- agent drawer divider drag ----
let _drawerBodyH = 0, _drawerSlotH = 0;
$("agentDrawerDivider").addEventListener("mousedown", () => {
  _drawerBodyH = $("agentDrawerBody").getBoundingClientRect().height;
  _drawerSlotH = $("agentChatSlot").getBoundingClientRect().height;
});
makeDraggable($("agentDrawerDivider"), (_, dy) => {
  _drawerBodyH = Math.max(60, _drawerBodyH + dy);
  _drawerSlotH = Math.max(40, _drawerSlotH - dy);
  $("agentDrawerBody").style.flex = `0 0 ${_drawerBodyH}px`;
  $("agentChatSlot").style.flex  = `0 0 ${_drawerSlotH}px`;
});

function toggleAgent(agent) {
  if (activeAgent && activeAgent.id === agent.id) {
    closeAgentDrawer();
    return;
  }
  activeAgent = agent;
  document.querySelectorAll(".agent-btn").forEach(b => {
    const isThis = b.dataset.id === agent.id;
    b.classList.toggle("active", isThis);
    b.style.borderColor = isThis ? agent.color : "transparent";
  });
  openAgentDrawer(agent);
}

function closeAgentDrawer() {
  activeAgent = null;
  $("agentDrawer").classList.add("hidden");
  document.querySelectorAll(".agent-btn").forEach(b => {
    b.classList.remove("active");
    b.style.borderColor = "transparent";
  });
  applyAgentGlow(null);
}

$("agentDrawerClose").addEventListener("click", closeAgentDrawer);

function openAgentDrawer(agent) {
  const drawer = $("agentDrawer");
  drawer.classList.remove("hidden");
  $("agentDrawerTitle").textContent = `${agent.icon} ${agent.name}`;
  $("agentDrawerTitle").style.color = agent.color;
  renderAgentDrawer(agent, "overview");
  renderSuggestChips();
  applyAgentGlow(agent);
  if (chatOnLeft) syncChatToAgent();
}

function renderAgentDrawer(agent, tab) {
  const body = $("agentDrawerBody");
  const tabs = ["overview", "timeline", "countries", "ask AI"];

  body.innerHTML = `
    <div class="agent-section-tabs">
      ${tabs.map(t => `<button class="agent-tab ${t===tab?"active":""}" data-tab="${t}"
        style="${t===tab ? "border-color:"+agent.color+";color:"+agent.color : ""}"
        >${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join("")}
    </div>
    <div id="agentTabContent"></div>
  `;
  body.querySelectorAll(".agent-tab").forEach(btn => {
    btn.addEventListener("click", () => renderAgentDrawer(agent, btn.dataset.tab));
  });

  const content = $("agentTabContent");

  function addChips(chips) {
    const wrap = document.createElement("div");
    wrap.className = "agent-chips";
    chips.forEach(c => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = c;
      btn.addEventListener("click", () => askInDrawer(c, agent.color));
      wrap.appendChild(btn);
    });
    return wrap;
  }

  if (tab === "overview") {
    content.innerHTML = `
      <p class="agent-overview" style="font-style:italic;color:${agent.color};margin-bottom:8px;">"${agent.tagline}"</p>
      <p class="agent-overview">${agent.overview}</p>
      <div style="margin-top:12px">
        <div class="agent-section-title">Key facts</div>
        <div class="agent-stat-row">${agent.stats.map(s=>`<div class="agent-stat"><div class="asl">${s.label}</div><div class="asv">${s.value}</div></div>`).join("")}</div>
      </div>`;

  } else if (tab === "timeline") {
    content.innerHTML = `<div class="agent-section-title">Timeline</div>` +
      agent.timeline.map(t => `
        <div class="agent-timeline-item">
          <div class="agent-timeline-year" style="color:${agent.color}">${t.year < 0 ? Math.abs(t.year)+"BC" : t.year+"AD"}</div>
          <div class="agent-timeline-text"><strong>${t.event}</strong>${t.detail}</div>
        </div>`).join("");

  } else if (tab === "countries") {
    content.innerHTML = `<div class="agent-section-title">Country connections — click to load on map</div>`;
    Object.entries(agent.countries).forEach(([name, text]) => {
      const div = document.createElement("div");
      div.className = "agent-country-item";
      div.innerHTML = `<div class="agent-country-name" style="color:${agent.color}">${name}</div>
        <div class="agent-country-text">${text.slice(0,140)}…</div>`;
      div.addEventListener("click", () => loadCountry(name));
      content.appendChild(div);
    });

  } else if (tab === "ask AI") {
    content.innerHTML = `
      <p class="agent-overview">Ask the AI anything about <strong style="color:${agent.color}">${agent.name}</strong>.</p>
      <p class="agent-overview" style="margin-top:8px">Use the 💡 button in the left bar for quick question suggestions.</p>`;
  }
}

// Ask AI from inside the drawer — shows response in the drawer itself
async function askInDrawer(question, accentColor) {
  const slot = $("agentChatSlot");
  slot.style.display = "flex";

  // always create a fresh answer card (stack them up)
  const ansBox = document.createElement("div");
  ansBox.className = "drawer-answer";
  slot.insertBefore(ansBox, slot.querySelector("#chat") || null);

  const aEl = document.createElement("div");
  aEl.className = "drawer-a";
  aEl.textContent = "…thinking";

  const closeBtn = document.createElement("button");
  closeBtn.className = "drawer-answer-close";
  closeBtn.textContent = "×";
  closeBtn.title = "Remove this answer";
  closeBtn.addEventListener("click", () => ansBox.remove());

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "drawer-toggle-size";
  toggleBtn.textContent = "▲ Collapse";
  toggleBtn.addEventListener("click", () => {
    const collapsed = aEl.classList.toggle("collapsed");
    toggleBtn.textContent = collapsed ? "▼ Expand" : "▲ Collapse";
  });

  ansBox.innerHTML = `<div class="drawer-q" style="color:${accentColor}">${question}</div>`;
  ansBox.appendChild(closeBtn);
  ansBox.appendChild(aEl);
  ansBox.appendChild(toggleBtn);

  // Resize handle at bottom of card
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "drawer-answer-resize";
  ansBox.appendChild(resizeHandle);
  let _cardH = 0;
  resizeHandle.addEventListener("mousedown", () => {
    _cardH = ansBox.getBoundingClientRect().height;
  });
  makeDraggable(resizeHandle, (_, dy) => {
    _cardH = Math.max(60, _cardH + dy);
    ansBox.style.height = `${_cardH}px`;
    aEl.classList.remove("collapsed");
    toggleBtn.textContent = "▲ Collapse";
  });

  ansBox.scrollIntoView({ behavior: "smooth", block: "end" });

  const context = activeAgent ? activeAgent.name : (state.country || "the world");
  try {
    const answer = await askAI(context, question);
    aEl.textContent = answer;
  } catch (e) {
    aEl.style.color = "#ffa198";
    aEl.textContent = "Error: " + e.message;
  }
}

// ---- move chat left / right ----
let chatOnLeft = false;
// Start with on-right class
$("chat").classList.add("on-right");

$("moveChatBtn").addEventListener("click", () => {
  chatOnLeft = !chatOnLeft;
  const chat = $("chat");
  const vDiv = $("vDivider");
  if (chatOnLeft) {
    chat.classList.remove("on-right");
    chat.classList.add("on-left");
    if (!activeAgent && AGENTS.length) toggleAgent(AGENTS[0]);
    const slot = $("agentChatSlot");
    slot.style.display = "flex";
    slot.appendChild(vDiv);
    slot.appendChild(chat);
    $("moveChatBtn").textContent = "⇄ Right";
    syncChatToAgent();
  } else {
    chat.classList.remove("on-left");
    chat.classList.add("on-right");
    const panelContent = $("panelContent");
    panelContent.appendChild(vDiv);
    panelContent.appendChild(chat);
    $("moveChatBtn").textContent = "⇄ Left";
    if (state.data) { renderChips(); $("chatInput").placeholder = `Ask anything about ${state.data.country}…`; }
  }
});

function syncChatToAgent() {
  if (!activeAgent) return;
  $("chatInput").placeholder = `Ask anything about ${activeAgent.name}…`;
  // Refresh suggest popup if open
  if (!$("suggestPopup").classList.contains("hidden")) renderSuggestChips();
}

// ---- mode tabs ----
document.querySelectorAll(".mode-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.mode = btn.dataset.mode;
    const ancient = state.mode === "religion";
    GeoMap.setAncientMode(ancient, onCityClick);
    // News only exists in States mode — hide dots, button, and drawer in Religion mode
    GeoMap.showNewsDots(!ancient && newsDotsVisible);
    $("newsToggleBtn").style.display = ancient ? "none" : "";
    if (ancient) {
      newsDrawer.classList.remove("open");
      setTimeout(() => newsDrawer.classList.add("hidden"), 350);
      conflictDrawer.classList.remove("open");
      setTimeout(() => conflictDrawer.classList.add("hidden"), 350);
      GeoMap.setConflictDots([], () => {});
      GeoMap.clearTimelineColors();
    } else {
      GeoMap.setConflictDots(CURRENT_CONFLICTS, openConflictDrawer);
      updateTimelineMap(state.year);
    }
    if (state.country) renderPanel();
  });
});

function onCityClick(city) {
  // Show the city in the panel
  $("panel").classList.remove("collapsed");
  $("panelEmpty").classList.add("hidden");
  $("panelContent").classList.remove("hidden");
  $("countryName").textContent = city.name;
  $("countrySummary").textContent = city.summary;
  $("statCards").innerHTML = `
    <div class="stat-card"><div class="stat-label">Type</div><div class="stat-value">${city.type}</div></div>
    <div class="stat-card"><div class="stat-label">Location</div><div class="stat-value">${city.lon.toFixed(1)}°E, ${city.lat.toFixed(1)}°N</div></div>
  `;
  // Build a simple mindmap for the city using religion panel's raw renderer
  const elements = [];
  elements.push({ data: { id: "root", label: city.name, kind: "root" } });
  const detail = city.detail;
  const sentences = detail.split(". ").filter(s => s.length > 10);
  const colors = { holy: "#ffd700", church: "#c080ff", islam: "#40c040", byzantine: "#8080ff", philosophy: "#60d0ff", ancient: "#ff9040" };
  const col = colors[city.type] || "#8b949e";
  elements.push({ data: { id: "b0", label: "✦  History & Significance", kind: "branch", color: col, bg: "#1a1a2a" } });
  elements.push({ data: { source: "root", target: "b0", edgeKind: "root-branch", color: col } });
  sentences.slice(0, 6).forEach((s, i) => {
    elements.push({
      data: { id: `b0_${i}`, label: s.slice(0, 42) + (s.length > 42 ? "…" : ""), kind: "leaf", color: col, statusColor: col,
        payload: { title: city.name, detail: s + "." }, branch: "History & Significance" },
      classes: "leaf hidden-node",
    });
    elements.push({ data: { source: "b0", target: `b0_${i}`, edgeKind: "branch-leaf", color: col }, classes: "hidden-node" });
  });
  GeoMindmap.renderRaw($("mindmap"), city.name, elements, showPopup);
  $("chatInput").placeholder = `Ask anything about ${city.name}…`;
  state.country = city.name;
}

function renderPanel() {
  if (state.mode === "religion") {
    const profile = RELIGION_DATA.countries[state.country];
    $("countrySummary").textContent = profile
      ? profile.dominant + (profile.secondary?.length ? " · " + profile.secondary.join(", ") : "")
      : state.data?.summary || "";
    const cards = ReligionPanel.statCards(state.country);
    $("statCards").innerHTML = cards.map(s =>
      `<div class="stat-card"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`
    ).join("");
    ReligionPanel.renderMindmap($("mindmap"), state.country, showPopup);
  } else {
    renderStatCards(state.data);
    renderChips();
    renderMindmap();
    refreshOverlays();
  }
}

let chatLogExpanded = false;
$("expandChatLog").addEventListener("click", () => {
  chatLogExpanded = !chatLogExpanded;
  const panel = $("panelContent");
  const totalH = panel.getBoundingClientRect().height;
  if (chatLogExpanded) {
    const expandedChatH = Math.floor(totalH * 0.75);
    $("mindmap").style.flex = `0 0 ${Math.max(60, totalH - expandedChatH - 20)}px`;
    $("chat").style.flex = `0 0 ${expandedChatH}px`;
    $("expandChatLog").textContent = "⤡ Collapse";
  } else {
    $("mindmap").style.flex = "";
    $("chat").style.flex = "0 0 260px";
    $("expandChatLog").textContent = "⤢ Expand";
  }
  $("chatLog").scrollTop = $("chatLog").scrollHeight;
});


$("clearChat").addEventListener("click", () => {
  $("chatLog").innerHTML = "";
  if (state.country) chatHistories[state.country] = "";
});

// ---- per-country chat history ----
const chatHistories = {};

function saveChatHistory(country) {
  if (!country) return;
  chatHistories[country] = $("chatLog").innerHTML;
}

function restoreChatHistory(country) {
  $("chatLog").innerHTML = chatHistories[country] || "";
  $("chatLog").scrollTop = $("chatLog").scrollHeight;
}

// ---- stat cards ----
function renderStatCards(data) {
  const geo = data.geopolitics || {};
  const fin = data.finance || {};
  const res = data.resources || {};
  const stats = [
    { label: "Allies", value: (geo.allies || []).length ? `${(geo.allies||[]).length} nations` : "—" },
    { label: "Debt", value: fin.national_debt_usd_trillions ? `$${fin.national_debt_usd_trillions}T` : "—" },
    { label: "Mil. Bases", value: geo.military_bases_abroad != null ? geo.military_bases_abroad : "—" },
    { label: "Currency", value: fin.currency_role ? fin.currency_role.split("=")[0].trim() : "—" },
  ];
  $("statCards").innerHTML = stats.map(s =>
    `<div class="stat-card"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`
  ).join("");
}

// ---- suggested chips ----
const CHIPS = [
  "Key alliances?",
  "Main resources?",
  "Biggest threats?",
  "Economic power?",
  "Recent conflicts?",
];

function renderChips() { /* chips now live in the suggest popup */ }

async function loadCountry(name) {
  saveChatHistory(state.country);
  state.country = name;

  let hasData = true;
  try {
    const FILE_ALIAS = { "United Kingdom": "uk", "North Macedonia": "north_macedonia", "Bosnia": "bosnia", "Kosovo": "kosovo", "Montenegro": "montenegro", "South Africa": "south_africa" };
    const fname = FILE_ALIAS[name] || name.toLowerCase().replace(/\s+/g,"_");
    const res = await fetch(`data/${fname}.json`);
    if (!res.ok) throw new Error("no data");
    state.data = await res.json();
  } catch {
    hasData = false;
    state.data = { country: name, summary: "No detailed data yet for this country.", geopolitics:{}, finance:{}, resources:{}, history:[], connections:[], follow_the_money:[], theories_disputed:[] };
  }

  GeoMap.setActive(name);
  $("panel").classList.remove("collapsed");
  $("panelEmpty").classList.add("hidden");
  $("panelContent").classList.remove("hidden");
  $("countryName").textContent = name;
  $("countrySummary").textContent = hasData ? (state.data.summary || "") : "Ask the AI anything about this country below.";
  $("chatInput").placeholder = `Ask anything about ${name}…`;

  restoreChatHistory(name);
  if (hasData) renderPanel();
  else {
    $("statCards").innerHTML = "";
    $("mindmap").innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:13px">No map data yet — use AI chat below</div>`;
  }
  openMobilePanel();
}


function renderMindmap() {
  GeoMindmap.render(
    $("mindmap"),
    state.data,
    { year: state.year, showTheories: state.toggles.theories },
    showPopup
  );
}

function refreshOverlays() {
  GeoMap.updateOverlays(state.data, { year: state.year, ...state.toggles });
}

// ---- leaf popup ----
let popupContext = "";
function showPopup(leaf) {
  popupContext = `${leaf.title}: ${leaf.detail}`;
  let html = `<h3>${leaf.title}</h3>`;
  if (leaf.status) {
    const cls = leaf.status.startsWith("PARTIALLY") ? "PARTIALLY" : leaf.status;
    html += `<span class="tag ${cls}">${leaf.status}</span>`;
  }
  html += `<p>${leaf.detail || ""}</p>`;
  if (leaf.tags) html += leaf.tags.map((t) => `<span class="tag DISPUTED">${t}</span>`).join("");
  $("popupBody").innerHTML = html;
  $("popup").classList.remove("hidden");
}
$("popupClose").onclick = () => $("popup").classList.add("hidden");
$("popupAsk").onclick = () => {
  $("popup").classList.add("hidden");
  enqueue(`Explain more: ${popupContext}`);
};

// ---- timeline ----
let timelineEventTimer = null;
$("timeline").addEventListener("input", (e) => {
  state.year = +e.target.value;
  $("yearLabel").textContent = state.year;
  if (state.data) { renderMindmap(); refreshOverlays(); }
  if (state.mode === "states") updateTimelineMap(state.year);
});

function updateTimelineMap(year) {
  const colorMap = {};
  const activeEvents = [];

  TIMELINE_CONFLICTS.forEach(ev => {
    if (year >= ev.years[0] && year <= ev.years[1]) {
      activeEvents.push(ev.title);
      (ev.at_war   || []).forEach(c => { colorMap[c] = "tl-at-war"; });
      (ev.allied   || []).forEach(c => { if (!colorMap[c]) colorMap[c] = "tl-allied"; });
      (ev.occupied || []).forEach(c => { colorMap[c] = "tl-occupied"; });
      (ev.tensions || []).forEach(c => { if (!colorMap[c]) colorMap[c] = "tl-tension"; });
    }
  });

  GeoMap.setTimelineColors(colorMap);

  // show event bar
  const bar = $("timelineEventBar");
  if (activeEvents.length) {
    bar.textContent = "⚔️ " + activeEvents.slice(0,3).join("  ·  ");
    bar.classList.add("visible");
  } else {
    bar.classList.remove("visible");
  }
  clearTimeout(timelineEventTimer);
  timelineEventTimer = setTimeout(() => bar.classList.remove("visible"), 2500);
}

// ---- toggles ----
const toggleMap = { tTheories: "theories", tMoney: "money", tConnections: "connections", tResources: "resources" };
Object.entries(toggleMap).forEach(([id, key]) => {
  $(id).addEventListener("change", (e) => {
    state.toggles[key] = e.target.checked;
    if (state.data) { if (key === "theories") renderMindmap(); refreshOverlays(); }
  });
});

// ---- chat queue ----
const chatQueue = [];
let chatBusy = false;

function addMsg(text, cls) {
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.textContent = text;
  $("chatLog").appendChild(div);
  $("chatLog").scrollTop = $("chatLog").scrollHeight;
  return div;
}

function updateQueueBadge() {
  const badge = $("queueBadge");
  const pending = chatQueue.length;
  badge.textContent = pending > 0 ? `${pending} queued` : "";
  badge.style.display = pending > 0 ? "inline" : "none";
}

async function processQueue() {
  if (chatBusy || chatQueue.length === 0) return;
  chatBusy = true;
  updateQueueBadge();
  const { country, q } = chatQueue.shift();
  updateQueueBadge();
  const thinking = addMsg("…thinking (local Mistral)", "ai");
  try {
    const answer = await askAI(country, q);
    thinking.textContent = answer;
    // Generate follow-up suggestions asynchronously
    generateFollowUps(country, answer, thinking);
  } catch (err) {
    thinking.className = "msg err";
    thinking.textContent = "Error: " + err.message;
  }
  chatBusy = false;
  processQueue();
}

function enqueue(q) {
  if (!q || !state.country) return;
  addMsg(q, "user");
  if (chatBusy) addMsg(`Queued (#${chatQueue.length + 1})`, "queued");
  chatQueue.push({ country: state.country, q });
  updateQueueBadge();
  processQueue();
}

// Auto-grow textarea
$("chatInput").addEventListener("input", () => {
  const el = $("chatInput");
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 180) + "px";
});

$("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("chatForm").requestSubmit();
  }
});

$("chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("chatInput").value.trim();
  $("chatInput").value = "";
  enqueue(q);
});

// ---- resizable panels (mouse + touch) ----
function makeDraggable(handle, onDrag) {
  let dragging = false, pendingX = 0, pendingY = 0, rafId = null;
  let lastTX = 0, lastTY = 0;

  function startDrag(e) {
    dragging = true; pendingX = 0; pendingY = 0;
    handle.classList.add("dragging");
    document.body.style.userSelect = "none";
    if (e.type === "mousedown") {
      document.body.style.cursor = handle.id === "hDivider" ? "col-resize" : "row-resize";
    }
    e.preventDefault();
  }

  function applyDrag(dx, dy) {
    pendingX += dx; pendingY += dy;
    if (!rafId) rafId = requestAnimationFrame(() => {
      onDrag(pendingX, pendingY);
      pendingX = 0; pendingY = 0; rafId = null;
    });
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  // Mouse
  handle.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", e => { if (dragging) applyDrag(e.movementX, e.movementY); });
  document.addEventListener("mouseup", endDrag);

  // Touch — mobile drag support
  handle.addEventListener("touchstart", e => {
    lastTX = e.touches[0].clientX;
    lastTY = e.touches[0].clientY;
    startDrag(e);
  }, { passive: false });
  document.addEventListener("touchmove", e => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - lastTX;
    const dy = e.touches[0].clientY - lastTY;
    lastTX = e.touches[0].clientX;
    lastTY = e.touches[0].clientY;
    applyDrag(dx, dy);
    e.preventDefault();
  }, { passive: false });
  document.addEventListener("touchend", endDrag);
}

// Cached sizes — read once on mousedown, update on drag (no reflow per frame)
let _mapW = 0, _mmH = 0, _chatH = 0;

["mousedown","touchstart"].forEach(ev => {
  $("hDivider").addEventListener(ev, () => { _mapW = $("mapPane").getBoundingClientRect().width; });
  $("vDivider").addEventListener(ev, () => {
    _mmH  = $("mindmap").getBoundingClientRect().height;
    _chatH = $("chat").getBoundingClientRect().height;
  });
});

// Horizontal: resize floating panel width
let _panelW = 380;
["mousedown","touchstart"].forEach(ev =>
  $("hDivider").addEventListener(ev, () => { _panelW = $("panel").getBoundingClientRect().width; })
);
makeDraggable($("hDivider"), (dx) => {
  const totalW = $("layout").getBoundingClientRect().width;
  _panelW = Math.max(280, Math.min(totalW - 200, _panelW - dx));
  $("panel").style.width = `${_panelW}px`;
  $("hDivider").style.right = `${_panelW}px`;
});

// Vertical: resize mindmap ↔ chat
makeDraggable($("vDivider"), (_, dy) => {
  _mmH  = Math.max(80, _mmH  + dy);
  _chatH = Math.max(80, _chatH - dy);
  $("mindmap").style.flex = `0 0 ${_mmH}px`;
  $("chat").style.flex    = `0 0 ${_chatH}px`;
});

// ── 1. Follow-up suggestions ──────────────────────────────────────────────
async function generateFollowUps(context, answer, msgEl) {
  try {
    const prompt = `Based on this answer: "${answer.slice(0, 200)}" — give exactly 2 follow-up questions a learner would ask next. Each max 7 words. Return only the 2 questions, one per line, no numbering.`;
    const raw = await askAI(context, prompt);
    const questions = raw.split("\n").map(s => s.trim()).filter(s => s.length > 4 && s.length < 80).slice(0, 2);
    if (!questions.length) return;
    const wrap = document.createElement("div");
    wrap.className = "msg-followups";
    questions.forEach(q => {
      const btn = document.createElement("button");
      btn.className = "followup-chip";
      btn.textContent = "→ " + q;
      btn.addEventListener("click", () => enqueue(q));
      wrap.appendChild(btn);
    });
    msgEl.after(wrap);
    $("chatLog").scrollTop = $("chatLog").scrollHeight;
  } catch(_) { /* follow-ups are optional, fail silently */ }
}

// ── 3. Search ─────────────────────────────────────────────────────────────
const SEARCH_INDEX = [];
function buildSearchIndex() {
  // Countries
  const countries = [
    "USA","Canada","Mexico",
    "United Kingdom","Germany","France","Russia","Italy","Spain",
    "Ukraine","Poland","Netherlands","Switzerland","Sweden","Norway","Belgium","Portugal",
    "Austria","Ireland","Denmark","Finland","Hungary","Czech Republic","Slovakia",
    "Greece","Romania","Bulgaria","Serbia","Croatia","Bosnia","Slovenia",
    "North Macedonia","Albania","Montenegro","Kosovo","Turkey",
    "Israel","Palestine","Saudi Arabia","Iran","Iraq","Jordan",
    "Lebanon","Syria","UAE","Qatar","Yemen","Oman","Kuwait","Bahrain",
    "Egypt","Libya","Tunisia","Algeria","Morocco","Sudan",
    "Somalia","Ethiopia","Kenya","Nigeria","Angola","South Africa",
  ];
  countries.forEach(c => SEARCH_INDEX.push({ label: c, type: "country", icon: "🌍", action: () => loadCountry(c) }));
  // Ancient cities
  ANCIENT_CITIES.forEach(c => SEARCH_INDEX.push({ label: c.name, type: "ancient city", icon: "🏛", action: () => { if (state.mode !== "religion") { document.querySelector('[data-mode="religion"]').click(); } setTimeout(() => onCityClick(c), 300); } }));
  // Agents
  AGENTS.forEach(a => SEARCH_INDEX.push({ label: a.name, type: "lens", icon: a.icon, action: () => toggleAgent(a) }));
}

$("searchInput").addEventListener("input", () => {
  const q = $("searchInput").value.trim().toLowerCase();
  const res = $("searchResults");
  if (!q) { res.classList.add("hidden"); return; }
  const hits = SEARCH_INDEX.filter(item => item.label.toLowerCase().includes(q)).slice(0, 7);
  if (!hits.length) { res.classList.add("hidden"); return; }
  res.innerHTML = hits.map((h, i) => `
    <div class="search-item" data-i="${i}">
      <span class="search-item-icon">${h.icon}</span>
      <span class="search-item-label">${h.label}</span>
      <span class="search-item-type">${h.type}</span>
    </div>`).join("");
  res.querySelectorAll(".search-item").forEach((el, i) => {
    el.addEventListener("click", () => {
      hits[i].action();
      $("searchInput").value = "";
      res.classList.add("hidden");
    });
  });
  res.classList.remove("hidden");
});

document.addEventListener("click", e => {
  if (!$("searchWrap").contains(e.target)) $("searchResults").classList.add("hidden");
});

// ── 5. Agent country glow ─────────────────────────────────────────────────
function applyAgentGlow(agent) {
  const names = agent ? new Set(Object.keys(agent.countries)) : new Set();
  GeoMap.highlightCountries(names);
}

// ── 6. Focus mode ─────────────────────────────────────────────────────────
let focusMode = false;
$("focusModeBtn").addEventListener("click", () => {
  focusMode = !focusMode;
  $("layout").classList.toggle("focus-mode", focusMode);
  $("focusModeBtn").textContent = focusMode ? "✕ Exit Focus" : "⛶ Focus";
});

// ── Mobile mindmap fullscreen ─────────────────────────────────────────────
$("mindmapExpandBtn").addEventListener("click", () => {
  const wrap = $("mindmapWrap");
  const expanded = wrap.classList.toggle("fullscreen");
  $("mindmapExpandBtn").textContent = expanded ? "✕ Close" : "⤢ Expand";
  const label = $("mindmapFullLabel");
  if (expanded && state.country) {
    label.innerHTML = `<span>🌍</span> ${state.country} — Mind Map`;
    label.classList.remove("hidden");
  } else {
    label.classList.add("hidden");
  }
  // re-fit cytoscape after resize
  setTimeout(() => {
    const cy = document.querySelector("#mindmap")._cy;
    if (cy) cy.fit(undefined, 24);
  }, 60);
});

// Also close fullscreen on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("mindmapWrap").classList.contains("fullscreen")) {
    $("mindmapExpandBtn").click();
  }
});

// ── Mobile bottom sheet ────────────────────────────────────────────────────
const isMobile = () => window.innerWidth <= 768;

// ── Mobile bottom sheet with snap points ──
// Snaps: closed → peek (55%) → mid (25%) → full (0%)
const SNAPS = ["mobile-open", "mobile-mid", "mobile-full"];
let currentSnap = null;

function setSnap(snap) {
  const panel = $("panel");
  panel.classList.remove(...SNAPS);
  if (snap) panel.classList.add(snap);
  currentSnap = snap;
}

function openMobilePanel() {
  if (!isMobile()) return;
  setSnap("mobile-open");
}
function closeMobilePanel() {
  const panel = $("panel");
  panel.style.transition = "transform .32s cubic-bezier(.4,0,.2,1)";
  setSnap(null);
}

$("mobilePanelClose").addEventListener("click", () => {
  if (isMobile()) { closeMobilePanel(); return; }
  $("panel").classList.add("collapsed");
});

// Drag handle — snap up/down
(function() {
  const handle = $("mobilePanelHandle");
  const panel  = $("panel");
  let startY = 0, startSnap = null, dragging = false, curTranslate = 0;

  function snapIndexOf(s) { return s ? SNAPS.indexOf(s) : -1; }
  function translateOf(s) {
    if (!s) return 100;
    if (s === "mobile-open") return 55;
    if (s === "mobile-mid")  return 25;
    return 0;
  }

  handle.addEventListener("touchstart", e => {
    startY    = e.touches[0].clientY;
    startSnap = currentSnap;
    dragging  = true;
    curTranslate = translateOf(startSnap);
    panel.style.transition = "none";
  }, { passive: true });

  handle.addEventListener("touchmove", e => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startY;
    const vh = window.innerHeight / 100;
    const newT = Math.max(0, Math.min(100, curTranslate + dy / (window.innerHeight * 0.01)));
    panel.style.transform = `translateY(${newT}%)`;
  }, { passive: true });

  handle.addEventListener("touchend", e => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = "transform .32s cubic-bezier(.4,0,.2,1)";
    panel.style.transform = "";

    const dy = e.changedTouches[0].clientY - startY;
    const idx = snapIndexOf(startSnap);

    if (dy < -50) {
      // swiped up → next snap up
      const next = Math.min(idx + 1, SNAPS.length - 1);
      setSnap(SNAPS[next]);
    } else if (dy > 60) {
      // swiped down → snap down or close
      if (idx <= 0) closeMobilePanel();
      else setSnap(SNAPS[idx - 1]);
    } else {
      setSnap(startSnap); // bounce back
    }
  }, { passive: true });
})();

// ---- share card ----
$("shareBtn").addEventListener("click", () => shareCountryCard());

async function shareCountryCard() {
  if (!state.data) return;
  const country = state.data.country || state.country;
  const flag = countryFlag(country);
  const geo = state.data.geopolitics || {};
  const fin = state.data.finance || {};
  const articles = await fetchNews(country);
  const headline = articles[0]?.title || "No recent news";

  const W = 600, H = 340;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);

  // roundRect polyfill for older iOS/Android
  function rr(x, y, w, h, r) {
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); }
    else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0d1520"); bg.addColorStop(1, "#0a1830");
  ctx.fillStyle = bg; rr(0, 0, W, H, 20); ctx.fill();

  // accent bar top
  ctx.fillStyle = "#0a84ff"; ctx.fillRect(0, 0, W, 3);

  // GeoGlobe branding
  ctx.fillStyle = "#0a84ff"; ctx.font = "bold 13px -apple-system,sans-serif";
  ctx.fillText("🌍 GEOGLOBE", 24, 28);
  ctx.fillStyle = "rgba(235,235,245,0.4)"; ctx.font = "11px -apple-system,sans-serif";
  ctx.fillText("Geopolitical Intelligence", 24, 44);

  // Country name + flag
  ctx.font = "bold 38px -apple-system,sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${flag}  ${country}`, 24, 96);

  // Stats row
  const stats = [
    { label: "ALLIES", val: (geo.allies||[]).length ? `${(geo.allies||[]).length} nations` : "—" },
    { label: "DEBT",   val: fin.national_debt_usd_trillions ? `$${fin.national_debt_usd_trillions}T` : "—" },
    { label: "MIL BASES", val: geo.military_bases_abroad ?? "—" },
    { label: "CURRENCY", val: (fin.currency_role||"—").split(/[;,]/)[0].slice(0,12) },
  ];
  stats.forEach((s, i) => {
    const x = 24 + i * 144, y = 128;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    rr(x, y, 132, 54, 10); ctx.fill();
    ctx.fillStyle = "rgba(10,132,255,0.9)"; ctx.font = "bold 9px -apple-system,sans-serif";
    ctx.fillText(s.label, x + 10, y + 17);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 15px -apple-system,sans-serif";
    ctx.fillText(String(s.val).slice(0,14), x + 10, y + 38);
  });

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(24, 198); ctx.lineTo(W - 24, 198); ctx.stroke();

  // News headline
  ctx.fillStyle = "#0a84ff"; ctx.font = "bold 10px -apple-system,sans-serif";
  ctx.fillText("📰 LATEST NEWS", 24, 218);
  ctx.fillStyle = "rgba(245,245,247,0.85)"; ctx.font = "13px -apple-system,sans-serif";
  const words = headline.split(" ");
  let line = "", y2 = 236;
  words.forEach(w => {
    const test = line + w + " ";
    if (ctx.measureText(test).width > W - 48 && line) {
      ctx.fillText(line, 24, y2); line = w + " "; y2 += 18;
    } else line = test;
  });
  ctx.fillText(line, 24, y2);

  // Footer
  ctx.fillStyle = "rgba(235,235,245,0.3)"; ctx.font = "11px -apple-system,sans-serif";
  ctx.fillText("geoglobe.onrender.com", 24, H - 14);
  ctx.textAlign = "right";
  ctx.fillText(new Date().toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }), W - 24, H - 14);
  ctx.textAlign = "left";

  canvas.toBlob(async (blob) => {
    const file = new File([blob], `geoglobe-${country}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `${country} — GeoGlobe`, text: `Geopolitical snapshot of ${country}`, files: [file] });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `geoglobe-${country}.png`; a.click();
      URL.revokeObjectURL(url);
    }
  }, "image/png");
}

// ---- subscribe ----
$("subscribeBtnTop").addEventListener("click", () => $("subscribeOverlay").classList.remove("hidden"));
$("subscribeClose").addEventListener("click", () => $("subscribeOverlay").classList.add("hidden"));
$("subscribeOverlay").addEventListener("click", (e) => { if (e.target === $("subscribeOverlay")) $("subscribeOverlay").classList.add("hidden"); });

$("subscribeSubmit").addEventListener("click", async () => {
  const email = $("subscribeEmail").value.trim();
  const msg = $("subscribeMsg");
  if (!email || !email.includes("@")) {
    msg.textContent = "Please enter a valid email.";
    msg.className = "error"; msg.classList.remove("hidden"); return;
  }
  $("subscribeSubmit").textContent = "Subscribing…";
  $("subscribeSubmit").disabled = true;
  try {
    const r = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const d = await r.json();
    msg.textContent = d.already ? "You're already subscribed! 🎉" : "You're in! Check your inbox Monday morning. 🌍";
    msg.className = "success"; msg.classList.remove("hidden");
    setTimeout(() => $("subscribeOverlay").classList.add("hidden"), 2800);
  } catch {
    msg.textContent = "Something went wrong. Try again.";
    msg.className = "error"; msg.classList.remove("hidden");
  }
  $("subscribeSubmit").textContent = "Get Weekly Briefing";
  $("subscribeSubmit").disabled = false;
});

// ---- conflict drawer ----
const conflictDrawer = $("conflictDrawer");
$("conflictDrawerClose").addEventListener("click", () => {
  conflictDrawer.classList.remove("open");
  setTimeout(() => conflictDrawer.classList.add("hidden"), 350);
});

function openConflictDrawer(conflict) {
  const intensityLabel = { critical: "🔴 ACTIVE WAR", high: "🟠 HIGH TENSION", medium: "🟡 ONGOING CONFLICT", low: "🟡 FROZEN CONFLICT" };
  $("conflictDrawerFlag").textContent = conflict.flag || "⚔️";
  const typeEl = $("conflictDrawerType");
  typeEl.textContent = conflict.type;
  typeEl.className = `cd-intensity ${conflict.intensity}`;

  const body = $("conflictDrawerBody");
  body.innerHTML = `
    <div>
      <div class="cd-since">${intensityLabel[conflict.intensity] || ""} · Since ${conflict.since}</div>
      <div class="cd-title">${conflict.title}</div>
    </div>
    <div class="cd-summary">${conflict.summary}</div>
    <div class="cd-row"><div class="cd-row-label">Factions</div><div class="cd-row-val">${conflict.factions}</div></div>
    <div class="cd-row"><div class="cd-row-label">What's at stake</div><div class="cd-row-val">${conflict.stakes}</div></div>
    <div class="cd-row"><div class="cd-row-label">Casualties</div><div class="cd-row-val">${conflict.casualties}</div></div>
    <div class="cd-row"><div class="cd-row-label">Latest</div><div class="cd-row-val">${conflict.latest}</div></div>
    <button class="cd-ask-btn" id="conflictAskBtn">🤖 Ask AI — What happens next?</button>`;

  conflictDrawer.classList.remove("hidden");
  requestAnimationFrame(() => conflictDrawer.classList.add("open"));

  $("conflictAskBtn").onclick = async () => {
    $("conflictAskBtn").textContent = "Analyzing…";
    $("conflictAskBtn").disabled = true;
    const q = `Conflict: ${conflict.title}\nFactions: ${conflict.factions}\nStakes: ${conflict.stakes}\nLatest: ${conflict.latest}\n\nIn 3 sharp paragraphs: (1) What is really happening right now, (2) Who is winning and why, (3) What are the 2-3 most likely outcomes in the next 12 months?`;
    const r = await fetch("/api/ask", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: conflict.countries[0] || "world", question: q }),
    });
    const d = await r.json();
    const ans = document.createElement("div");
    ans.className = "cd-ai-answer";
    ans.textContent = d.answer || d.error || "No response.";
    body.appendChild(ans);
    $("conflictAskBtn").textContent = "🤖 Ask AI — What happens next?";
    $("conflictAskBtn").disabled = false;
  };
}

// ---- news ----
const newsCache = {};
const newsTooltip = $("newsTooltip");
const newsDrawer  = $("newsDrawer");
let newsTooltipTimer = null;

async function fetchNews(country) {
  if (newsCache[country]) return newsCache[country];
  try {
    const r = await fetch(`/api/news/${encodeURIComponent(country)}`);
    const d = await r.json();
    newsCache[country] = (d.articles || []);
    // expire cache after 10 min
    setTimeout(() => { delete newsCache[country]; }, 10 * 60 * 1000);
  } catch { newsCache[country] = []; }
  return newsCache[country];
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

function showNewsTooltip() { /* preview disabled — click opens left drawer */ }

function hideNewsTooltip() {
  clearTimeout(newsTooltipTimer);
  newsTooltip.classList.add("hidden");
}

async function openNewsDrawer(country) {
  hideNewsTooltip();
  const articles = await fetchNews(country);
  $("newsDrawerTitle").textContent = country + " — Latest News";
  $("newsDrawerFlag").textContent = countryFlag(country);
  const body = $("newsDrawerBody");
  if (!articles.length) {
    body.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:20px;text-align:center">No recent news found.</div>`;
  } else {
    body.innerHTML = articles.map(a => `
      <a class="news-card" href="${a.url}" target="_blank" rel="noopener">
        <div class="news-card-source">${a.source?.name || "News"}</div>
        <div class="news-card-title">${a.title}</div>
        ${a.description ? `<div class="news-card-desc">${a.description.slice(0,120)}…</div>` : ""}
        <div class="news-card-time">${timeAgo(a.publishedAt)}</div>
      </a>`).join("");
  }
  newsDrawer.classList.remove("hidden");
  requestAnimationFrame(() => newsDrawer.classList.add("open"));

  $("newsSummarizeBtn").onclick = async () => {
    // remove any previous summary
    document.querySelectorAll(".news-summary-card").forEach(el => el.remove());
    $("newsSummarizeBtn").textContent = "Analyzing…";
    $("newsSummarizeBtn").disabled = true;
    const headlines = articles.slice(0,6).map((a,i) => `${i+1}. ${a.title}`).join("\n");
    const prompt =
`You are a geopolitical analyst briefing a reader on ${country}. Based ONLY on these current headlines:
${headlines}

Write a clean briefing in this EXACT format (use these literal markers):
TITLE: <a short punchy headline, max 8 words>
SUMMARY: <2 sentence overview of what's happening>
KEY: <point 1>
KEY: <point 2>
KEY: <point 3>
WHY: <one sentence on why this matters geopolitically>

Be sharp and factual. No preamble.`;
    const r = await fetch("/api/ask", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, question: prompt }),
    });
    const d = await r.json();
    renderNewsSummary(d.answer || d.error || "No response.", country);
    $("newsSummarizeBtn").textContent = "🤖 AI Summarize";
    $("newsSummarizeBtn").disabled = false;
  };
}

function renderNewsSummary(text, country) {
  // parse the structured markers
  const get = (key) => {
    const m = text.match(new RegExp(`${key}:\\s*(.+)`, "i"));
    return m ? m[1].trim() : "";
  };
  const keys = [...text.matchAll(/KEY:\s*(.+)/gi)].map(m => m[1].trim());
  const title = get("TITLE") || `${country} Briefing`;
  const summary = get("SUMMARY");
  const why = get("WHY");

  // fallback if model didn't follow format
  const hasStructure = summary || keys.length;

  const card = document.createElement("div");
  card.className = "news-summary-card";
  card.innerHTML = hasStructure ? `
    <div class="ns-head">
      <div class="ns-eyebrow">${countryFlag(country)} AI BRIEFING</div>
      <div class="ns-head-btns">
        <button class="ns-toggle" title="Expand">⤢</button>
        <button class="ns-close" title="Close">×</button>
      </div>
    </div>
    <div class="ns-title">${title}</div>
    ${summary ? `<div class="ns-summary">${summary}</div>` : ""}
    ${keys.length ? `<div class="ns-keys">${keys.map(k => `<div class="ns-key"><span>›</span>${k}</div>`).join("")}</div>` : ""}
    ${why ? `<div class="ns-why"><strong>Why it matters</strong>${why}</div>` : ""}
  ` : `
    <div class="ns-head">
      <div class="ns-eyebrow">${countryFlag(country)} AI BRIEFING</div>
      <div class="ns-head-btns">
        <button class="ns-toggle" title="Expand">⤢</button>
        <button class="ns-close" title="Close">×</button>
      </div>
    </div>
    <div class="ns-summary">${text}</div>`;

  $("newsDrawerFooter").insertBefore(card, $("newsSummarizeBtn"));

  card.querySelector(".ns-toggle").addEventListener("click", () => {
    const expanded = card.classList.toggle("expanded");
    card.querySelector(".ns-toggle").textContent = expanded ? "⤡" : "⤢";
    card.querySelector(".ns-toggle").title = expanded ? "Collapse" : "Expand";
  });
  card.querySelector(".ns-close").addEventListener("click", () => card.remove());
}

function countryFlag(name) {
  const flags = {
    "USA":"🇺🇸","United Kingdom":"🇬🇧","Germany":"🇩🇪","France":"🇫🇷","Russia":"🇷🇺",
    "Italy":"🇮🇹","Spain":"🇪🇸","Ukraine":"🇺🇦","Poland":"🇵🇱","Sweden":"🇸🇪",
    "Norway":"🇳🇴","Turkey":"🇹🇷","Israel":"🇮🇱","Saudi Arabia":"🇸🇦","Iran":"🇮🇷",
    "Iraq":"🇮🇶","Egypt":"🇪🇬","Syria":"🇸🇾","Jordan":"🇯🇴","Lebanon":"🇱🇧",
    "UAE":"🇦🇪","Qatar":"🇶🇦","Yemen":"🇾🇪","Libya":"🇱🇾","Tunisia":"🇹🇳",
    "Algeria":"🇩🇿","Morocco":"🇲🇦","Nigeria":"🇳🇬","South Africa":"🇿🇦",
    "Ethiopia":"🇪🇹","Kenya":"🇰🇪","Greece":"🇬🇷","Romania":"🇷🇴","Serbia":"🇷🇸",
    "Croatia":"🇭🇷","Bulgaria":"🇧🇬","Hungary":"🇭🇺","Canada":"🇨🇦","Mexico":"🇲🇽",
  };
  return flags[name] || "🌍";
}

$("newsDrawerClose").addEventListener("click", () => {
  newsDrawer.classList.remove("open");
  setTimeout(() => newsDrawer.classList.add("hidden"), 350);
});

// ---- news drawer width resize ----
let newsDrawerWidth = 340;
makeDraggable($("newsDrawerResize"), (dx) => {
  newsDrawerWidth = Math.max(280, Math.min(window.innerWidth * 0.7, newsDrawerWidth + dx));
  newsDrawer.style.width = newsDrawerWidth + "px";
});

let newsDotsVisible = true;
$("newsToggleBtn").addEventListener("click", () => {
  newsDotsVisible = !newsDotsVisible;
  GeoMap.showNewsDots(newsDotsVisible);
  $("newsToggleBtn").classList.toggle("off", !newsDotsVisible);
  $("newsToggleBtn").textContent = newsDotsVisible ? "📰 News" : "📰 News off";
});

// ── iOS-style touch press feedback ──────────────────────────────────────────
(function addTouchFeedback() {
  const SELECTOR = "button, .chip, .followup-chip, .agent-btn, .news-card, .stat-card, .search-item, .news-strip-item, .agent-country-item";
  function onStart(e) {
    const el = e.target.closest(SELECTOR);
    if (el) { el.dataset.pressing = "1"; el.style.transition = "transform 0.08s ease, opacity 0.08s ease"; el.style.transform = "scale(0.96)"; el.style.opacity = "0.85"; }
  }
  function onEnd(e) {
    const el = e.target.closest(SELECTOR) || document.querySelector("[data-pressing='1']");
    document.querySelectorAll("[data-pressing='1']").forEach(el => {
      el.style.transform = ""; el.style.opacity = ""; el.style.transition = "";
      delete el.dataset.pressing;
    });
  }
  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchend", onEnd, { passive: true });
  document.addEventListener("touchcancel", onEnd, { passive: true });
})();

// ---- boot ----
buildAgentBar();
buildSearchIndex();
GeoMap.init($("map"), loadCountry).then(() => {
  const allCountries = Object.values({
    840:"USA",124:"Canada",484:"Mexico",826:"United Kingdom",276:"Germany",
    250:"France",643:"Russia",380:"Italy",724:"Spain",804:"Ukraine",616:"Poland",
    752:"Sweden",578:"Norway",792:"Turkey",300:"Greece",642:"Romania",
    100:"Bulgaria",688:"Serbia",191:"Croatia",70:"Bosnia",8:"Albania",
    499:"Montenegro",383:"Kosovo",807:"North Macedonia",705:"Slovenia",
    376:"Israel",682:"Saudi Arabia",364:"Iran",368:"Iraq",818:"Egypt",
    760:"Syria",434:"Libya",788:"Tunisia",12:"Algeria",504:"Morocco",
    729:"Sudan",566:"Nigeria",710:"South Africa",
  });
  GeoMap.setNewsDots(allCountries, showNewsTooltip, hideNewsTooltip, openNewsDrawer);
  GeoMap.setConflictDots(CURRENT_CONFLICTS, openConflictDrawer);
  updateTimelineMap(state.year);
}).catch((e) =>
  ($("panelEmpty").textContent = "Map failed to load: " + e.message)
);

// ---- swipe-to-dismiss for left drawers (mobile) ----
// Swipe left on any slide-in drawer to close it, like iOS sheets.
function makeSwipeDismiss(el, closeBtn) {
  let startX = 0, startY = 0, dx = 0, active = false;
  el.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dx = 0; active = true;
    el.style.transition = "none";
  }, { passive: true });
  el.addEventListener("touchmove", (e) => {
    if (!active) return;
    dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll, ignore
    if (dx < 0) el.style.transform = `translateX(${dx}px)`;
  }, { passive: true });
  el.addEventListener("touchend", () => {
    if (!active) return;
    active = false;
    el.style.transition = "";
    el.style.transform = "";
    if (dx < -70) $(closeBtn).click();
  }, { passive: true });
}
makeSwipeDismiss($("conflictDrawer"), "conflictDrawerClose");
makeSwipeDismiss($("newsDrawer"), "newsDrawerClose");
makeSwipeDismiss($("agentDrawer"), "agentDrawerClose");
