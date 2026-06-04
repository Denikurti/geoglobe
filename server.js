import express from "express";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "mistral";

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
    res.json({ answer: data.message?.content ?? "(no response)" });
  } catch (e) {
    res
      .status(502)
      .json({ error: `Cannot reach Ollama at ${OLLAMA_URL}. Is it running? (${e.message})` });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, model: MODEL }));

app.listen(PORT, () =>
  console.log(`GeoGlobe → http://localhost:${PORT}  (AI: Ollama/${MODEL})`)
);
