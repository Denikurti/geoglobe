// Talks to the local backend, which proxies to Ollama (Mistral). No paid API.
async function askAI(country, question) {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country, question }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data.answer;
}
