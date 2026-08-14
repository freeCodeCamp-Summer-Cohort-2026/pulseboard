"use client";

import { useEffect, useMemo, useState } from "react";
import { listUpdates } from "@/lib/api";
import UpdateCard from "./UpdateCard";

const STATUS_OPTIONS = ["on-track", "blocked", "done"];

export default function Feed({ auth, refreshToken, socket }) {
  const [updates, setUpdates] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  //* Attach and detach event handlers for websocket (if initialized)
  useEffect(() => {
    if (!socket) return;

    socket.on("POST:update", handleRcvdUpdate);
    socket.on("POST:reaction", handleRcvdReaction);

    return () => {
      socket.off("POST:update", handleRcvdUpdate);
      socket.off("POST:reaction", handleRcvdReaction);
    }
  }, [socket]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listUpdates({
      status: statusFilter || undefined,
      author: authorFilter || undefined,
    })
      .then(({ updates: fetched }) => {
        if (!cancelled) setUpdates(fetched);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, authorFilter, refreshToken]);

  const authors = useMemo(() => {
    const map = new Map();
    for (const u of updates) {
      if (u.author?._id) map.set(u.author._id, u.author.displayName);
    }
    return Array.from(map.entries());
  }, [updates]);

  //* Handler for incoming POST:update event on websocket
  function handleRcvdUpdate(update) {
    setUpdates((prev) => {
      //? If update already exists because current user posted it, then don't handle websocket response
      if (prev.some((u) => u._id === update._id)) return prev;
      return [update, ...prev];
    });
  }

  //* Handler for incoming POST:reaction event on websocket
  //? Reaction isn't duplicated because duplicates are filtered out already in backend logic
  function handleRcvdReaction({ updateId, reaction }) {
    setUpdates((prev) => prev.map(
      (u) => u._id === updateId
        ? { ...u, reactions: [...(u.reactions || []), reaction] }
        : u
    ));
  }

  function handleUpdated(updated) {
    setUpdates((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
  }

  return (
    <div className="feed">
      <div className="filter-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}>
          <option value="">All authors</option>
          {authors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="hint">Loading feed...</p>}
      {!loading && updates.length === 0 && <p className="hint">No updates yet.</p>}

      <div className="update-list">
        {updates.map((update) => (
          <UpdateCard key={update._id} update={update} auth={auth} onUpdated={handleUpdated} />
        ))}
      </div>
    </div>
  );
}
