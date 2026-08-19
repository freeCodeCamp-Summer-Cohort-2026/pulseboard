const request = require("supertest");
const { createApp } = require("../app");
const { setupTestDB, teardownTestDB, clearTestDB } = require("./setup");

const app = createApp();

beforeAll(async () => {
  await setupTestDB();
});

afterEach(async () => {
  await clearTestDB();
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
});

describe("POST /api/auth/forgot-password", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      email: "resetuser@example.com",
      password: "password123",
      displayName: "Reset User",
    });
  });

  it("generates a reset token for an existing user", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "resetuser@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Password reset token has been generated");
    expect(res.body.devResetToken).toBeDefined();
  });

  it("rejects request without email", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("email is required");
  });

  it("replaces existing reset token if a second request is made", async () => {
    const firstRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "resetuser@example.com" });

    const secondRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "resetuser@example.com" });

    expect(secondRes.status).toBe(201);
    expect(secondRes.body.devResetToken).not.toBe(firstRes.body.devResetToken);

    // Old token should be invalidated
    const resetAttempt = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: firstRes.body.devResetToken,
        newPassword: "newpassword123",
      });

    expect(resetAttempt.status).toBe(400);
    expect(resetAttempt.body.message).toBe("Invalid or expired token");
  });
  it("does not reveal whether an email exists", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({
        email: "doesnotexist@example.com",
      });
  
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(
      "If an account exists, a password reset token has been generated.",
    );
  });
});

describe("POST /api/auth/reset-password", () => {
  let validToken;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      email: "target@example.com",
      password: "oldpassword123",
      displayName: "Target User",
    });

    const forgotRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "target@example.com" });

    validToken = forgotRes.body.devResetToken;
  });

  it("successfully resets the password and allows login with new credentials", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: validToken,
        newPassword: "newpassword123",
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Password reset successfully.");

    // Verify old password fails
    const failedLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "target@example.com", password: "oldpassword123" });
    expect(failedLogin.status).toBe(401);

    // Verify new password succeeds
    const successLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "target@example.com", password: "newpassword123" });
    expect(successLogin.status).toBe(200);
    expect(successLogin.body.token).toBeDefined();
  });

  it("rejects missing token or newPassword", async () => {
    const resNoToken = await request(app)
      .post("/api/auth/reset-password")
      .send({ newPassword: "newpassword123" });
    expect(resNoToken.status).toBe(400);

    const resNoPass = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: validToken });
    expect(resNoPass.status).toBe(400);
  });

  it("rejects password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: validToken,
        newPassword: "short",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("password must be at least 8 characters long");
  });

  it("rejects an invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: "invalidtokenstring123456",
        newPassword: "newpassword123",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid or expired token");
  });

  it("prevents token reuse after a successful reset", async () => {
    await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: validToken,
        newPassword: "newpassword123",
      });

    const retryRes = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: validToken,
        newPassword: "anotherpassword123",
      });

    expect(retryRes.status).toBe(400);
    expect(retryRes.body.message).toBe("Invalid or expired token");
  });
});
