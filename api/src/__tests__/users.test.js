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
