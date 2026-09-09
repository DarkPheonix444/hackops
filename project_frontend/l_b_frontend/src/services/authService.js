import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/token/', { email, password });
    return response.data;
  },

  async signup(email, name, password, role = 'borrower') {
    const response = await api.post('/users/signup/', {
      email,
      name,
      password,
      role,
    });
    return response.data;
  },

  async getMe() {
    const response = await api.get('/users/me/');
    return response.data;
  },

  async refreshToken(refreshToken) {
    const response = await api.post('/token/refresh/', {
      refresh: refreshToken,
    });
    return response.data;
  },

  getStoredRole() {
    return localStorage.getItem('user_role') || 'borrower';
  },

  setStoredRole(role) {
    localStorage.setItem('user_role', role);
  },
};

export default authService;
