// TODO: login(email, password), register(email, password), logout(), getToken()
// Login/register/logout + token storage. Thin wrapper around the auth
// endpoints in api.js -- pages call these rather than hitting api.js
// directly, so token storage stays in one place.

import { api } from "./api";

const TOKEN_KEY = "token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(email, password) {
  const { access_token } = await api.post("/auth/login", { email, password });
  localStorage.setItem(TOKEN_KEY, access_token);
  return access_token;
}

export async function register(email, password) {
  const { access_token } = await api.post("/auth/register", { email, password });
  localStorage.setItem(TOKEN_KEY, access_token);
  return access_token;
}

export async function getCurrentUser() {
  return api.get("/auth/me");
}