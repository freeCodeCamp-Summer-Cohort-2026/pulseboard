const express = require("express");
const { createServer } = require("http");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const updatesRoutes = require("./routes/updates");

function createHttpServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Basic rate limit on write-heavy endpoints so one participant's script
  // can't accidentally hammer the shared demo instance.
  const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
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

  //* Once app has all routes/middleware attached, then create http server and return

  const httpServer = createServer(app);

  return httpServer;
}

module.exports = { createHttpServer };
