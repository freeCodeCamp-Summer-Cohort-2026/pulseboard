const request = require("supertest");
const jwt = require("jsonwebtoken");
const { createApp } = require("../app");
const User = require("../models/User");

const { setupTestDB, teardownTestDB, clearTestDB } = require("./setup");

const app = createApp();

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe("GET /api/users", () => {
  it("requires authentication", async () => {
    const response = await request(app).get("/api/users");

    expect(response.statusCode).toBe(401);
  });

  it("returns only public user fields", async () => {
    const user = await User.create({
      email: "user@example.com",
      displayName: "User Name",
      passwordHash: "super-secret-password-hash",
      role: "MEMBER",
    });

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
    );

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty("users");
    expect(Array.isArray(response.body.users)).toBe(true);

    response.body.users.forEach((user) => {
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("displayName");
      expect(user).toHaveProperty("role");

      expect(user).not.toHaveProperty("email");
      expect(user).not.toHaveProperty("passwordHash");
      expect(user).not.toHaveProperty("__v");
    });
  });
});

describe("PATCH /api/users/:id/role", () => {
  it("Allows a LEAD to change another user's role", async () => {
    const lead = await User.create({
      email: "user@example.com",
      displayName: "User Name",
      passwordHash: "super-secret-password-hash",
      role: "LEAD",
    });
    const member = await User.create({
      email: "user2@example.com",
      displayName: "User Name 2",
      passwordHash: "super-secret-password-hash-2",
      role: "MEMBER",
    });

    const token = jwt.sign(
      {
        sub: lead._id.toString(),
        email: lead.email,
        role: lead.role,
      },
      process.env.JWT_SECRET,
    );

    const res = await request(app)
      .patch(`/api/users/${member.id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "LEAD" })
      .expect(200);

    expect(res.body.user.role).toBe("LEAD");
  });

  it("Returns a 403 when a MEMBER tries to change a user's role", async () => {
    const member1 = await User.create({
      email: "user@example.com",
      displayName: "User Name",
      passwordHash: "super-secret-password-hash",
      role: "MEMBER",
      save: jest.fn().mockResolvedValue(true),
    });
    const member2 = await User.create({
      email: "user2@example.com",
      displayName: "User Name 2",
      passwordHash: "super-secret-password-hash-2",
      role: "MEMBER",
      save: jest.fn().mockResolvedValue(true),
    });

    const token = jwt.sign(
      {
        sub: member1._id.toString(),
        email: member1.email,
        role: member1.role,
      },
      process.env.JWT_SECRET,
    );

    const res = await request(app)
      .patch(`/api/users/${member2.id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "LEAD" })
      .expect(403);
  });

  it("Prevents the last remaining LEAD from demoting themselves", async () => {
    const lead = await User.create({
      email: "user@example.com",
      displayName: "User Name",
      passwordHash: "super-secret-password-hash",
      role: "LEAD",
      save: jest.fn().mockResolvedValue(true),
    });

    const token = jwt.sign(
      {
        sub: lead._id.toString(),
        email: lead.email,
        role: lead.role,
      },
      process.env.JWT_SECRET,
    );

    const res = await request(app)
      .patch(`/api/users/${lead.id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "MEMBER" })
      .expect(400);

    const leadUpdated = await User.findById(lead.id);
    expect(leadUpdated.role).toBe("LEAD");
  });
});
