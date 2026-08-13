const express = require("express");
const Update = require("../models/Update");
const { STATUS_VALUES } = require("../models/Update");
const rateLimit = require("express-rate-limit");
const { requireAuth, checkRole } = require("../middleware/auth");
const SORT_VALUES = ["newest", "oldest", "most-reactions"];

const router = express.Router();

const createUpdateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many updates posted. Please wait a minute before posting again." },
  keyGenerator: (req) => req.user?.id,
});

// GET /api/updates?author=<userId>&status=<on-track|blocked|done>&sort=<newest|oldest|most-reactions>
router.get("/", async (req, res) => {
  try {
    const { author, status, sort } = req.query;
    const filter = {};

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

    if (sort === "most-reactions") {
      updates.sort((a, b) => b.reactions.length - a.reactions.length);
    }

    return res.json({ updates });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch updates" });
  }
});

// GET /api/updates/:id
router.get("/:id", async (req, res) => {
  try {
    const update = await Update.findById(req.params.id)
      .populate("author", "displayName email")
      .populate("reactions.user", "displayName email");

    if (!update) {
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
router.post("/", requireAuth, createUpdateLimiter, checkRole("LEAD", "MEMBER"), async (req, res) => {
  try {
    const { text, status } = req.body;

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ error: "text is required and cannot be empty" });
    }

    if (!status || !STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        error: `status is required and must be one of: ${STATUS_VALUES.join(", ")}`,
      });
    }

    const update = await Update.create({
      author: req.user.id,
      text: text.trim(),
      status,
    });

    const populated = await update.populate("author", "displayName email");

    return res.status(201).json({ update: populated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create update" });
  }
});

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

      const update = await Update.findById(req.params.id);
      if (!update) {
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
      if (!update) {
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
      return res.status(400).json({ error: "Invalid update or reaction id" });
    }
  },
);

module.exports = router;
