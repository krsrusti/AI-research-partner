// Fetch wrapper that attaches the JWT (from auth.js) to every request,
// and normalizes error handling so callers don't each need their own
// try/catch + status-check boilerplate.

const BASE_URL = "http://localhost:8000";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getToken() {
  return localStorage.getItem("token");
}

/**
 * Parses a fetch Response into JSON, throwing ApiError with the backend's
 * `detail` message (FastAPI's standard error shape) if the request failed.
 * Centralized here so every caller gets consistent error messages instead
 * of each needing its own response.ok check.
 */
async function parseResponse(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body (e.g. empty 204 response) -- fine, body stays null.
  }

  if (!response.ok) {
    const message = body?.detail || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return body;
}

/** JSON requests (most of the API). */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return parseResponse(response);
}

/**
 * File upload requests (multipart/form-data), e.g. /papers/upload.
 * Deliberately does NOT set Content-Type -- the browser needs to set it
 * itself (including the multipart boundary), which only happens if we
 * leave it unset when passing a FormData body.
 */
export async function apiUpload(path, formData) {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  return parseResponse(response);
}

/**
 * Binary file requests (e.g. GET /papers/{id}/file). Iframes/embeds can't
 * attach an Authorization header themselves, so this fetches the PDF as a
 * blob first, then callers create an object URL from it to feed the
 * <iframe src>.
 */
export async function apiGetBlob(path) {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      detail = body?.detail || detail;
    } catch {
      // response wasn't JSON (likely was actually the file, or a plain error) -- keep the generic message
    }
    throw new ApiError(detail, response.status);
  }
  return response.blob();
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: "DELETE" }),
  upload: apiUpload,
  getBlob: apiGetBlob,
};