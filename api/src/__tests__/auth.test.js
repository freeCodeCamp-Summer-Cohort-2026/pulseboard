const request = require("supertest");
const { createApp } = require("../app");
const { setupTestDB, teardownTestDB, clearTestDB } = require("./setup");
const authRoutes = require("../routes/auth");

const app = createApp();

beforeAll(async () => {
  await setupTestDB();
});

afterEach(async () => {
  await clearTestDB();
  authRoutes.resetLoginLimiter();
});

afterAll(async () => {
  await teardownTestDB();
});

describe("POST /api/auth/register", () => {
  it("creates a new user and returns a token", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "password123",
      displayName: "Test User",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("rejects duplicate emails", async () => {
    await request(app).post("/api/auth/register").send({
      email: "dup@example.com",
      password: "password123",
      displayName: "First",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "dup@example.com",
      password: "password123",
      displayName: "Second",
    });

    expect(res.status).toBe(409);
  });

  it("rejects short passwords", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "short@example.com",
      password: "abc",
      displayName: "Short",
    });

    expect(res.status).toBe(400);
  });

  it("ignores role in the request body and defaults to MEMBER", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "sneaky@example.com",
      password: "password123",
      displayName: "Sneaky",
      role: "LEAD",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("MEMBER");
  });
});

it("rejects displayName longer than 100 characters", async () => {
  const longName = "A".repeat(101);
  const res = await request(app).post("/api/auth/register").send({
    email: "testlong@example.com",
    password: "password123",
    displayName: longName,
  });

  expect(res.status).toBe(400);
  expect(res.body.error).toBe("display name must be 100 characters or less");
});

it("accepts displayName exactly 100 characters", async () => {
  const nameAtLimit = "A".repeat(100);
  const res = await request(app).post("/api/auth/register").send({
    email: "testexact@example.com",
    password: "password123",
    displayName: nameAtLimit,
  });

  expect(res.status).toBe(201);
  expect(res.body.user.displayName).toBe(nameAtLimit);
  expect(res.body.token).toBeDefined();
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      email: "login@example.com",
      password: "password123",
      displayName: "Login User",
    });
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects incorrect password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
  });

  it("returns 429 after too many failed login attempts", async () => {
    const attemptLimit = 5;
    const expectedMessage = "Too many login attempts. Please try again later.";

    const makeFailedRequest = () =>
      request(app).post("/api/auth/login").send({
        email: "login@example.com",
        password: "wrongpassword",
      });

    for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
      const response = await makeFailedRequest();
      expect(response.status).toBe(401);
    }

    const blockedResponse = await makeFailedRequest();
    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body.error).toBe(expectedMessage);
  });
});
