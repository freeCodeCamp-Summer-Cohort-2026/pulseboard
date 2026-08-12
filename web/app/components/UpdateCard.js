"use client";

import { useEffect, useState } from "react";
import { addReaction, deleteUpdate, editUpdate, removeReaction } from "@/lib/api";

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

export function findUserReaction(reactions, userId, emoji) {
  return reactions.find(
    (reaction) => reaction.emoji === emoji && reaction.user?._id === userId
  );
}

export default function UpdateCard({ update, auth, onUpdated, onDeleted }) {
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(update.text);
  const [editStatus, setEditStatus] = useState(update.status);
  const [saving, setSaving] = useState(false);
  const reactionGroups = groupReactions(update.reactions || []);

  useEffect(() => {
    setEditText(update.text);
    setEditStatus(update.status);
  }, [update._id, update.text, update.status]);

  async function handleReactionToggle(emoji) {
    if (!auth) return;
    setError(null);

    const myReaction = findUserReaction(
      update.reactions || [],
      auth.user?._id,
      emoji
    );

    try {
      let updated;

      if (myReaction) {
        ({ update: updated } = await removeReaction(
          { updateId: update._id, reactionId: myReaction._id },
          auth.token
        ));
      } else {
        ({ update: updated } = await addReaction(
          { updateId: update._id, emoji },
          auth.token
        ));
      }

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

  function handleEditStart() {
    setEditText(update.text);
    setEditStatus(update.status);
    setError(null);
    setIsEditing(true);
  }

  async function handleEditSave() {
    if (!auth) return;

    setError(null);
    setSaving(true);

    try {
      const { update: updated } = await editUpdate(
        update._id,
        {
          text: editText,
          status: editStatus,
        },
        auth.token
      );

      onUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
        {isEditing ? (
          <div className="edit-field">
            <label htmlFor="edit-update-status">Status</label>
            <select
              id="edit-update-status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            >
              <option value="on-track">On track</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
        ) : (
          <span className={`status-badge status-${update.status}`}>
            {STATUS_LABELS[update.status] || update.status}
          </span>
        )}
      </header>
      {isEditing ? (
        <div className="edit-form">
          <label htmlFor="edit-update-text">Update text</label>
          <textarea
            id="edit-update-text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
        </div>
      ) : (
        <p className="update-text">{update.text}</p>
      )}
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
              REACTION_OPTIONS.map((emoji) => {
                const myReaction = findUserReaction(
                  update.reactions || [],
                  auth.user?._id,
                  emoji
                );
                return (
                  <button
                    key={emoji}
                    type="button"
                    className="reaction-button"
                    aria-pressed={Boolean(myReaction)}
                    onClick={() => handleReactionToggle(emoji)}
                  >
                    {emoji}
                  </button>
                );
              })}
          </div>
          {isEditing ? (
            <div className="edit-actions">
              <button
                type="button"
                className="save-btn"
                onClick={handleEditSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              {auth?.user?._id === update.author?._id && (
                <button
                  type="button"
                  className="edit-btn"
                  onClick={handleEditStart}
                >
                  Edit
                </button>
              )}
              {auth?.user?.role === "LEAD" && (
                <button
                  className="delete-btn"
                  type="button"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </footer>
      {error && <p className="error">{error}</p>}
    </article>
  );
}