"use client";

import { useState, useEffect } from "react";
import { createUpdate } from "@/lib/api";

import { getDraft, saveDraft, clearDraft } from "@/lib/draft";

const STATUS_OPTIONS = [
  { value: "on-track", label: "On track" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

export default function UpdateForm({ auth, onPosted }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("on-track");
  const [error, setError] = useState(null);
  const [charCount, setCharCount] = useState(0);
  const [tagText, setTagText] = useState("");
  const [tags, setTags] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [messageQueue, setMessageQueue] = useState([]);

  useEffect(() => {
    if (!auth) return;
    const draft = getDraft(auth.user._id);
    if (draft) {
      setText(draft.text ?? "");
      setStatus(draft.status ?? "on-track");
    }
  }, [auth?.user?._id]);

  useEffect(() => {
    saveDraft(auth?.user?._id, { text, status });
  }, [text, status]);

  useEffect(() => {
    const queue = localStorage.getItem("queuedMessages");
    if (queue) {
      setMessageQueue(JSON.parse(queue));
    }
  }, []);

  useEffect(() => {
    const reconnectInterval = setInterval(() => {
      if (navigator.onLine && messageQueue.length > 0) {
        const oldestQueuedMessage = messageQueue[0];
        retrySending(oldestQueuedMessage);
      }
    }, 3000);

    return () => clearInterval(reconnectInterval);
  }, [messageQueue]);

  function modifyQueue(message) {
    const newQueue = messageQueue.includes(message)
      ? messageQueue.filter((msg) => msg.id !== message.id)
      : [...messageQueue, message];
    setMessageQueue(newQueue);
    localStorage.setItem("queuedMessages", JSON.stringify(newQueue));
  }

  if (!auth) {
    return <p className="hint">Log in to post a status update.</p>;
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const tag = tagText.trim().toLowerCase().replace(/\s+/g, " ");
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag]);
        setTagText("");
      } else {
        setTagText("");
      }
    }
  }

  function isNetworkError(error) {
    const NETWORK_ERROR_MESSAGES = ["networkerror", "failed to fetch"]; // checks against errors displayed by Firefox and Chrome/Opera
    const lowerCaseMsg = error.message.toLowerCase();
    return NETWORK_ERROR_MESSAGES.some((exampleError) =>
      lowerCaseMsg.includes(exampleError),
    );
  }

  async function retrySending(queuedMessage) {
    try {
      const { update } = await createUpdate(
        {
          text: queuedMessage.text,
          status: queuedMessage.status,
          tags: queuedMessage.tags,
        },
        auth.token,
      );
      modifyQueue(queuedMessage);
      onPosted(update);
      setError(null);
    } catch (error) {
      if (isNetworkError(error)) {
        setError("Failed to connect.");
      } else {
        setError(error.message);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsPosting(true);
    setText("");
    setCharCount(0);
    setStatus("on-track");

    try {
      const { update } = await createUpdate({ text, status, tags }, auth.token);
      onPosted(update);
      clearDraft(auth.user._id);
    } catch (err) {
      if (isNetworkError(err)) {
        setError("Failed to connect.");
        modifyQueue({
          id: text.concat(Math.round(Math.random() * 100)),
          text,
          status,
          tags,
        });
      } else {
        setError(err.message);
      }
    } finally {
      setIsPosting(false);
      setTags([]);
    }
  }

  return (
    <form className="update-form" onSubmit={handleSubmit}>
      <textarea
        placeholder="What's your status today?"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setCharCount(e.target.value.length);
        }}
        maxLength={1000}
        required
        disabled={isPosting}
      />
      <label>{charCount}/1000</label>
      <div className="tags-input-container">
        {tags?.map((tag) => {
          return (
            <div className="tags-pill" key={tag}>
              <span className="tag-name">{tag}</span>
              <span
                className="remove-tag"
                onClick={(e) => setTags(tags.filter((t) => t !== tag))}
              >
                &times;
              </span>
            </div>
          );
        })}
        <input
          type="text"
          className="tag-input"
          placeholder="Type a tag and press Enter"
          value={tagText}
          onChange={(e) => setTagText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="update-form-row">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={isPosting}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isPosting}>
          {isPosting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Posting...
            </>
          ) : (
            "Post update"
          )}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {messageQueue.length > 0 && (
        <p className="hint">
          Waiting for connection. Queued messages: {messageQueue.length}
        </p>
      )}
    </form>
  );
}
