import { buildQueryString, request } from "./apiClient.js";

export const getSuggestions = async (profileId, params = {}) => {
  const payload = await request(
    `/matches/${encodeURIComponent(profileId)}/suggestions${buildQueryString(params)}`,
  );
  return {
    recommendations: payload.data || [],
    meta: payload.meta || null,
  };
};

export const getCandidateExplanation = async (profileId, candidateProfileId) => {
  const payload = await request(
    `/matches/${encodeURIComponent(profileId)}/suggestions/${encodeURIComponent(candidateProfileId)}/explanation`,
  );
  return payload.data;
};
