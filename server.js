import express from "express";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import cron from "node-cron";
import { Resend } from "resend";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Cloud AI: Groq (free, fast, Mistral-compatible)
// Set GROQ_API_KEY env var on Render. Falls back to Ollama for local dev.
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const USE_GROQ = !!GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = USE_GROQ ? "llama-3.3-70b-versatile" : "mistral";

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

const SYSTEM_PROMPT =
  "You are a geopolitical expert. Answer concisely. Mention disputed theories " +
  "only when relevant and clearly label them DISPUTED, CONFIRMED, or PARTIALLY " +
  "CONFIRMED. Use the provided country context. Never present a theory as fact.";

app.post("/api/ask", async (req, res) => {
  const { country, question } = req.body || {};
  if (!country || !question) {
    return res.status(400).json({ error: "country and question required" });
  }
  let context = "";
  try {
    const file = join(__dirname, "public", "data", `${country.toLowerCase().replace(/\s+/g,"_")}.json`);
    context = await readFile(file, "utf8");
  } catch {
    context = "(no local data found for this country)";
  }

  const userMsg =
    `Country: ${country}\n\nContext JSON:\n${context}\n\nQuestion: ${question}`;

  try {
    let answer;
    if (USE_GROQ) {
      const r = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMsg },
          ],
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        return res.status(502).json({ error: `Groq error: ${t}` });
      }
      const data = await r.json();
      answer = data.choices?.[0]?.message?.content ?? "(no response)";
    } else {
      const r = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          stream: false,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMsg },
          ],
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        return res.status(502).json({ error: `Ollama error: ${t}` });
      }
      const data = await r.json();
      answer = data.message?.content ?? "(no response)";
    }
    res.json({ answer });
  } catch (e) {
    const src = USE_GROQ ? "Groq" : `Ollama at ${OLLAMA_URL}`;
    res.status(502).json({ error: `Cannot reach ${src}. (${e.message})` });
  }
});

const NEWS_API_KEY   = process.env.NEWS_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const EMAILS_FILE = join(__dirname, "emails.json");

async function loadEmails() {
  try { return JSON.parse(await readFile(EMAILS_FILE, "utf8")); }
  catch { return []; }
}
async function saveEmails(list) {
  await writeFile(EMAILS_FILE, JSON.stringify(list, null, 2));
}

// Subscribe endpoint
app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body || {};
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Invalid email" });
  const list = await loadEmails();
  if (list.includes(email)) return res.json({ ok: true, already: true });
  list.push(email);
  await saveEmails(list);
  if (resend) {
    await resend.emails.send({
      from: "GeoGlobe <briefing@geoglobe.app>",
      to: email,
      subject: "Welcome to GeoGlobe Weekly Briefing",
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0d1520;color:#f5f5f7;padding:32px;border-radius:16px">
        <h1 style="color:#0a84ff;margin:0 0 8px">🌍 GeoGlobe</h1>
        <p style="color:#888;margin:0 0 24px;font-size:13px">Weekly Geopolitical Intelligence</p>
        <h2 style="margin:0 0 12px">You're in.</h2>
        <p style="line-height:1.7;color:#ccc">Every week you'll get a sharp AI-powered briefing on the most important geopolitical shifts — wars, alliances, money flows, and what it all means.</p>
        <p style="margin-top:24px;color:#888;font-size:12px">geoglobe.onrender.com</p>
      </div>`,
    }).catch(() => {});
  }
  res.json({ ok: true });
});

// Generate and send weekly briefing
async function sendWeeklyBriefing() {
  if (!resend) return;
  const topics = [
    "Russia-Ukraine War", "Israel-Gaza conflict", "Iran-Israel tensions",
    "Sudan civil war", "Global energy markets", "NATO expansion",
    "China-Taiwan tensions", "Yemen Houthi attacks",
  ];
  const question = `Write a sharp weekly geopolitical briefing covering these topics: ${topics.join(", ")}. For each, give: current status, what changed this week, why it matters. Use headers. Be concise and factual.`;
  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: MODEL, messages: [
        { role: "system", content: "You are a geopolitical intelligence analyst." },
        { role: "user", content: question },
      ]}),
    });
    const d = await r.json();
    const briefing = d.choices?.[0]?.message?.content || "No briefing generated.";
    const list = await loadEmails();
    for (const email of list) {
      await resend.emails.send({
        from: "GeoGlobe <briefing@geoglobe.app>",
        to: email,
        subject: `🌍 GeoGlobe Weekly — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0d1520;color:#f5f5f7;padding:32px;border-radius:16px">
          <h1 style="color:#0a84ff;margin:0 0 4px">🌍 GeoGlobe Weekly</h1>
          <p style="color:#666;margin:0 0 28px;font-size:12px">${new Date().toDateString()} · AI-Powered Intelligence</p>
          <div style="line-height:1.75;color:#ddd;white-space:pre-wrap">${briefing.replace(/\n/g,"<br>")}</div>
          <div style="margin-top:32px;padding-top:20px;border-top:1px solid #222;font-size:11px;color:#555">
            <a href="https://geoglobe.onrender.com" style="color:#0a84ff">geoglobe.onrender.com</a> ·
            Reply to unsubscribe
          </div>
        </div>`,
      }).catch(() => {});
    }
    console.log(`Weekly briefing sent to ${list.length} subscribers`);
  } catch (e) { console.error("Briefing failed:", e.message); }
}

// Every Monday 8am
cron.schedule("0 8 * * 1", sendWeeklyBriefing);

// Manual trigger (for testing)
app.post("/api/briefing/send", async (req, res) => {
  await sendWeeklyBriefing();
  res.json({ ok: true });
});

const NEWS_CODES = {
  "USA":"us","United Kingdom":"gb","Germany":"de","France":"fr","Russia":"ru",
  "Italy":"it","Spain":"es","Ukraine":"ua","Poland":"pl","Netherlands":"nl",
  "Sweden":"se","Norway":"no","Belgium":"be","Portugal":"pt","Austria":"at",
  "Greece":"gr","Romania":"ro","Bulgaria":"bg","Serbia":"rs","Hungary":"hu",
  "Czech Republic":"cz","Slovakia":"sk","Ireland":"ie","Denmark":"dk",
  "Finland":"fi","Turkey":"tr","Israel":"il","Saudi Arabia":"sa","Iran":"ir",
  "Iraq":"iq","Egypt":"eg","Morocco":"ma","Nigeria":"ng","South Africa":"za",
  "Australia":"au","Canada":"ca","Mexico":"mx","China":"cn","India":"in",
};

// Search terms per country: nationality/adjective forms catch more relevant news
const NEWS_TERMS = {
  "USA": "United States", "United Kingdom": "Britain", "Saudi Arabia": "Saudi",
  "South Africa": "South Africa", "North Macedonia": "Macedonia",
  "Czech Republic": "Czech", "UAE": "Emirates", "Bosnia": "Bosnia",
};

// Sports/entertainment noise to filter out
const NOISE = /\b(world cup|la liga|premier league|grand slam|tennis|boxing|nba|nfl|goal|striker|midfielder|transfer|trailer|gaming|xbox|playstation|movie|recap|album|concert|friendly|soccer|football|footballer|usmnt|bayern|pochettino|eriksen|collapse|match|striker|midfield|coach|squad|lineup|fixture|kickoff|cricket|rugby|golf|f1|formula 1|olympic|medal)\b/i;

app.get("/api/news/:country", async (req, res) => {
  if (!NEWS_API_KEY) return res.json({ articles: [] });
  const country = req.params.country;
  const term = NEWS_TERMS[country] || country;
  try {
    const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    // qInTitle: country must be in the headline = far more relevant
    const url = `https://newsapi.org/v2/everything?qInTitle=${encodeURIComponent(term)}&sortBy=publishedAt&language=en&pageSize=20&from=${from}&apiKey=${NEWS_API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    const raw = (data.articles || [])
      .filter(a => a.title && a.title !== "[Removed]")
      .filter((a, i, arr) => arr.findIndex(x => x.title === a.title) === i); // dedupe
    let articles = raw.filter(a => !NOISE.test(a.title));   // drop sports/games

    // Fallback: if too few, broaden to body search
    if (articles.length < 3) {
      const url2 = `https://newsapi.org/v2/everything?q=${encodeURIComponent('"' + term + '"')}&sortBy=publishedAt&language=en&pageSize=20&from=${from}&apiKey=${NEWS_API_KEY}`;
      const r2 = await fetch(url2);
      const d2 = await r2.json();
      const extra = (d2.articles || []).filter(a => a.title && a.title !== "[Removed]" && !NOISE.test(a.title));
      const seen = new Set(articles.map(a => a.title));
      extra.forEach(a => { if (!seen.has(a.title)) { articles.push(a); seen.add(a.title); } });
    }

    // Last resort: if still empty, return raw (better than blank)
    if (!articles.length) articles = raw;

    res.json({ articles: articles.slice(0, 6) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ── Daily briefing: categorized last-24h news + YouTube coverage ───────────
// Each category's query explicitly names conflicts/regions/economies across
// the Americas, Europe, Middle East, Africa and Asia-Pacific — a generic
// query tends to get swamped by whichever single story is biggest that day
// (e.g. one Middle East war crowding out everything else), so the region
// names are baked into the query itself to keep results geographically wide.
const BRIEFING_CATEGORIES = [
  { id: "war",     label: "War & Conflict",   icon: "⚔️",
    newsQuery: '"war" OR "conflict" OR "military strike" OR "offensive" OR "ceasefire" OR "insurgency" OR "civil war" OR Ukraine OR Russia OR Gaza OR Israel OR Sudan OR Yemen OR Syria OR Myanmar OR Taiwan OR Congo OR Ethiopia OR Kashmir OR Somalia OR Haiti',
    ytQuery: "war conflict news today world" },
  { id: "geo",     label: "Geopolitics",      icon: "🌍",
    newsQuery: '"sanctions" OR "diplomacy" OR "summit" OR "alliance" OR "election" OR "coup" OR "protests" OR "United Nations" OR NATO OR "European Union" OR "African Union" OR "South China Sea" OR ASEAN',
    ytQuery: "geopolitics news today world analysis" },
  { id: "finance", label: "Finance & Markets", icon: "💰",
    newsQuery: '"inflation" OR "central bank" OR "stock market" OR "interest rates" OR currency OR "trade deal" OR "emerging markets" OR "Federal Reserve" OR "European Central Bank" OR "China economy" OR "Wall Street" OR yuan OR yen OR rupee OR peso',
    ytQuery: "global markets economy news today" },
  { id: "tech",    label: "Technology",       icon: "💻",
    newsQuery: '"artificial intelligence" OR chips OR "tech regulation" OR cybersecurity OR "big tech" OR "startup funding" OR "China tech" OR "EU tech" OR semiconductor OR "data center"',
    ytQuery: "global tech news today AI" },
  { id: "cyber",   label: "Cyber & Espionage", icon: "🕵️",
    newsQuery: '"hack" OR "data breach" OR "cyberattack" OR "spy" OR espionage OR leaked OR ransomware OR "intelligence agency" OR surveillance OR "state-sponsored"',
    ytQuery: "cyber attack espionage news today" },
];

async function fetchCategoryNews(query) {
  if (!NEWS_API_KEY) return [];
  // NewsAPI's free plan delays articles by ~24h, so a strict last-24h
  // window returns nothing — widen it to still surface the freshest
  // news the plan actually has access to.
  const from = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=80&from=${from}&apiKey=${NEWS_API_KEY}`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    return (d.articles || [])
      .filter(a => a.title && a.title !== "[Removed]" && !NOISE.test(a.title))
      .filter((a, i, arr) => arr.findIndex(x => x.title === a.title) === i)
      .slice(0, 30);
  } catch { return []; }
}

// Best-effort scrape of YouTube search results — no API key required.
// YouTube's markup can change or block scripted requests at any time, so
// this must never break the briefing: any failure just yields no videos,
// and the AI summary falls back to news headlines alone.
async function fetchYouTubeSnippets(query) {
  try {
    const r = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9" },
    });
    const html = await r.text();
    const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
    if (!m) return [];
    const data = JSON.parse(m[1]);
    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents || [];
    const videos = [];
    outer:
    for (const sec of sections) {
      for (const item of sec?.itemSectionRenderer?.contents || []) {
        const v = item.videoRenderer;
        if (!v) continue;
        const title = (v.title?.runs || []).map(r => r.text).join("");
        const channel = v.ownerText?.runs?.[0]?.text || "";
        const snippet = (v.detailedMetadataSnippets?.[0]?.snippetText?.runs || []).map(r => r.text).join("");
        if (title) videos.push({ title, channel, snippet });
        if (videos.length >= 8) break outer;
      }
    }
    return videos;
  } catch { return []; }
}

async function summarizeCategory(cat, articles, videos) {
  const headlineList = articles.map((a, i) => `${i + 1}. ${a.title}`).join("\n") || "(no fresh headlines)";
  const videoList = videos.map((v, i) => `${i + 1}. "${v.title}" (${v.channel})${v.snippet ? " — " + v.snippet : ""}`).join("\n") || "(no video coverage found)";

  const prompt =
`You are a geopolitical intelligence analyst producing a "last 24 hours" briefing for the category: ${cat.label}.

News headlines from the last 24 hours:
${headlineList}

YouTube video coverage from the last 24 hours (titles/snippets only):
${videoList}

Cover 6 to 9 DIFFERENT situations happening right now around the world in this category — this must read like a real world tour, not a deep dive on one story. Actively scan the headlines for distinct countries/regions and make sure you include separate situations from AT LEAST 4 of these regions if the material supports it: Americas, Europe, Middle East, Africa, Asia-Pacific. Do not let one dominant story (e.g. a single US-Iran conflict, or one Wall Street story) crowd out the others — if the headlines contain multiple wars/economies/disputes, each gets its own entry. Only include a situation if it's actually supported by the headlines or videos above — never invent one. If, after genuinely checking, a region truly has nothing in the material, skip it rather than inventing filler.

For EACH situation, output this EXACT block, one after another with no extra text between them:
SITUATION: <region/country + short topic, max 6 words>
SUMMARY: <2-3 sentence summary of what's happening right now, with enough specifics (who, what, numbers) that someone reading only this understands the situation>
WHY: <one sentence on why it matters>

Order them so a reader gets the full spread of what's happening globally, most significant first. Be sharp and factual. No preamble, no numbering, no markdown, no commentary outside the blocks.`;

  if (!USE_GROQ) return "";
  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: MODEL, messages: [
        { role: "system", content: "You are a sharp, factual geopolitical/financial/tech intelligence analyst with a global, not US-centric, view." },
        { role: "user", content: prompt },
      ]}),
    });
    const d = await r.json();
    return d.choices?.[0]?.message?.content || "";
  } catch { return ""; }
}

async function buildCategoryBriefing(cat) {
  const [articles, videos] = await Promise.all([
    fetchCategoryNews(cat.newsQuery),
    fetchYouTubeSnippets(cat.ytQuery),
  ]);
  const summaryText = await summarizeCategory(cat, articles, videos);
  return {
    id: cat.id, label: cat.label, icon: cat.icon,
    articleCount: articles.length,
    summaryText,
  };
}

const briefingCache = { date: null, ts: 0, data: null };
const BRIEFING_TTL = 3 * 60 * 60 * 1000; // 3h — also force-refreshed every morning at 7am

async function refreshBriefing() {
  const today = new Date().toISOString().split("T")[0];
  const categories = await Promise.all(BRIEFING_CATEGORIES.map(buildCategoryBriefing));
  const data = { date: today, generatedAt: new Date().toISOString(), categories };
  briefingCache.date = today;
  briefingCache.data = data;
  briefingCache.ts = Date.now();
  return data;
}

app.get("/api/briefing/today", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  if (briefingCache.date === today && Date.now() - briefingCache.ts < BRIEFING_TTL) {
    return res.json(briefingCache.data);
  }
  try {
    res.json(await refreshBriefing());
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// 7am every day — pre-warm so it's already fresh (not yesterday's stories)
// by the time the phone/browser is opened in the morning.
cron.schedule("0 7 * * *", () => refreshBriefing().catch(() => {}));

// ── Live country KPIs from the World Bank open API (free, no key) ──────────
// Country name → ISO3 code used by the World Bank. Names match the map labels.
const WB_ISO3 = {
  "USA":"USA","Canada":"CAN","Mexico":"MEX","Brazil":"BRA","Argentina":"ARG",
  "Chile":"CHL","Colombia":"COL","Peru":"PER","Venezuela":"VEN","Uruguay":"URY",
  "Bolivia":"BOL","Paraguay":"PRY","Ecuador":"ECU",
  "United Kingdom":"GBR","Germany":"DEU","France":"FRA","Russia":"RUS","Italy":"ITA",
  "Spain":"ESP","Ukraine":"UKR","Poland":"POL","Netherlands":"NLD","Switzerland":"CHE",
  "Sweden":"SWE","Norway":"NOR","Belgium":"BEL","Portugal":"PRT","Austria":"AUT",
  "Denmark":"DNK","Finland":"FIN","Ireland":"IRL","Turkey":"TUR","Greece":"GRC",
  "Romania":"ROU","Bulgaria":"BGR","Serbia":"SRB","Croatia":"HRV","Bosnia":"BIH",
  "Albania":"ALB","Montenegro":"MNE","Kosovo":"XKX","North Macedonia":"MKD",
  "Slovenia":"SVN","Hungary":"HUN","Czech Republic":"CZE","Slovakia":"SVK",
  "Israel":"ISR","Saudi Arabia":"SAU","Iran":"IRN","Iraq":"IRQ","Egypt":"EGY",
  "Syria":"SYR","UAE":"ARE","Qatar":"QAT","Yemen":"YEM","Oman":"OMN","Kuwait":"KWT",
  "Jordan":"JOR","Lebanon":"LBN","Libya":"LBY","Tunisia":"TUN","Algeria":"DZA",
  "Morocco":"MAR","Sudan":"SDN","Somalia":"SOM","Ethiopia":"ETH","Kenya":"KEN",
  "Nigeria":"NGA","Angola":"AGO","South Africa":"ZAF","Uganda":"UGA","Rwanda":"RWA",
  "DR Congo":"COD","Ghana":"GHA","Senegal":"SEN","Mali":"MLI","Cameroon":"CMR",
  "Mozambique":"MOZ","Zimbabwe":"ZWE","Tanzania":"TZA",
  "China":"CHN","Japan":"JPN","South Korea":"KOR","North Korea":"PRK","Mongolia":"MNG",
  "India":"IND","Pakistan":"PAK","Bangladesh":"BGD","Nepal":"NPL","Bhutan":"BTN",
  "Sri Lanka":"LKA","Thailand":"THA","Vietnam":"VNM","Indonesia":"IDN",
  "Philippines":"PHL","Malaysia":"MYS","Singapore":"SGP","Cambodia":"KHM",
  "Laos":"LAO","Myanmar":"MMR","Afghanistan":"AFG","Uzbekistan":"UZB",
  "Kazakhstan":"KAZ","Tajikistan":"TJK","Kyrgyzstan":"KGZ","Turkmenistan":"TKM",
  "Azerbaijan":"AZE","Georgia":"GEO","Armenia":"ARM","Australia":"AUS","New Zealand":"NZL",
};

const WB_INDICATORS = {
  population:     "SP.POP.TOTL",
  gdp:           "NY.GDP.MKTP.CD",
  gdpPerCapita:  "NY.GDP.PCAP.CD",
  gdpGrowth:     "NY.GDP.MKTP.KD.ZG",
  inflation:     "FP.CPI.TOTL.ZG",
  milSpendPctGdp:"MS.MIL.XPND.GD.ZS",
};

const kpiCache = new Map();            // iso3 → { data, ts }
const KPI_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

async function fetchKPI(iso3) {
  const cached = kpiCache.get(iso3);
  if (cached && Date.now() - cached.ts < KPI_TTL) return cached.data;

  const ids = Object.values(WB_INDICATORS).join(";");
  const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${ids}` +
              `?source=2&format=json&per_page=200&mrv=6`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`World Bank ${r.status}`);
  const json = await r.json();
  const rows = Array.isArray(json) ? json[1] || [] : [];

  // For each indicator keep the most recent non-null value.
  const best = {}; // indicatorId → { value, year }
  for (const row of rows) {
    const id = row.indicator && row.indicator.id;
    if (!id || row.value == null) continue;
    const year = +row.date;
    if (!best[id] || year > best[id].year) best[id] = { value: row.value, year };
  }

  const out = { source: "World Bank" };
  let asOf = 0;
  for (const [key, id] of Object.entries(WB_INDICATORS)) {
    const b = best[id];
    out[key] = b ? b.value : null;
    if (b && b.year > asOf) asOf = b.year;
  }
  out.asOf = asOf || null;

  kpiCache.set(iso3, { data: out, ts: Date.now() });
  return out;
}

app.get("/api/kpi/:country", async (req, res) => {
  const iso3 = WB_ISO3[req.params.country];
  if (!iso3) return res.json({ available: false });
  try {
    const data = await fetchKPI(iso3);
    res.json({ available: true, iso3, ...data });
  } catch (e) {
    res.status(502).json({ available: false, error: e.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, model: MODEL }));

app.listen(PORT, () =>
  console.log(`GeoGlobe → http://localhost:${PORT}  (AI: ${USE_GROQ ? "Groq" : "Ollama"}/${MODEL})`)
);
