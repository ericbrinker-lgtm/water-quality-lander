const https = require("https");

module.exports = (req, res) => {
  const zip = (req.query.zip || "").replace(/\D/g, "").slice(0, 5);
  if (zip.length !== 5) {
    return res.status(400).json({ error: "Invalid zip code" });
  }

  const url = `https://data.epa.gov/efservice/WATER_SYSTEM/ZIP_CODE/${zip}/JSON`;
  proxyRequest(url, res);
};

// Cache for 24 hours at Vercel's CDN edge, serve stale for up to 1 hour while revalidating.
// This means: first lookup for a zip hits the EPA. Every subsequent request for that same
// zip within 24h is served instantly from Vercel's CDN — no EPA call at all.
const CACHE_HEADER = "s-maxage=86400, stale-while-revalidate=3600";

function proxyRequest(url, res) {
  https.get(url, (apiRes) => {
    let data = "";
    apiRes.on("data", (chunk) => (data += chunk));
    apiRes.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", CACHE_HEADER);
      if (!data || data.trim() === "") {
        res.json([]);
      } else {
        try {
          res.json(JSON.parse(data));
        } catch {
          res.json([]);
        }
      }
    });
  }).on("error", (err) => {
    console.error("EPA API error:", err.message);
    // Don't cache errors
    res.status(502).json({ error: "Failed to reach EPA database" });
  });
}
