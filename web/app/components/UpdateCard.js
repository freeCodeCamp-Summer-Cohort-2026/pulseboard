"use client";

import { useEffect, useState } from "react";
import { addReaction, deleteUpdate } from "@/lib/api";

// Starter emoji set - deliberately small. See the "add a reaction emoji
// option" good-first-issue for extending this.
const REACTION_OPTIONS = ["👍", "🎉", "❤️", "🚀"];

const STATUS_LABELS = {
  "on-track": "On track",
  blocked: "Blocked",
  done: "Done",
};

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function formatRelativeTime(createdAt, now = Date.now()) {
  const createdDate = new Date(createdAt);
  const createdTime = createdDate.getTime();
  const elapsedTime = Math.max(0, now - createdTime);

  if (elapsedTime < MS_PER_MINUTE) {
    return "just now";
  }

  const minutes = Math.floor(elapsedTime / MS_PER_MINUTE);

  if (minutes < 60) {
    return minutes === 1 ? `${minutes} minute ago` : `${minutes} minutes ago`;
  }

  const hours = Math.floor(elapsedTime / MS_PER_HOUR);

  if (hours < 24) {
    return hours === 1 ? `${hours} hour ago` : `${hours} hours ago`;
  }

  const days = Math.floor(elapsedTime / MS_PER_DAY);

  if (days < 7) {
    return days === 1 ? `${days} day ago` : `${days} days ago`;
  }

  return createdDate.toLocaleString();
}

export function groupReactions(reactions) {
  const groups = {};
  for (const reaction of reactions) {
    groups[reaction.emoji] = (groups[reaction.emoji] || 0) + 1;
  }
  return groups;
}

export default function UpdateCard({ update, auth, onUpdated, onDeleted }) {
  const [error, setError] = useState(null);
  const reactionGroups = groupReactions(update.reactions || []);

  async function handleReact(emoji) {
    if (!auth) return;
    setError(null);
    try {
      const { update: updated } = await addReaction(
        { updateId: update._id, emoji },
        auth.token,
      );
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!auth) return;

    setError(null);

    const deleteId = update._id;

    try {
      const deletedId = await deleteUpdate(deleteId, auth.token);
      if (!deletedId) {
        setError("Failed to delete the update. Please try again.");
      }

      onDeleted(deleteId);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <article className="update-card">
      <header>
        <div>
          <span className="author">
            {update.author?.displayName || "Unknown"}
          </span>
        </div>
        <span className={`status-badge status-${update.status}`}>
          {STATUS_LABELS[update.status] || update.status}
        </span>
      </header>
      <p className="update-text">{update.text}</p>
      <footer>
        <time dateTime={update.createdAt}>
          {formatRelativeTime(update.createdAt)}
        </time>
        <div className="update-actions">
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
          {auth?.user?.role === "LEAD" && (
            <button className="delete-btn" type="button" onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>
      </footer>
      {error && <p className="error">{error}</p>}
    </article>
  );
}
