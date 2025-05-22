import { api } from './api';

export const submitReaction = (externalId, reactionType) => {
  return api.post(`/movies/reactions/tmdb/${externalId}`, {
    reaction: reactionType
  });
};

export const getMovieDetails = (externalId) => {
  return api.get(`/movies/details/tmdb/${externalId}`);
};