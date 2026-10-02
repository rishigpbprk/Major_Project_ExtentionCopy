const API_BASES = ["http://127.0.0.1:5000", "http://localhost:5000"];

async function callApi(path, payload) {
  let lastError = null;
  for (const base of API_BASES) {
    try {
      const response = await fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({ success: false, error: "Invalid server response" }));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    } catch (e) { lastError = e; }
  }
  throw lastError || new Error("Safety server unavailable");
}

async function health() {
  let lastError = null;
  for (const base of API_BASES) {
    try {
      const r = await fetch(base + "/api/health");
      return await r.json();
    } catch (e) { lastError = e; }
  }
  throw lastError || new Error("Safety server unavailable");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "ANALYZE_TEXT") {
    callApi("/api/analyze/text", { text: message.text })
      .then(data => sendResponse({ ok: true, data }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "HEALTH") {
    health()
      .then(data => sendResponse({ ok: true, data }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
