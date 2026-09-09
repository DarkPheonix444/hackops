import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
  timeout: 10000,
});

// Request interceptor to attach JWT auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const lenderApi = {
  // Onboarding / Profile
  getProfile: () => api.get('/lender/profile/'),
  updateProfile: (formData) =>
    api.post('/lender/profile/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Application Feed
  getFeed: () => api.get('/lender/feed/'),
  getApplicationDetail: (id) => api.get(`/lender/application/${id}/`),

  // Decision (Approve / Reject)
  makeDecision: (id, { action, notes }) =>
    api.post(`/lender/decision/${id}/`, { action, notes }),
};

export default api;
