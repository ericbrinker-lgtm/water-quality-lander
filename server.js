const express = require("express");
const path = require("path");

// Import the same serverless functions used by Vercel
const waterSystems = require("./api/water-systems");
const violations = require("./api/violations");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the static HTML
app.use(express.static(path.join(__dirname, "public")));

// Route to the serverless functions
app.get("/api/water-systems", waterSystems);
app.get("/api/violations", violations);

app.listen(PORT, () => {
  console.log(`Water Quality Lander running at http://localhost:${PORT}`);
});
