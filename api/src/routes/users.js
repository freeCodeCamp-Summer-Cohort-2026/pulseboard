const express = require("express");
const User = require("../models/User");
const { requireAuth, checkRole } = require("../middleware/auth");

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

// PATCH /api/users/:id/role
// LEAD can promote/demote other users
router.patch("/:id/role", requireAuth, checkRole("LEAD"), async (req, res) => {
  const { role } = req.body;

  //? Catch invalid roles
  if (!["LEAD", "MEMBER"].includes(role)) {
    return res.status(400).json({
      error: "Invalid role given - new role must be one of LEAD/MEMBER.",
    });
  }

  //? Catch invalid user IDs
  const userInQuestion = await User.findById(req.params.id);

  if (!userInQuestion) {
    return res.status(404).json({
      error: "Invalid user id given - user not found.",
    });
  }

  //? Prevent last remaining lead from demoting themselves
  if (
    req.user.id === userInQuestion.id &&
    userInQuestion.role === "LEAD" &&
    role === "MEMBER"
  ) {
    const leadsCount = await User.find({ role: "LEAD" }).countDocuments();

    if (leadsCount <= 1) {
      return res.status(400).json({
        error: "Invalid action - cannot demote the last remaining LEAD.",
      });
    }
  }

  userInQuestion.role = role;
  await userInQuestion.save();

  return res.status(200).json({
    user: userInQuestion,
  });
});

module.exports = router;
