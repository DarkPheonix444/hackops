import api from './api';

export const lenderService = {
  async getProfile() {
    const response = await api.get('/lender/profile/');
    return response.data;
  },

  async getFeed() {
    const response = await api.get('/lender/feed/');
    return response.data;
  },

  async getApplication(id) {
    const response = await api.get(`/lender/application/${id}/`);
    return response.data;
  },

  async evaluateApplication(id) {
    const response = await api.post(`/lender/evaluate/${id}/`);
    return response.data;
  },

  async saveProfile(profileData) {
    const response = await api.post('/lender/profile/', profileData);
    return response.data;
  },

  async submitDecision(id, action, notes = '') {
    const response = await api.post(`/lender/decision/${id}/`, {
      action,
      notes,
    });
    return response.data;
  },
};

export default lenderService;
