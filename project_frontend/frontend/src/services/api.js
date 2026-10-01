import axios from 'axios'

// Reusable Axios instance for all backend API calls.
// The base URL comes from the VITE_API_BASE_URL environment variable,
// so the backend URL is not hardcoded in the application.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

// Automatically attach the JWT access token from localStorage
// to outgoing requests when it exists.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
