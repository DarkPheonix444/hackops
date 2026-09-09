import api from './api';

export const verificationService = {
  // Start or get active verification session
  startVerification: async (method = 'HYBRID') => {
    return api.post('/borrower/verification/start/', { method });
  },

  // Submit identity data & documents to TrustLens Verification Engine
  submitVerification: async (payload) => {
    return api.post('/borrower/verification/submit/', payload);
  },

  // Get lightweight status & confidence
  getVerificationStatus: async () => {
    return api.get('/borrower/verification/status/');
  },

  // Get full explainable verification result
  getVerificationResult: async () => {
    return api.get('/borrower/verification/result/');
  },

  // Document management
  uploadDocument: async (formData) => {
    return api.post('/borrower/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getDocuments: async () => {
    return api.get('/borrower/documents/');
  },
};

export default verificationService;
