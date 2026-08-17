const request = require("supertest");
const { createApp } = require("../app");
const User = require("../models/User");
const Update = require("../models/Update");
const mongoose = require("mongoose");
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
  if ("role" in overrides) {
    throw new Error(
      "registerUser() must not pass role through the public endpoint; " +
        "promote the user via User.findOneAndUpdate in test setup instead.",
    );
  }
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

  it("rejects text longer than 1000 characters", async () => {
    const res = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "a".repeat(1001), status: "done" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("text must be 1000 characters or fewer");
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
    expect(res.body.error).toBe(
      "Too many updates posted. Please wait a minute before posting again.",
    );
  });

  it("creates an update with tags", async () => {
    const res = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Shipped the login page",
        status: "done",
        tags: ["frontend", "ui"],
      });

    expect(res.status).toBe(201);
    expect(res.body.update.text).toBe("Shipped the login page");
    expect(res.body.update.status).toBe("done");
    expect(res.body.update.tags).toStrictEqual(["frontend", "ui"]);
    expect(res.body.update.author._id).toBe(userId);
  });

  it("creates an update without tags", async () => {
    const res = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Shipped the login page", status: "done" });

    expect(res.status).toBe(201);
    expect(res.body.update.text).toBe("Shipped the login page");
    expect(res.body.update.status).toBe("done");
    expect(res.body.update.tags).toStrictEqual([]);
    expect(res.body.update.author._id).toBe(userId);
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
    const res = await request(app).get("/api/updates?sort=popular");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      "sort must be one of: newest, oldest, most-reactions",
    );
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

  it("filters by tags", async () => {
    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Blocked update", status: "blocked", tags: ["frontend"] });

    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Done update", status: "done", tags: ["backend"] });

    const res = await request(app).get("/api/updates?tag=frontend");

    expect(res.status).toBe(200);
    expect(res.body.updates).toHaveLength(1);
    expect(res.body.updates[0].tags[0]).toBe("frontend");
  });

  it("filters by q", async () => {
    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Team meeting today", status: "on-track" });

    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Fixed login bug", status: "done" });

    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Meeting with the client", status: "blocked" });

    const res = await request(app).get("/api/updates?q=MEETING");

    expect(res.status).toBe(200);
    expect(res.body.updates).toHaveLength(2);
    expect(res.body.updates[0].text).toBe("Meeting with the client");
    expect(res.body.updates[1].text).toBe("Team meeting today");
  });

  it("returns an empty array when q matches no updates", async () => {
    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Team meeting today", status: "on-track" });

    const res = await request(app).get("/api/updates?q=nonexistent");

    expect(res.status).toBe(200);
    expect(res.body.updates).toEqual([]);
  });

  it("combines q with status filter", async () => {
    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Meeting with frontend team", status: "blocked" });

    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Meeting with backend team", status: "done" });

    await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Fixed frontend bug", status: "blocked" });

    const res = await request(app).get("/api/updates?q=meeting&status=blocked");

    expect(res.status).toBe(200);
    expect(res.body.updates).toHaveLength(1);
    expect(res.body.updates[0].text).toBe("Meeting with frontend team");
    expect(res.body.updates[0].status).toBe("blocked");
  });
});

describe("GET /api/updates/leaderboard", () => {
  it("returns authors sorted by update count with reaction totals", async () => {
    const other = await registerUser({
      email: "other@example.com",
      displayName: "Other",
    });

    // Author creates 3 updates.
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/updates")
        .set("Authorization", `Bearer ${token}`)
        .send({
          text: `Author update ${i}`,
          status: "on-track",
        });
    }

    // Other creates 1 update.
    const otherUpdate = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${other.token}`)
      .send({
        text: "Other update",
        status: "on-track",
      });

    const otherUpdateId = otherUpdate.body.update._id;

    // Add two reactions to Other's update.
    await request(app)
      .post(`/api/updates/${otherUpdateId}/reactions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ emoji: "👍" });

    await request(app)
      .post(`/api/updates/${otherUpdateId}/reactions`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ emoji: "🎉" });

    const res = await request(app).get("/api/updates/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toHaveLength(2);

    expect(res.body.leaderboard[0].author.displayName).toBe("Author");
    expect(res.body.leaderboard[0].updateCount).toBe(3);
    expect(res.body.leaderboard[0].reactionCount).toBe(0);

    expect(res.body.leaderboard[1].author.displayName).toBe("Other");
    expect(res.body.leaderboard[1].updateCount).toBe(1);
    expect(res.body.leaderboard[1].reactionCount).toBe(2);
  });

  it("returns an empty list when there are no updates in the requested window", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Old update",
        status: "on-track",
      });

    const updateId = createRes.body.update._id;

    // Move the update outside the one-day window.
    await Update.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(updateId) },
      {
        $set: {
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      },
    );

    const res = await request(app).get("/api/updates/leaderboard?days=1");

    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toEqual([]);
  });

  it("includes updates inside the requested window and excludes older updates", async () => {
    const recentUpdate = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Recent update",
        status: "on-track",
      });

    const oldUpdate = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Old update",
        status: "on-track",
      });

    await Update.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(oldUpdate.body.update._id) },
      {
        $set: {
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      },
    );

    const res = await request(app).get("/api/updates/leaderboard?days=1");

    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toHaveLength(1);

    expect(res.body.leaderboard[0].updateCount).toBe(1);
    expect(res.body.leaderboard[0].author.displayName).toBe("Author");
  });
});

describe("DELETE /api/updates/:id", () => {
  it("allows a LEAD to delete any update", async () => {
    // Promote the user directly via the model — the public /register
    // endpoint always creates a MEMBER. The original JWT was issued
    // with role: "MEMBER" baked into the payload, and requireAuth
    // trusts the JWT over the DB, so we log back in to get a token
    // that reflects the promotion.
    await User.findOneAndUpdate(
      { email: "author@example.com" },
      { role: "LEAD" },
    );

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "author@example.com",
      password: "password123",
    });
    const leadToken = loginRes.body.token;

    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${leadToken}`)
      .send({ text: "Delete me", status: "done" });

    const updateId = createRes.body.update._id;

    const res = await request(app)
      .delete(`/api/updates/${updateId}`)
      .set("Authorization", `Bearer ${leadToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBe(updateId);
  });

  it("returns 403 when a MEMBER tries to delete another user's update", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Protected update", status: "on-track" });

    const updateId = createRes.body.update._id;

    const otherMember = await registerUser({
      email: "member2@example.com",
      displayName: "Member Two",
    });

    const res = await request(app)
      .delete(`/api/updates/${updateId}`)
      .set("Authorization", `Bearer ${otherMember.token}`);

    expect(res.status).toBe(403);
    expect(res.body.message || res.body.error).toMatch(/access denied/i);
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

  it("returns 400 if the emoji string exceeds 8 characters", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "React to me", status: "on-track" });

    const updateId = createRes.body.update._id;

    const res = await request(app)
      .post(`/api/updates/${updateId}/reactions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ emoji: "123456789" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("emoji cannot exceed 8 characters");
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
      .delete(`/api/updates/${fakeUpdateId}/reactions/${fakeReactionId}`)
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

describe("PATCH /api/updates/:id", () => {
  it("rejects text longer than 1000 characters", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Valid update", status: "on-track" });

    const updateId = createRes.body.update._id;

    const res = await request(app)
      .patch(`/api/updates/${updateId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "a".repeat(1001) });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("text must be 1000 characters or fewer");
  });

  it("allows the author to edit their own update", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Original update",
        status: "on-track",
      });

    const updateId = createRes.body.update._id;

    const res = await request(app)
      .patch(`/api/updates/${updateId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Updated update",
        status: "done",
      });

    expect(res.status).toBe(200);
    expect(res.body.update.text).toBe("Updated update");
    expect(res.body.update.status).toBe("done");
    expect(res.body.update._id).toBe(updateId);
    expect(res.body.update.author._id).toBe(userId);
  });

  it("rejects another user from editing the update", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Original update",
        status: "on-track",
      });

    const updateId = createRes.body.update._id;

    const other = await registerUser({
      email: "editor@example.com",
      displayName: "Other Editor",
    });

    const res = await request(app)
      .patch(`/api/updates/${updateId}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({
        text: "I should not be able to change this",
        status: "done",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("You can only edit your own updates");
  });

  it("returns 404 when the update does not exist", async () => {
    const res = await request(app)
      .patch("/api/updates/64b7f3f3f3f3f3f3f3f3f3f3")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Updated text",
        status: "done",
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Update not found");
  });

  it("rejects a patch with no fields to update", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Original update",
        status: "on-track",
      });

    const updateId = createRes.body.update._id;

    const res = await request(app)
      .patch(`/api/updates/${updateId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("At least one of text or status is required");
  });

  it("rejects an invalid status", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Original update",
        status: "on-track",
      });

    const updateId = createRes.body.update._id;

    const res = await request(app)
      .patch(`/api/updates/${updateId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "not-a-real-status",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      "status must be one of: on-track, blocked, done",
    );
  });

  it("rejects an empty text value", async () => {
    const createRes = await request(app)
      .post("/api/updates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Original update",
        status: "on-track",
      });

    const updateId = createRes.body.update._id;

    const res = await request(app)
      .patch(`/api/updates/${updateId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "   ",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("text is required and cannot be empty");
  });
});
