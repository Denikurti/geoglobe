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
