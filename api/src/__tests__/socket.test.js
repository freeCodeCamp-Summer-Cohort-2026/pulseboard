const request = require("supertest");
const { Server } = require("socket.io");
const { io: Client } = require("socket.io-client");
const express = require("express");
const { createServer } = require("http");

//* INTEGRATION TESTS

describe("Socket.IO event emitting logic", () => {
  let app;
  let httpServer;
  let io;
  let clientSocket;

  beforeAll((done) => {
    app = express();
    app.use(express.json());

    //? Temp storage to mock DB actions in testing
    let updates = [];
    let nextId = 1;

    //* POST /api/updates
    app.post("/api/updates", (req, res) => {
      const newUpdate = { _id: String(nextId++), ...req.body };
      updates.push(newUpdate);

      const io = req.app.get("io");
      io?.emit("POST:update", newUpdate);
      res.status(201).json(newUpdate);
    });

    //* POST /api/updates/:id/reactions
    app.post("/api/updates/:id/reactions", (req, res) => {
      const reaction = { userId: req.body.userId, emoji: req.body.emoji };

      const io = req.app.get("io");
      io?.emit("POST:reaction", { updateId: req.params.id, reaction });

      return res.status(201).json(reaction);
    });

    httpServer = createServer(app);
    io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
    });
    app.set("io", io);

    //? Use an ephemeral port for temporary connection for testing
    httpServer.listen(0, () => {
      const PORT = httpServer.address().port;

      clientSocket = new Client(`http://localhost:${PORT}`, {
        transports: ["websocket"],
      });
      clientSocket.on("connect", done);
    });
  });

  //? Once tests are finished, disconnect client + close server
  afterAll((done) => {
    clientSocket.disconnect();
    io.close();
    httpServer.close(done);
  });

  //* Tests

  test("emits POST:update when an update is created", (done) => {
    //? Listen for event, then make request
    clientSocket.once("POST:update", (update) => {
      expect(update._id).toBeDefined();
      expect(update.title).toBe("Test update");
      done();
    });

    const PORT = httpServer.address().port;
    request(`http://localhost:${PORT}`)
      .post("/api/updates")
      .send({ title: "Test update" })
      .expect(201)
      .end((err) => {
        if (err) return done(err);
      });
  });

  test("emits POST:reaction when an update is created", (done) => {
    const PORT = httpServer.address().port;
    request(`http://localhost:${PORT}`)
      .post("/api/updates")
      .send({ title: "Test update for reaction" })
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        const updateId = res.body._id;

        clientSocket.once("POST:reaction", (data) => {
          expect(data.updateId).toBe(updateId);
          expect(data.reaction.emoji).toBe("👍");
          done();
        });

        request(`http://localhost:${PORT}`)
          .post(`/api/updates/${updateId}/reactions`)
          .send({ userId: "test user", emoji: "👍" })
          .expect(201)
          .end((err) => {
            if (err) return done(err);
          });
      });
  });
});
