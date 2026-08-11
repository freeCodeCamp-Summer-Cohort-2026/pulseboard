"use client";

import { useState } from "react";
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    // NOTE: no loading state here yet while the request is in flight -
    // see the "add a loading state to the update form" issue.
    try {
      const { update } = await createUpdate({ text, status }, auth.token);
      setText("");
      setStatus("on-track");
      onPosted(update);
    } catch (err) {
      if (isNetworkError(err)) {
        setError(
          `Failed to connect. The message will be sent when the connection is reestablished.`,
        );
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
      />
      <div className="update-form-row">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button type="submit">Post update</button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
