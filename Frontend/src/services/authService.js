import { request } from "./apiClient.js";

export const login = async ({ email, password }) => {
  const payload = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return payload.data.user;
};
