/**
 * Retrieves the draft for a user
 * @param {string} userId
 * @returns {object | null}
 */
export function getDraft(userId) {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`updateDraft:${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Saves the draft for a user
 * @param {string} userId
 * @param {object} draft
 * @returns {object | null}
 */
export function saveDraft(userId, draft) {
  if (!userId || typeof window === "undefined") return null;
  try {
    window.localStorage.setItem(`updateDraft:${userId}`, JSON.stringify(draft));
    return draft;
  } catch {
    return null;
  }
}

/**
 * Clears the draft for a user
 * @param {string} userId
 * @returns {null}
 */
export function clearDraft(userId) {
  if (!userId || typeof window === "undefined") return null;
  try {
    window.localStorage.removeItem(`updateDraft:${userId}`);
    return null;
  } catch {
    return null;
  }
}
