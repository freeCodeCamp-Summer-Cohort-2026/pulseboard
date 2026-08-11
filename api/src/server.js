const { Server } = require("socket.io");

require("dotenv").config();
const { createHttpServer } = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 4000;

async function main() {
  await connectDB();
  console.log("Connected to MongoDB");

  const httpServer = createHttpServer();
  const io = new Server(httpServer, {
    cors: {
      origin: [`http://localhost:${PORT}`]
    }
  });

  io.on("connection", (socket) => {
    return;
  });

  //* Once websocket(s) defined then start server
  httpServer.listen(PORT, () => {
    console.log(`PulseBoard API listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
