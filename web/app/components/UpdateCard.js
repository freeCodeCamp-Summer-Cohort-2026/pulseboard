"use client";

import { useState } from "react";
import { addReaction } from "@/lib/api";

// Starter emoji set - deliberately small. See the "add a reaction emoji
// option" good-first-issue for extending this.
const REACTION_OPTIONS = ["👍", "🎉", "❤️", "🚀"];

const STATUS_LABELS = {
  "on-track": "On track",
  blocked: "Blocked",
  done: "Done",
};

export function groupReactions(reactions) {
  const groups = {};
  for (const reaction of reactions) {
    groups[reaction.emoji] = (groups[reaction.emoji] || 0) + 1;
  }
  return groups;
}

export default function UpdateCard({ update, auth, onUpdated }) {
  const [error, setError] = useState(null);
  const reactionGroups = groupReactions(update.reactions || []);

  async function handleReact(emoji) {
    if (!auth) return;
    setError(null);
    try {
      const { update: updated } = await addReaction(
        { updateId: update._id, emoji },
        auth.token
      );
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <article className="update-card">
      <header>
        <span className="author">{update.author?.displayName || "Unknown"}</span>
        <span className={`status-badge status-${update.status}`}>
          {STATUS_LABELS[update.status] || update.status}
        </span>
      </header>
      <p className="update-text">{update.text}</p>
      <footer>
        <time>{new Date(update.createdAt).toLocaleString()}</time>
        <div className="reactions">
          {Object.entries(reactionGroups).map(([emoji, count]) => (
            <span key={emoji} className="reaction-count">
              {emoji} {count}
            </span>
          ))}
          {auth &&
            REACTION_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="reaction-button"
                onClick={() => handleReact(emoji)}
              >
                {emoji}
              </button>
            ))}
        </div>
      </footer>
      {error && <p className="error">{error}</p>}
    </article>
  );
}
