import axios from 'axios';

// Use REACT_APP_API_URL for Create React App; fallback to Render backend URL
const API_URL = process.env.REACT_APP_API_URL || 'https://movieverse-backend-ewhk.onrender.com';

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

export const getCategory = async (categoryId) => {
  console.log('API Request: /api/movies/categories/' + categoryId, getAuthHeaders());
  try {
    const response = await axios.get(`${API_URL}/api/movies/categories/${categoryId}`, {
      headers: getAuthHeaders(),
    });
    console.log('API Response: /api/movies/categories/' + categoryId, response.data);
    return response;
  } catch (err) {
    console.error('Error fetching category:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
};

export const getMovieDetails = async (source, externalId) => {
  console.log('API Request: /api/movies/details/' + source + '/' + externalId, getAuthHeaders());
  try {
    const response = await axios.get(`${API_URL}/api/movies/details/${source}/${externalId}`, {
      headers: getAuthHeaders(),
    });
    console.log('API Response: /api/movies/details/' + source + '/' + externalId, response.data);
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
  console.log('API Request: /api/reviews/' + source + '/' + externalId, reviewData);
  try {
    const response = await axios.post(
      `${API_URL}/api/reviews/${source}/${externalId}`,
      {
        text: reviewData.text,
        name: reviewData.name,
        email: reviewData.email,
      },
      { headers: getAuthHeaders() }
    );
    console.log('API Response: /api/reviews/' + source + '/' + externalId, response.data);
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
  console.log('API Request: /api/reviews/' + source + '/' + externalId, getAuthHeaders());
  try {
    const response = await axios.get(`${API_URL}/api/reviews/${source}/${externalId}`, {
      headers: getAuthHeaders(),
    });
    console.log('API Response: /api/reviews/' + source + '/' + externalId, response.data);
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
  console.log('API Request: /api/reviews/' + source + '/' + externalId + '/reply/' + reviewId, replyData);
  try {
    const response = await axios.post(
      `${API_URL}/api/reviews/${source}/${externalId}/reply/${reviewId}`,
      {
        text: replyData.text,
        name: replyData.name,
        email: replyData.email,
      },
      { headers: getAuthHeaders() }
    );
    console.log('API Response: /api/reviews/' + source + '/' + externalId + '/reply/' + reviewId, response.data);
    return response;
  } catch (err) {
    console.error('Error submitting reply:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
};

export const submitReaction = async (source, externalId, reaction) => {
  console.log('API Request: /api/movies/reactions/' + source + '/' + externalId, { reaction });
  try {
    const response = await axios.post(
      `${API_URL}/api/movies/reactions/${source}/${externalId}`,
      { reaction },
      { headers: getAuthHeaders() }
    );
    console.log('API Response: /api/movies/reactions/' + source + '/' + externalId, response.data);
    return response;
  } catch (err) {
    console.error('Error submitting reaction:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
};

export const login = async (email, password) => {
  console.log('API Request: /api/auth/login', { email });
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, { email, password }, {
      headers: getAuthHeaders(),
    });
    console.log('API Response: /api/auth/login', response.data);
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
  console.log('API Request: /api/auth/register', { email });
  try {
    const response = await axios.post(`${API_URL}/api/auth/register`, { email, password }, {
      headers: getAuthHeaders(),
    });
    console.log('API Response: /api/auth/register', response.data);
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
  console.log('API Request: /api/movies/notices', getAuthHeaders());
  try {
    const response = await axios.get(`${API_URL}/api/movies/notices`, {
      headers: getAuthHeaders(),
    });
    console.log('API Response: /api/movies/notices', response.data);
    return response;
  } catch (err) {
    console.error('Error fetching notices:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
};