const mongoose = require("mongoose");

const STATUS_VALUES = ["on-track", "blocked", "done"];

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, _id: true },
);

const updateSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

updateSchema.index({ createdAt: -1 });
updateSchema.index({ author: 1 });
updateSchema.index({ status: 1 });

module.exports = mongoose.model("Update", updateSchema);
module.exports.STATUS_VALUES = STATUS_VALUES;
