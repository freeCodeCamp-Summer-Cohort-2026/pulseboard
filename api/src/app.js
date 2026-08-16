const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const updatesRoutes = require("./routes/updates");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Basic rate limit on write-heavy endpoints so one participant's script
  // can't accidentally hammer the shared demo instance.
  const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: process.env.NODE_ENV === "test" ? 300 : 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", writeLimiter, authRoutes);
  app.use("/api/updates", updatesRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
