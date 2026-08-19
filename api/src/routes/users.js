const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/users
// returns a list of all users
router.get("/", requireAuth, async (req, res) => {
  try {
    const users = await User.find().select("_id displayName role");
    return res.status(200).json({
      users: users.map(({ _id, displayName, role }) => ({
        id: _id,
        displayName,
        role,
      })),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;
