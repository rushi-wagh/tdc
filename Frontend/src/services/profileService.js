import { buildQueryString, request } from "./apiClient.js";

export const getDashboardProfiles = async (params) => {
  const payload = await request(`/profiles/dashboard${buildQueryString(params)}`);
  return {
    profiles: payload.data || [],
    pagination: payload.pagination || null,
  };
};

export const getProfileDetails = async (profileId) => {
  const payload = await request(`/profiles/${encodeURIComponent(profileId)}`);
  return payload.data;
};

export const getProfileNotes = async (profileId) => {
  const payload = await request(`/profiles/${encodeURIComponent(profileId)}/notes`);
  return payload.data || [];
};

export const createProfileNote = async (profileId, note) => {
  const payload = await request(`/profiles/${encodeURIComponent(profileId)}/notes`, {
    method: "POST",
    body: JSON.stringify(note),
  });
  return payload.data;
};
