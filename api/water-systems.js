const https = require("https");

module.exports = (req, res) => {
  const zip = (req.query.zip || "").replace(/\D/g, "").slice(0, 5);
  if (zip.length !== 5) {
    return res.status(400).json({ error: "Invalid zip code" });
  }

  const url = `https://data.epa.gov/efservice/WATER_SYSTEM/ZIP_CODE/${zip}/JSON`;
  proxyRequest(url, res);
};

function proxyRequest(url, res) {
  https.get(url, (apiRes) => {
    let data = "";
    apiRes.on("data", (chunk) => (data += chunk));
    apiRes.on("end", () => {
      res.setHeader("Content-Type", "application/json");
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
    res.status(502).json({ error: "Failed to reach EPA database" });
  });
}
