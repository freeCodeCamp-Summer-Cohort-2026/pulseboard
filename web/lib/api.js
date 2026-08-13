const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  // DELETE returns 204 and has no response body
  if (res.status === 204) {
    return null;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data && data.error
        ? data.error
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export function register({ email, password, displayName }) {
  return request("/api/auth/register", {
    method: "POST",
    body: { email, password, displayName },
  });
}

export function login({ email, password }) {
  return request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function listUpdates({ author, status, sort } = {}) {
  const params = new URLSearchParams();
  if (author) params.set("author", author);
  if (status) params.set("status", status);
  if (sort) params.set("sort", sort);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/updates${query}`);
}

export function createUpdate({ text, status }, token) {
  return request("/api/updates", {
    method: "POST",
    body: { text, status },
    token,
  });
}

export function editUpdate(updateId, { text, status }, token) {
  return request(`/api/updates/${updateId}`, {
    method: "PATCH",
    body: { text, status },
    token,
  });
}

export function deleteUpdate(updateId, token) {
  return request(`/api/updates/${updateId}`, {
    method: "DELETE",
    token,
  });
}

export function addReaction({ updateId, emoji }, token) {
  return request(`/api/updates/${updateId}/reactions`, {
    method: "POST",
    body: { emoji },
    token,
  });
}

export function removeReaction({ updateId, reactionId }, token) {
  return request(`/api/updates/${updateId}/reactions/${reactionId}`, {
    method: "DELETE",
    token,
  });
}
