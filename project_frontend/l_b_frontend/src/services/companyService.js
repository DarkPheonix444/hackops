import api from './api';

export const companyService = {
  async listBorrowers(params = {}) {
    const response = await api.get('/co/borrowers/', { params });
    return response.data;
  },

  async getBorrower(id) {
    const response = await api.get(`/co/borrowers/${id}/`);
    return response.data;
  },

  async getBorrowerDocuments(id) {
    const response = await api.get(`/co/borrowers/${id}/documents/`);
    return response.data;
  },

  async listDocuments() {
    const response = await api.get('/co/documents/');
    return response.data;
  },

  async processDocument(id) {
    const response = await api.post(`/co/documents/${id}/process/`);
    return response.data;
  },

  async getDocumentProcessing(id) {
    const response = await api.get(`/co/documents/${id}/process/`);
    return response.data;
  },

  async validateBorrower(borrowerId, data = {}) {
    const response = await api.post(`/co/borrowers/${borrowerId}/validate/`, data);
    return response.data;
  },

  async getLenderFeed(all = true) {
    const response = await api.get('/lender/feed/', { params: { all } });
    return response.data;
  },

  async submitLenderDecision(applicationId, action, notes = '') {
    const response = await api.post(`/lender/decision/${applicationId}/`, {
      action,
      notes,
    });
    return response.data;
  },

  async evaluateLoanApplication(applicationId) {
    const response = await api.post(`/lender/evaluate/${applicationId}/`);
    return response.data;
  },
};

export default companyService;