const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

console.log("=== DEBUG SERVER STARTING ===");
console.log("Environment variables:");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PWD:", process.env.PWD);
console.log("PATH:", process.env.PATH);

console.log("=== CHECKING DEPENDENCIES ===");
try {
  const fs = require("fs");
  console.log("✓ fs module loaded");

  const path = require("path");
  console.log("✓ path module loaded");

  // Check if extend_canvas binary exists
  if (fs.existsSync("/app/extend_canvas")) {
    console.log("✓ extend_canvas binary found");
  } else {
    console.log("✗ extend_canvas binary NOT found");
  }

  // List files in /app
  const files = fs.readdirSync("/app");
  console.log("Files in /app:", files);
} catch (error) {
  console.error("Error checking dependencies:", error);
}

app.get("/health", (req, res) => {
  console.log("Health check requested");
  res.json({
    status: "healthy",
    port: PORT,
    env: process.env.PORT,
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({ message: "Debug server running", port: PORT });
});

console.log(`=== STARTING SERVER ON PORT ${PORT} ===`);
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ Debug server running on port ${PORT}`);
  console.log(`✓ Server address: http://0.0.0.0:${PORT}`);
  console.log(`✓ Health check: http://0.0.0.0:${PORT}/health`);
});

server.on("error", (error) => {
  console.error("Server error:", error);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully");
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully");
  server.close(() => {
    process.exit(0);
  });
});

console.log("=== DEBUG SERVER SETUP COMPLETE ===");
