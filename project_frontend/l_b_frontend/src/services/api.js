import axios from 'axios';
import config from '../config';

const api = axios.create({
  baseURL: config.baseURLApi,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (req) => {
    const token = localStorage.getItem('token');
    if (token) {
      req.headers['Authorization'] = `Bearer ${token}`;
    }
    return req;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh or unauthorized responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/token/')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${config.baseURLApi}/token/refresh/`, {
            refresh: refreshToken,
          });
          const newAccessToken = res.data.access;
          if (newAccessToken) {
            localStorage.setItem('token', newAccessToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          console.warn('Token refresh failed:', refreshErr);
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
