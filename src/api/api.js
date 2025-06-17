import axios from 'axios';

// Use import.meta.env for Vite environment variables
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'development' ? '/api' : 'https://movieverse-backend.onrender.com/api');
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'YOUR_TMDB_API_KEY'; // Replace with a valid key
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyDMluPPr-DRnOF091qgodYbY-je2jMfar0';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Rate limiting delay (250ms between requests to stay under 40 requests per 10 seconds for TMDb)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let lastTmdbRequestTime = 0;

const rateLimitedRequest = async (requestFn) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastTmdbRequestTime;
  const minDelay = 250;
  if (timeSinceLastRequest < minDelay) {
    await delay(minDelay - timeSinceLastRequest);
  }
  lastTmdbRequestTime = Date.now();
  return requestFn();
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

// Fetch trailer from TMDb API with official priority
export const fetchTmdbTrailer = async (movieId, movieTitle, releaseYear) => {
  console.log('Fetching TMDb trailer for movieId:', movieId);
  return rateLimitedRequest(async () => {
    try {
      const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}/videos`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'en-US',
        },
        timeout: 15000,
      });
      console.log('TMDb API Response (videos):', response.data);
      const videos = response.data.results || [];
      
      // Prioritize official trailers from TMDb
      let officialTrailer = videos.find(video => video.official && video.type === 'Trailer' && video.site === 'YouTube');
      if (!officialTrailer) {
        // Fallback to first trailer if no official one is found
        officialTrailer = videos.find(video => video.type === 'Trailer' && video.site === 'YouTube');
        if (officialTrailer) {
          console.warn(`No official trailer found for ${movieTitle} (${movieId}). Using first available trailer: ${officialTrailer.key}`);
        }
      }

      if (officialTrailer) {
        console.log('Found TMDb trailer:', `https://www.youtube.com/watch?v=${officialTrailer.key}`);
        return `https://www.youtube.com/watch?v=${officialTrailer.key}`;
      }
      console.log('No trailer found from TMDb for movieId:', movieId);
      if (movieTitle && releaseYear) {
        console.log('Falling back to YouTube API for official trailer...');
        const youtubeTrailer = await fetchYouTubeTrailer(movieTitle, releaseYear);
        return youtubeTrailer;
      }
      return null;
    } catch (err) {
      console.error('Error fetching TMDb trailer:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      if (err.response?.status === 401) {
        console.error('TMDb API key is invalid or revoked. Please update VITE_TMDB_API_KEY in your .env file.');
      }
      if (movieTitle && releaseYear) {
        console.log('Falling back to YouTube API for trailer due to TMDb error...');
        const youtubeTrailer = await fetchYouTubeTrailer(movieTitle, releaseYear);
        return youtubeTrailer;
      }
      return null;
    }
  });
};

// Fetch trailer from YouTube API with official channel filter
export const fetchYouTubeTrailer = async (movieTitle, releaseYear) => {
  console.log('Fetching YouTube trailer for movie:', movieTitle, 'Year:', releaseYear);
  try {
    if (!movieTitle || !releaseYear) {
      console.error('Movie title or release year is missing for YouTube trailer fetch.');
      return null;
    }
    const searchQuery = `${movieTitle} ${releaseYear} official trailer`;
    const response = await axios.get(`${YOUTUBE_BASE_URL}/search`, {
      params: {
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: 5,
        key: YOUTUBE_API_KEY,
      },
      timeout: 15000,
    });
    console.log('YouTube API Response:', response.data);
    const items = response.data.items || [];

    // Filter for official channels
    const officialChannels = ['UCi8e0iOVk1fEOogdfu4YgfA', 'UCq0OueAsdxH6b8nyAspwViw'];
    let officialTrailer = items.find(item => 
      officialChannels.includes(item.snippet.channelId) && 
      item.snippet.title.toLowerCase().includes('official trailer')
    );
    if (!officialTrailer) {
      officialTrailer = items[0];
      if (officialTrailer) {
        console.warn(`No official trailer found on YouTube for ${movieTitle}. Using first result: ${officialTrailer.snippet.title}`);
      }
    }

    if (officialTrailer) {
      console.log('Found YouTube trailer:', `https://www.youtube.com/watch?v=${officialTrailer.id.videoId}`);
      return `https://www.youtube.com/watch?v=${officialTrailer.id.videoId}`;
    }
    console.log('No trailer found on YouTube for movie:', movieTitle);
    return null;
  } catch (err) {
    console.error('Error fetching YouTube trailer:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    return null;
  }
};

// Fetch screenshots from TMDb API
export const fetchTmdbScreenshots = async (movieId) => {
  console.log('Fetching TMDb screenshots for movieId:', movieId);
  return rateLimitedRequest(async () => {
    try {
      const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}/images`, {
        params: {
          api_key: TMDB_API_KEY,
        },
        timeout: 15000,
      });
      console.log('TMDb API Response (images):', response.data);
      const screenshots = response.data.backdrops.slice(0, 2).map(backdrop => `https://image.tmdb.org/t/p/w500${backdrop.file_path}`);
      return screenshots.length > 0 ? screenshots : null;
    } catch (err) {
      console.error('Error fetching TMDb screenshots:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      if (err.response?.status === 401) {
        console.error('TMDb API key is invalid or revoked. Please update VITE_TMDB_API_KEY in your .env file.');
      }
      return null;
    }
  });
};

export const getCategory = async (categoryId) => {
  console.log('API Request: /movies/categories/' + categoryId, getAuthHeaders());
  try {
    const response = await axios.get(`${API_URL}/movies/categories/${categoryId}`, {
      headers: getAuthHeaders(),
      timeout: 15000,
    });
    console.log('API Response: /movies/categories/' + categoryId, {
      status: response.status,
      data: response.data,
      headers: response.headers,
    });
    const data = Array.isArray(response.data) ? response.data : 
                 response.data.data ? response.data.data : 
                 response.data.success === false ? [] : [];
    if (response.data.success === false || !data.length) {
      throw new Error(response.data.message || 'No data available for this category');
    }
    return { data };
  } catch (err) {
    console.error('Error fetching category:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers,
    });
    return { data: [], error: err.message || 'Failed to load category' };
  }
};

export const getMovieDetails = async (source, externalId) => {
  console.log('API Request: /movies/details/' + source + '/' + externalId, getAuthHeaders());
  try {
    const response = await axios.get(`${API_URL}/movies/details/${source}/${externalId}`, {
      headers: getAuthHeaders(),
      timeout: 15000,
    });
    console.log('API Response: /movies/details/' + source + '/' + externalId, response.data);
    return response;
  } catch (err) {
    console.error('Error fetching movie details:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
};

export const submitReview = async (source, externalId, reviewData) => {
  console.log('API Request: /reviews/' + source + '/' + externalId, reviewData);
  try {
    const response = await axios.post(
      `${API_URL}/reviews/${source}/${externalId}`,
      {
        text: reviewData.text,
        name: reviewData.name,
        email: reviewData.email,
        rating: reviewData.rating,
      },
      { headers: getAuthHeaders() }
    );
    console.log('API Response: /reviews/' + source + '/' + externalId, response.data);
    if (response.data.success === false) {
      throw new Error(response.data.message || 'Failed to submit review');
    }
    if (response.data.error) {
      throw new Error(response.data.error || 'Server error during review submission');
    }
    return response;
  } catch (err) {
    console.error('Error submitting review:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
};

export const getReviews = async (source, externalId) => {
  console.log('API Request: /reviews/' + source + '/' + externalId, getAuthHeaders());
  try {
    const response = await axios.get(`${API_URL}/reviews/${source}/${externalId}`, {
      headers: getAuthHeaders(),
      timeout: 15000,
    });
    console.log('API Response: /reviews/' + source + '/' + externalId, response.data);
    return response;
  } catch (err) {
    console.error('Error fetching reviews:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
};

export const submitReply = async (source, externalId, reviewId, replyData) => {
  console.log('API Request: /reviews/' + source + '/' + externalId + '/reply/' + reviewId, replyData);
  try {
    const response = await axios.post(
      `${API_URL}/reviews/${source}/${externalId}/reply/${reviewId}`,
      {
        text: replyData.text,
        name: replyData.name,
        email: replyData.email,
      },
      { headers: getAuthHeaders() }
    );
    console.log('API Response: /reviews/' + source + '/' + externalId + '/reply/' + reviewId, response.data);
    if (response.data.success === false) {
      throw new Error(response.data.message || 'Failed to submit reply');
    }
    return { data: response.data.data || response.data };
  } catch (err) {
    console.error('Error submitting reply:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
};

export const login = async (email, password) => {
  console.log('API Request: /auth/login', { email });
  try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password }, {
      headers: getAuthHeaders(),
      timeout: 15000,
    });
    console.log('API Response: /auth/login', response.data);
    return response;
  } catch (err) {
    console.error('Error logging in:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
};

export const register = async (email, password) => {
  console.log('API Request: /auth/register', { email });
  try {
    const response = await axios.post(`${API_URL}/auth/register`, { email, password }, {
      headers: getAuthHeaders(),
      timeout: 15000,
    });
    console.log('API Response: /auth/register', response.data);
    return response;
  } catch (err) {
    console.error('Error registering:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
};

export const getNotices = async () => {
  console.log('API Request: /movies/notices', getAuthHeaders());
  try {
    const response = await axios.get(`${API_URL}/movies/notices`, {
      headers: getAuthHeaders(),
      timeout: 15000,
    });
    console.log('API Response: /movies/notices', {
      status: response.status,
      data: response.data,
      headers: response.headers,
    });
    return response;
  } catch (err) {
    console.error('Error fetching notices:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers,
    });
    return { data: [], error: err.message || 'Failed to load notices' };
  }
};