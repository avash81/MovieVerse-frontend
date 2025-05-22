import axios from 'axios';

// Use process.env.REACT_APP_API_URL for Create React App
// Default to /api to leverage the proxy in development, and use Render backend URL in production
const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? '/api' : 'https://movieverse-backend.onrender.com/api');

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
  console.log('API Request: /movies/categories/' + categoryId, getAuthHeaders());
  try {
    const response = await axios.get(`${API_URL}/movies/categories/${categoryId}`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    console.log('API Response: /movies/categories/' + categoryId, {
      status: response.status,
      data: response.data,
      headers: response.headers,
    });
    const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
    return { data };
  } catch (err) {
    console.error('Error fetching category:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers,
    });
    throw err;
  }
};

export const getMovieDetails = async (source, externalId) => {
  console.log('API Request: /movies/details/' + source + '/' + externalId, getAuthHeaders());
  try {
    const response = await axios.get(`${API_URL}/movies/details/${source}/${externalId}`, {
      headers: getAuthHeaders(),
      timeout: 10000,
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
      },
      { headers: getAuthHeaders() }
    );
    console.log('API Response: /reviews/' + source + '/' + externalId, response.data);
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
      timeout: 10000,
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
  console.log('API Request: /movies/reactions/' + source + '/' + externalId, { reaction });
  try {
    const response = await axios.post(
      `${API_URL}/movies/reactions/${source}/${externalId}`,
      { reaction },
      { headers: getAuthHeaders() }
    );
    console.log('API Response: /movies/reactions/' + source + '/' + externalId, response.data);
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
  console.log('API Request: /auth/login', { email });
  try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password }, {
      headers: getAuthHeaders(),
      timeout: 10000,
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
      timeout: 10000,
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
      timeout: 10000,
    });
    console.log('API Response: /movies/notices', response.data);
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