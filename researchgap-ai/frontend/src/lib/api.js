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

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: "DELETE" }),
  upload: apiUpload,
};