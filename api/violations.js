const https = require("https");

module.exports = (req, res) => {
  const pwsid = req.query.pwsid;
  if (!pwsid) {
    return res.status(400).json({ error: "Missing pwsid parameter" });
  }

  const url = `https://data.epa.gov/efservice/VIOLATION/PWSID/${encodeURIComponent(pwsid)}/IS_HEALTH_BASED_IND/Y/JSON`;
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
