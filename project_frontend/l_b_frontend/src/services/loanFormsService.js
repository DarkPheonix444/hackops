import api from './api';

export const loanFormsService = {
  getBorrowerProfile: () => api.get('/borrower/profile/'),
  createBorrowerProfile: (payload) => api.post('/borrower/profile/', payload),
  updateBorrowerProfile: (payload) => api.patch('/borrower/profile/', payload),
  getLenderProfile: () => api.get('/lender/profile/'),
  saveLenderProfile: (payload) => api.post('/lender/profile/', payload),
  getBorrowerDocuments: () => api.get('/borrower/documents/'),
  uploadBorrowerDocument: (formData) =>
    api.post('/borrower/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default loanFormsService;
