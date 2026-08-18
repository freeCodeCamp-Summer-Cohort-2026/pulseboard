const { Server } = require("socket.io");

require("dotenv").config();
const { createApp } = require("./app");
const { createServer } = require("http");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

async function main() {
  await connectDB();
  console.log("Connected to MongoDB");

  const app = createApp();

  //* Setup http server and socket with cors access to frontend
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: CORS_ORIGIN,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });

  //* Give middleware access to socket
  app.set("io", io);

  //* Once websocket(s) defined then start server
  httpServer.listen(PORT, () => {
    console.log(`PulseBoard API listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
