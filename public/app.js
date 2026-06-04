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
    if (state.country) renderPanel();
  });
});

function onCityClick(city) {
  // Show the city in the panel
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
  const res = await fetch(`data/${name.toLowerCase()}.json`);
  state.data = await res.json();

  GeoMap.setActive(name);
  $("panelEmpty").classList.add("hidden");
  $("panelContent").classList.remove("hidden");
  $("countryName").textContent = state.data.country;
  $("countrySummary").textContent = state.data.summary || "";
  $("chatInput").placeholder = `Ask anything about ${state.data.country}…`;

  restoreChatHistory(name);
  renderPanel();
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
$("timeline").addEventListener("input", (e) => {
  state.year = +e.target.value;
  $("yearLabel").textContent = state.year;
  if (state.data) { renderMindmap(); refreshOverlays(); }
});

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

// ---- resizable panels ----
function makeDraggable(handle, onDrag) {
  let dragging = false, pendingX = 0, pendingY = 0, rafId = null;
  handle.addEventListener("mousedown", (e) => {
    dragging = true;
    pendingX = 0; pendingY = 0;
    handle.classList.add("dragging");
    document.body.style.cursor = handle.id === "hDivider" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    pendingX += e.movementX;
    pendingY += e.movementY;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        onDrag(pendingX, pendingY);
        pendingX = 0; pendingY = 0;
        rafId = null;
      });
    }
  });
  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });
}

// Cached sizes — read once on mousedown, update on drag (no reflow per frame)
let _mapW = 0, _mmH = 0, _chatH = 0;

$("hDivider").addEventListener("mousedown", () => {
  _mapW = $("mapPane").getBoundingClientRect().width;
});
$("vDivider").addEventListener("mousedown", () => {
  _mmH  = $("mindmap").getBoundingClientRect().height;
  _chatH = $("chat").getBoundingClientRect().height;
});

// Horizontal: resize map ↔ panel
makeDraggable($("hDivider"), (dx) => {
  const totalW = $("layout").getBoundingClientRect().width;
  _mapW = Math.max(200, Math.min(totalW - 240, _mapW + dx));
  $("mapPane").style.flex = `0 0 ${_mapW}px`;
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
  const countries = ["USA","Canada","Mexico","UK","Germany","France","Russia","Italy","Spain",
    "Ukraine","Poland","Netherlands","Switzerland","Sweden","Turkey","Norway","Belgium","Portugal",
    "Austria","Greece","Romania","Israel","Palestine","Saudi Arabia","Iran","Iraq","Jordan",
    "Lebanon","Syria","Egypt","UAE","Qatar","Yemen"];
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

// ── Mobile bottom sheet ────────────────────────────────────────────────────
const isMobile = () => window.innerWidth <= 768;

function openMobilePanel() {
  if (!isMobile()) return;
  $("panel").classList.add("mobile-open");
}
function closeMobilePanel() {
  $("panel").classList.remove("mobile-open");
}

// Close button
$("mobilePanelClose").addEventListener("click", closeMobilePanel);

// Tap the pill handle to toggle
$("mobilePanelHandle").addEventListener("click", () => {
  if ($("panel").classList.contains("mobile-open")) closeMobilePanel();
});

// Swipe down to close
(function() {
  let startY = 0;
  const panel = $("panel");
  panel.addEventListener("touchstart", e => { startY = e.touches[0].clientY; }, { passive: true });
  panel.addEventListener("touchend", e => {
    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 60) closeMobilePanel();
  }, { passive: true });
})();

// ---- boot ----
buildAgentBar();
buildSearchIndex();
GeoMap.init($("map"), loadCountry).catch((e) =>
  ($("panelEmpty").textContent = "Map failed to load: " + e.message)
);
