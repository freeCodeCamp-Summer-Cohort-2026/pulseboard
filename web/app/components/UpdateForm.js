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
  const [isPosting, setIsPosting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  if (!auth) {
    return <p className="hint">Log in to post a status update.</p>;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsPosting(true);

    try {
      const { update } = await createUpdate({ text, status }, auth.token);
      setText("");
      setCharCount(0);
      setStatus("on-track");
      onPosted(update);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <form className="update-form" onSubmit={handleSubmit}>
      <textarea
        placeholder="What's your status today?"
        value={text}
        onChange={(e) => {setText(e.target.value)
                setCharCount(e.target.value.length)}}
        maxLength={1000}
        required
        disabled={isPosting}
      />
        <label>{charCount}/1000</label>
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
    </form>
  );
}



