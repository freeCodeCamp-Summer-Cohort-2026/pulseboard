"use client";

import { useState, useEffect } from "react";
import { createUpdate } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "on-track", label: "On track" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

export default function UpdateForm({ auth, onPosted }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("on-track");
  const [error, setError] = useState(null);
  const [messageQueue, setMessageQueue] = useState([]);

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
        { text: queuedMessage.text, status: queuedMessage.status },
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
    setText("");
    setStatus("on-track");

    try {
      const { update } = await createUpdate({ text, status }, auth.token);
      onPosted(update);
    } catch (err) {
      if (isNetworkError(err)) {
        setError("Failed to connect.");
        modifyQueue({
          id: text.concat(Math.round(Math.random() * 100)),
          text,
          status,
        });
      } else {
        setError(err.message);
      }
    }
  }

  return (
    <form className="update-form" onSubmit={handleSubmit}>
      <textarea
        placeholder="What's your status today?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        required
        disabled={isPosting}
      />
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
