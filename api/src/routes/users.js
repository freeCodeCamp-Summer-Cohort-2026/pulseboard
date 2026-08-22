const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { calculateStreak } = require("../utils/streak");
const Update = require("../models/Update");
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

router.get("/:id/streak", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const postingDays = await Update.aggregate([
      { $match: { author: user._id } },
      { $group: { _id: { $dateTrunc: { date: "$createdAt", unit: "day" } } } },
      { $sort: { _id: -1 } },
    ]);

    const streak = calculateStreak(postingDays.map((d) => d._id));

    return res.json({ userId: user._id, streak });
  } catch (err) {
    return res.status(400).json({ error: "Invalid user id" });
  }
});

module.exports = router;
