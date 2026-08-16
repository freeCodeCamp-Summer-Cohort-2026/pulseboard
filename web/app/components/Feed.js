"use client";

import { useEffect, useMemo, useState } from "react";
import { listUpdates } from "@/lib/api";
import UpdateCard from "./UpdateCard";

const STATUS_OPTIONS = ["on-track", "blocked", "done"];

export default function Feed({ auth, refreshToken }) {
  const [updates, setUpdates] = useState([]);
  const [allUpdates, setAllUpdates] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 10;
  const [showMyUpdates, setShowMyUpdates] = useState(false);
  const [showJumpToTop, setShowJumpToTop] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setShowJumpToTop(window.scrollY > window.innerHeight);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
  let cancelled = false;

  setLoading(true);
  setPage(1);

  listUpdates({
    status: statusFilter || undefined,
    author: authorFilter || undefined,
    sort: sortOrder,
    page: 1,
    limit: LIMIT,
  })
    .then(({ updates: fetched, pagination }) => {
      if (!cancelled) {
        setUpdates(fetched);
        setHasNextPage(pagination.hasNextPage);
      }
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
}, [statusFilter, authorFilter, sortOrder, refreshToken]);

async function loadMore() {
  if (loadingMore || !hasNextPage) return;

  setLoadingMore(true);
  setError(null);

  try {
    const nextPage = page + 1;

    const { updates: fetched, pagination } = await listUpdates({
      status: statusFilter || undefined,
      author: authorFilter || undefined,
      tag: tagFilter || undefined,
      sort: sortOrder,

      page: nextPage,
      limit: LIMIT,
    });

    setUpdates((prev) => [...prev, ...fetched]);
    setPage(nextPage);
    setHasNextPage(pagination.hasNextPage);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoadingMore(false);
  }
}


  const authors = useMemo(() => {
    const map = new Map();

    for (const u of allUpdates) {
      if (u.author?._id) {
        map.set(u.author._id, u.author.displayName);
      }
    }
    return Array.from(map.entries());
  }, [allUpdates]);

  const tags = useMemo(() => {
    const tagsArray = [];
    for (const u of updates) {
      tagsArray.push(...(u.tags ?? []));
    }
    return [...new Set(tagsArray)];
  }, [updates]);

  function handleUpdated(updated) {
    setUpdates((prev) =>
      prev.map((u) => (u._id === updated._id ? updated : u)),
    );
  }

  function handleDeleted(deleteId) {
    setUpdates((prev) => prev.filter((update) => update._id !== deleteId));
  }

  function handleJumpToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleShowMyUpdates() {
    try {
      setShowMyUpdates(!showMyUpdates);
      if (!showMyUpdates) {
        setAuthorFilter(auth ? auth.user._id : "");
      } else {
        setAuthorFilter("");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="feed">
      <div className="filter-bar">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
        >
          <option value="">All authors</option>
          {authors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {auth && (
          <div>
            <input
              id="show-updates-checkbox"
              type="checkbox"
              checked={showMyUpdates}
              onChange={handleShowMyUpdates}
            />
            <label htmlFor="show-updates-checkbox">Show My Updates</label>
          </div>
        )}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="most-reactions">Most reactions</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="hint">Loading feed...</p>}
      {!loading && updates.length === 0 && (
        statusFilter || authorFilter || tagFilter ? (
          <div>
            <p className="hint">No updates match your filters.</p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("");
                setAuthorFilter("");
                setTagFilter("");
                setShowMyUpdates(false);
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <p className="hint">No updates yet.</p>
        )
      )}

      <div className="update-list">
<div className="update-list">
  {updates.map((update) => (
    <UpdateCard
      key={update._id}
      update={update}
      auth={auth}
      onUpdated={handleUpdated}
      onDeleted={handleDeleted}
    />
  ))}
</div>

{hasNextPage && (
  <button onClick={loadMore} disabled={loadingMore}>
    {loadingMore ? "Loading..." : "Load more"}
  </button>
)}

{showJumpToTop && (
  <button
    type="button"
    className="jump-to-top"
    onClick={handleJumpToTop}
    aria-label="Jump to top"
  >
    ↑ Top
  </button>
)}
    </div>
  );
}
