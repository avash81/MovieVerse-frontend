import { api } from './api';

// Note: Ensure 'api' is an Axios instance configured with the correct base URL (e.g., http://localhost:5001/api)

export const submitReaction = (externalId, reactionType) => {
  return api.post(`/movies/reactions/tmdb/${externalId}`, {
    reaction: reactionType
  });
};

export const getMovieDetails = (externalId) => {
  return api.get(`/movies/details/tmdb/${externalId}`);
};