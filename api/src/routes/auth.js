const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const PasswordReset = require("../models/Password_Reset");
const crypto = require("node:crypto");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const loginLimiterStore = new rateLimit.MemoryStore();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  store: loginLimiterStore,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again later.",
  },
});

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({
        error: "email, password, displayName are all required",
      });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "password must be at least 8 characters long" });
    }
    if (displayName.length > 100) {
      return res.status(400).json({
        error: "display name must be 100 characters or less",
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with that email already exists" });
    }

    const passwordHash = await User.hashPassword(password);

    const user = await User.create({ email, displayName, passwordHash });

    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    return res.status(500).json({ error: "Failed to register user" });
  }
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);
    return res.json({ token, user });
  } catch (err) {
    return res.status(500).json({ error: "Failed to log in" });
  }
});

//POST api/auth/forgot-password

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(200).json({
        message:
          "If an account exists, a password reset token has been generated.",
      });
    }

    await PasswordReset.deleteMany({ userId: user._id });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const generatedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 1000 * 60);

    await PasswordReset.create({
      userId: user._id,
      tokenHash: generatedToken,
      expiresAt,
    });

    return res.status(201).json({
      message: "Password reset token has been generated",
      devResetToken:
        process.env.NODE_ENV !== "production" ? rawToken : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate reset-token" });
  }
});

//POST api/auth/reset-password

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "password must be at least 8 characters long" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const changeRequest = await PasswordReset.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!changeRequest) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(changeRequest.userId);

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token.",
      });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    // Token can never be used again.
    await PasswordReset.deleteMany({
      userId: changeRequest.userId,
    });

    return res.status(200).json({
      message: "Password reset successfully.",
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to reset password" });
  }
});

module.exports = router;
module.exports.resetLoginLimiter = () => loginLimiterStore.resetAll();
