const request = require("supertest");
const { createApp } = require("../app");
const { setupTestDB, teardownTestDB, clearTestDB } = require("./setup");

const app = createApp();

let token;
let userId;

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

async function registerUser(overrides = {}) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      email: "author@example.com",
      password: "password123",
      displayName: "Author",
      ...overrides,
    });
  return res.body;
}

beforeEach(async () => {
  const body = await registerUser();
  token = body.token;
  userId = body.user._id;
});

describe("POST /api/updates", () => {
  it("creates an update when authenticated", async () => {
    const res = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Shipped the login page", status: "done" });

    expect(res.status).toBe(201);
    expect(res.body.update.text).toBe("Shipped the login page");
    expect(res.body.update.status).toBe("done");
    expect(res.body.update.author._id).toBe(userId);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/api/updates")
      .send({ text: "No auth", status: "done" });

    expect(res.status).toBe(401);
  });

  it("rejects an invalid status", async () => {
    const res = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Bad status", status: "not-a-real-status" });

    expect(res.status).toBe(400);
  });

  it("rejects empty text", async () => {
    const res = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "   ", status: "done" });

    expect(res.status).toBe(400);
  });

  it("rate limits after 15 posts in a window", async () => {
    const makeRequest = () =>
      request(app)
        .post("/api/updates")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "update", status: "on-track" });

    for (let i = 0; i < 15; i++) {
      const res = await makeRequest();
      expect(res.status).toBe(201);
    }

    const res = await makeRequest();
    expect(res.status).toBe(429);
    expect(res.body.error).toBe("Too many updates posted. Please wait a minute before posting again.");
  });
});

describe("GET /api/updates", () => {
  it("lists updates newest first", async () => {
    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "First update", status: "on-track" });

    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Second update", status: "blocked" });

    const res = await request(app).get("/api/updates");

    expect(res.status).toBe(200);
    expect(res.body.updates).toHaveLength(2);
    expect(res.body.updates[0].text).toBe("Second update");
  });

  it("lists updates oldest first", async () => {
    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "First update", status: "blocked" });

    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Second update", status: "blocked" });

    const res = await request(app).get("/api/updates?sort=oldest");

    expect(res.status).toBe(200);
    expect(res.body.updates).toHaveLength(2);
    expect(res.body.updates[0].text).toBe("First update");
  });

  it("lists updates with the most reactions first", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Most reacted", status: "blocked" });

    const updateId = createRes.body.update._id;

    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "No reactions", status: "blocked" });

    await request(app)
      .post(`/api/updates/${updateId}/reactions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ emoji: "✅" });

    const res = await request(app).get("/api/updates?sort=most-reactions");

    expect(res.status).toBe(200);
    expect(res.body.updates).toHaveLength(2);
    expect(res.body.updates[0].text).toBe("Most reacted");
  });

  it("rejects an invalid sort value", async () => {
    const res = await request(app)
      .get("/api/updates?sort=popular");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("sort must be one of: newest, oldest, most-reactions");
  });

  it("filters by status", async () => {
    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Blocked update", status: "blocked" });

    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Done update", status: "done" });

    const res = await request(app).get("/api/updates?status=blocked");

    expect(res.status).toBe(200);
    expect(res.body.updates).toHaveLength(1);
    expect(res.body.updates[0].status).toBe("blocked");
  });

  it("filters by author", async () => {
    const other = await registerUser({
      email: "other@example.com",
      displayName: "Other",
    });

    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Mine", status: "done" });

    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ text: "Theirs", status: "done" });

    const res = await request(app).get(`/api/updates?author=${userId}`);

    expect(res.status).toBe(200);
    expect(res.body.updates).toHaveLength(1);
    expect(res.body.updates[0].text).toBe("Mine");
  });
});

describe("POST /api/updates/:id/reactions", () => {
  it("adds a reaction to an update", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "React to me", status: "on-track" });

    const updateId = createRes.body.update._id;

    const res = await request(app)
      .post(`/api/updates/${updateId}/reactions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ emoji: "🎉" });

    expect(res.status).toBe(201);
    expect(res.body.update.reactions).toHaveLength(1);
    expect(res.body.update.reactions[0].emoji).toBe("🎉");
  });

  it("rejects duplicate reactions from the same user with the same emoji", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "React to me", status: "on-track" });

    const updateId = createRes.body.update._id;

    await request(app)
      .post(`/api/updates/${updateId}/reactions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ emoji: "🎉" });

    const res = await request(app)
      .post(`/api/updates/${updateId}/reactions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ emoji: "🎉" });

    expect(res.status).toBe(409);
  });

  it("returns 404 for a reaction on a nonexistent update", async () => {
    const res = await request(app)
      .post("/api/updates/64b7f3f3f3f3f3f3f3f3f3f3/reactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ emoji: "🎉" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/updates/:id/reactions/:reactionId", () => {
  it("deletes a reaction and returns the updated update", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Test react post. React to me for now.",
        status: "on-track",
      });

    const updateId = createRes.body.update._id;

    const reactionRes = await request(app)
      .post(`/api/updates/${updateId}/reactions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ emoji: "✨" });

    const reactionId = reactionRes.body.update.reactions[0]._id;

    const res = await request(app)
      .delete(`/api/updates/${updateId}/reactions/${reactionId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.update.reactions).toHaveLength(0);
  });

  it("rejects deleting another user's reaction", async () => {
    const other = await registerUser({
      email: "other@example.com",
      displayName: "Other",
    });

    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Test react post. React to me for now.",
        status: "on-track",
      });

    const updateId = createRes.body.update._id;

    const reactionRes = await request(app)
      .post(`/api/updates/${updateId}/reactions`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ emoji: "👍" });

    const reactionId = reactionRes.body.update.reactions[0]._id;

    const res = await request(app)
      .delete(`/api/updates/${updateId}/reactions/${reactionId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("You can only remove your own reactions");
  });

  it("returns 404 when the update does not exist", async () => {
    const fakeUpdateId = "64b7f3f3f3f3f3f3f3f3f3f3";
    const fakeReactionId = "74b7f3f3f3f3f3f3f3f3f3f3";

    const res = await request(app)
      .delete(
        `/api/updates/${fakeUpdateId}/reactions/${fakeReactionId}`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Update not found");
  });

  it("returns 404 when the reaction does not exist", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Test react post. React to me for now.",
        status: "on-track",
      });

    const updateId = createRes.body.update._id;
    const fakeReactionId = "74b7f3f3f3f3f3f3f3f3f3f3";

    const res = await request(app)
      .delete(`/api/updates/${updateId}/reactions/${fakeReactionId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Reaction not found");
  });
});
