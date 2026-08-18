"use client";

import { useEffect, useMemo, useState } from "react";
import { listUpdates } from "@/lib/api";
import UpdateCard from "./UpdateCard";

const STATUS_OPTIONS = ["on-track", "blocked", "done"];

export default function Feed({ auth, refreshToken, socket }) {
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

  // Jump-to-top button
  useEffect(() => {
    function handleScroll() {
      setShowJumpToTop(window.scrollY > window.innerHeight);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Load the current feed
  //* Attach and detach event handlers for websocket (if initialized)
  useEffect(() => {
    if (!socket) return;

    socket.on("POST:update", handleRcvdUpdate);
    socket.on("POST:reaction", handleRcvdReaction);

    return () => {
      socket.off("POST:update", handleRcvdUpdate);
      socket.off("POST:reaction", handleRcvdReaction);
    };
  }, [socket]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setPage(1);
    setError(null);

    const filters = {
      status: statusFilter || undefined,
      author: authorFilter || undefined,
      sort: sortOrder,
    };

    
    if (tagFilter) {
      filters.tag = tagFilter;
    }

    listUpdates(filters)
      .then(({ updates: fetched = [], pagination }) => {
        if (cancelled) return;

        setUpdates(fetched);
        setHasNextPage(pagination?.hasNextPage ?? false);

        if (!statusFilter && !authorFilter && !tagFilter) {
          setAllUpdates(fetched);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    statusFilter,
    authorFilter,
    tagFilter,
    sortOrder,
    refreshToken,
  ]);

  useEffect(() => {
    let cancelled = false;

    listUpdates()
      .then(({ updates: fetched = [] }) => {
        if (!cancelled) {
          setAllUpdates(fetched);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  // Load next page
  async function loadMore() {
    if (loadingMore || !hasNextPage) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const nextPage = page + 1;

      const params = {
        status: statusFilter || undefined,
        author: authorFilter || undefined,
        sort: sortOrder,
        page: nextPage,
        limit: LIMIT,
      };

      if (tagFilter) {
        params.tag = tagFilter;
      }

      const {
        updates: fetched = [],
        pagination,
      } = await listUpdates(params);

      setUpdates((prev) => [...prev, ...fetched]);
      setPage(nextPage);
      setHasNextPage(pagination?.hasNextPage ?? false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  const authors = useMemo(() => {
    const map = new Map();

    for (const update of allUpdates) {
      if (update.author?._id) {
        map.set(
          update.author._id,
          update.author.displayName,
        );
      }
    }

    return Array.from(map.entries());
  }, [allUpdates]);

  const tags = useMemo(() => {
    const tagsArray = [];

    for (const update of allUpdates) {
      tagsArray.push(...(update.tags ?? []));
    }

    return [...new Set(tagsArray)];
  }, [allUpdates]);

  //* Handler for incoming POST:update event on websocket
  function handleRcvdUpdate(update) {
    setAllUpdates((prev) => {
      //? If update already exists because current user posted it, then don't handle websocket response
      if (prev.some((u) => u._id === update._id)) return prev;
      return [update, ...prev];
    });
  }

  //* Handler for incoming POST:reaction event on websocket
  //? Reaction isn't duplicated because duplicates are filtered out already in backend logic
  function handleRcvdReaction({ updateId, reaction }) {
    setAllUpdates((prev) =>
      prev.map((u) =>
        u._id === updateId
          ? { ...u, reactions: [...(u.reactions || []), reaction] }
          : u,
      ),
    );
  }

  function handleUpdated(updated) {
    setUpdates((prev) =>
      prev.map((update) =>
        update._id === updated._id ? updated : update,
      ),
    );

    setAllUpdates((prev) =>
      prev.map((update) =>
        update._id === updated._id ? updated : update,
      ),
    );
  }

  function handleDeleted(deleteId) {
    setUpdates((prev) =>
      prev.filter((update) => update._id !== deleteId),
    );

    setAllUpdates((prev) =>
      prev.filter((update) => update._id !== deleteId),
    );
  }

  function handleJumpToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
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

          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
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

            <label htmlFor="show-updates-checkbox">
              Show My Updates
            </label>
          </div>
        )}

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="most-reactions">
            Most reactions
          </option>
        </select>
      </div>

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {loading && (
        <p className="hint">
          Loading feed...
        </p>
      )}

      {!loading && updates.length === 0 && (
        statusFilter || authorFilter || tagFilter ? (
          <div>
            <p className="hint">
              No updates match your filters.
            </p>

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
          <p className="hint">
            No updates yet.
          </p>
        )
      )}

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
        <button
          onClick={loadMore}
          disabled={loadingMore}
        >
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