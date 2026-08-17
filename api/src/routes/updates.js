const express = require("express");
const Update = require("../models/Update");
const { STATUS_VALUES, VISIBILITY_VALUES } = require("../models/Update");
const rateLimit = require("express-rate-limit");
const { requireAuth, optionalAuth, checkRole } = require("../middleware/auth");
const SORT_VALUES = ["newest", "oldest", "most-reactions"];

const router = express.Router();

const createUpdateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many updates posted. Please wait a minute before posting again.",
  },
  keyGenerator: (req) => req.user?.id,
});

// Legacy records predate the visibility field, so treat anything but an explicit "leads" as visible.
function isVisibleToRequester(update, user) {
  return update.visibility !== "leads" || Boolean(user && user.role === "LEAD");
}

// GET /api/updates?author=<userId>&status=<on-track|blocked|done>&tag=<free-form-tag>&sort=<newest|oldest|most-reactions>
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { author, status, tag, sort, q } = req.query;
    const filter = {};

    // Non-LEAD requesters (members and anonymous) never see leads-only updates.
    // $ne (rather than equality on "team") also matches legacy records saved before this field existed.
    if (!req.user || req.user.role !== "LEAD") {
      filter.visibility = { $ne: "leads" };
    }

    if (author) {
      filter.author = author;
    }

    if (status) {
      if (!STATUS_VALUES.includes(status)) {
        return res.status(400).json({
          error: `status must be one of: ${STATUS_VALUES.join(", ")}`,
        });
      }
      filter.status = status;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (sort) {
      if (!SORT_VALUES.includes(sort)) {
        return res.status(400).json({
          error: `sort must be one of: ${SORT_VALUES.join(", ")}`,
        });
      }
    }

    const sortDirection = sort === "oldest" ? 1 : -1;
    const updates = await Update.find(filter)
      .sort({ createdAt: sortDirection })
      .populate("author", "displayName email")
      .populate("reactions.user", "displayName email");

    let filterUpdates = updates;

    if (q) {
      const searchString = q.trim().toLowerCase();
      filterUpdates = updates.filter((update) => {
        return update.text.toLowerCase().includes(searchString);
      });
    }

    if (sort === "most-reactions") {
      filterUpdates.sort((a, b) => b.reactions.length - a.reactions.length);
    }

    return res.json({ updates: filterUpdates });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch updates" });
  }
});

// GET /api/updates/leaderboard?days=7
router.get("/leaderboard", async (req, res) => {
  try {
    const days = req.query.days === undefined ? 7 : Number(req.query.days);

    if (!Number.isFinite(days) || days <= 0) {
      return res.status(400).json({
        error: "days must be a positive number",
      });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const leaderboard = await Update.aggregate([
      {
        $match: {
          createdAt: {
            $gte: since,
            $lte: new Date(),
          },
        },
      },
      {
        $group: {
          _id: "$author",
          updateCount: { $sum: 1 },
          reactionCount: {
            $sum: { $size: "$reactions" },
          },
        },
      },
      {
        $sort: {
          updateCount: -1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "author",
        },
      },
      {
        $unwind: "$author",
      },
      {
        $project: {
          _id: 0,
          author: {
            _id: "$author._id",
            displayName: "$author.displayName",
            email: "$author.email",
          },
          updateCount: 1,
          reactionCount: 1,
        },
      },
    ]);

    return res.json({ leaderboard });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch leaderboard",
    });
  }
});

// GET /api/updates/:id
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const update = await Update.findById(req.params.id)
      .populate("author", "displayName email")
      .populate("reactions.user", "displayName email");

    if (!update) {
      return res.status(404).json({ error: "Update not found" });
    }

    // Hide leads-only updates from non-LEAD requesters without leaking existence.
    if (!isVisibleToRequester(update, req.user)) {
      return res.status(404).json({ error: "Update not found" });
    }

    return res.json({ update });
  } catch (err) {
    return res.status(400).json({ error: "Invalid update id" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { text, status } = req.body;

    const update = await Update.findById(req.params.id);

    if (!update) {
      return res.status(404).json({ error: "Update not found" });
    }

    if (update.author.toString() !== req.user.id) {
      return res.status(403).json({
        error: "You can only edit your own updates",
      });
    }

    if (text === undefined && status === undefined) {
      return res.status(400).json({
        error: "At least one of text or status is required",
      });
    }

    if (text !== undefined) {
      if (!text || !text.trim()) {
        return res.status(400).json({
          error: "text is required and cannot be empty",
        });
      }

      if (text.length > 1000) {
        return res.status(400).json({
          error: "text must be 1000 characters or fewer",
        });
      }

      update.text = text.trim();
    }

    if (status !== undefined) {
      if (!STATUS_VALUES.includes(status)) {
        return res.status(400).json({
          error: `status must be one of: ${STATUS_VALUES.join(", ")}`,
        });
      }

      update.status = status;
    }

    await update.save();

    const populated = await update.populate([
      { path: "author", select: "displayName email" },
      { path: "reactions.user", select: "displayName email" },
    ]);

    return res.json({ update: populated });
  } catch (err) {
    return res.status(400).json({ error: "Invalid update id" });
  }
});

router.delete("/:id", requireAuth, checkRole("LEAD"), async (req, res) => {
  try {
    const result = await Update.findByIdAndDelete(req.params.id);

    if (!result) {
      return res.status(404).json({ error: "Update not found" });
    }

    return res.status(200).json(req.params.id);
  } catch (err) {
    return res.status(400).json({ error: "Invalid update id" });
  }
});

// POST /api/updates
router.post(
  "/",
  requireAuth,
  createUpdateLimiter,
  checkRole("LEAD", "MEMBER"),
  async (req, res) => {
    try {
      const { text, status, tags, visibility } = req.body;

      if (!text || !text.trim()) {
        return res
          .status(400)
          .json({ error: "text is required and cannot be empty" });
      }

      if (text.length > 1000) {
        return res
          .status(400)
          .json({ error: "text must be 1000 characters or fewer" });
      }

      if (!status || !STATUS_VALUES.includes(status)) {
        return res.status(400).json({
          error: `status is required and must be one of: ${STATUS_VALUES.join(", ")}`,
        });
      }

      if (visibility !== undefined && !VISIBILITY_VALUES.includes(visibility)) {
        return res.status(400).json({
          error: `visibility must be one of: ${VISIBILITY_VALUES.join(", ")}`,
        });
      }

      function normalizeTags(tags) {
        if (!Array.isArray(tags)) {
          return [];
        }

        return [
          ...new Set(
            tags
              .filter((tag) => typeof tag === "string" && tag.trim() !== "")
              .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, " ")),
          ),
        ];
      }

      const update = await Update.create({
        author: req.user.id,
        text: text.trim(),
        status,
        visibility: visibility || "team",
        tags: normalizeTags(tags),
      });

      const populated = await update.populate("author", "displayName email");

      return res.status(201).json({ update: populated });
    } catch (err) {
      return res.status(500).json({ error: "Failed to create update" });
    }
  },
);

// POST /api/updates/:id/reactions
router.post(
  "/:id/reactions",
  requireAuth,
  checkRole("LEAD", "MEMBER"),
  async (req, res) => {
    try {
      const { emoji } = req.body;

      if (!emoji || !emoji.trim()) {
        return res.status(400).json({ error: "emoji is required" });
      }

      if (emoji.length > 8) {
        return res
          .status(400)
          .json({ error: "emoji cannot exceed 8 characters" });
      }

      const update = await Update.findById(req.params.id);
      if (!update || !isVisibleToRequester(update, req.user)) {
        return res.status(404).json({ error: "Update not found" });
      }

      const alreadyReacted = update.reactions.some(
        (r) => r.user.toString() === req.user.id && r.emoji === emoji,
      );
      if (alreadyReacted) {
        return res
          .status(409)
          .json({ error: "You already reacted with that emoji" });
      }

      update.reactions.push({ emoji, user: req.user.id });
      await update.save();

      const populated = await update.populate([
        { path: "author", select: "displayName email" },
        { path: "reactions.user", select: "displayName email" },
      ]);

      return res.status(201).json({ update: populated });
    } catch (err) {
      return res.status(400).json({ error: "Invalid update id" });
    }
  },
);

// DELETE /api/updates/:id/reactions/:reactionId
router.delete(
  "/:id/reactions/:reactionId",
  requireAuth,
  checkRole("LEAD", "MEMBER"),
  async (req, res) => {
    try {
      const update = await Update.findById(req.params.id);
      if (!update || !isVisibleToRequester(update, req.user)) {
        return res.status(404).json({ error: "Update not found" });
      }

      const reaction = update.reactions.id(req.params.reactionId);
      if (!reaction) {
        return res.status(404).json({ error: "Reaction not found" });
      }

      if (reaction.user.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ error: "You can only remove your own reactions" });
      }

      reaction.deleteOne();
      await update.save();

      const populated = await update.populate([
        { path: "author", select: "displayName email" },
        { path: "reactions.user", select: "displayName email" },
      ]);

      return res.json({ update: populated });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: "Invalid update or reaction id" });
    }
  },
);

module.exports = router;
