import api from './api';

export const DOCUMENT_TYPES = [
  { value: 'AADHAAR', label: 'Aadhaar Card', required: true },
  { value: 'PAN', label: 'PAN Card', required: true },
  { value: 'ITR', label: 'Income Tax Return (ITR)', required: true },
  { value: 'INCOME_COMPUTATION', label: 'Income Computation', required: true },
  { value: 'BANK_STATEMENT', label: 'Bank Statement (6 Months)', required: true },
  { value: 'SALARY_SLIP', label: 'Salary Slip', required: false },
  { value: 'PASSPORT', label: 'Passport', required: false },
  { value: 'ADDRESS_PROOF', label: 'Address Proof', required: false },
  { value: 'ELECTRICITY_BILL', label: 'Electricity Bill', required: false },
  { value: 'MAINTENANCE_BILL', label: 'Maintenance Bill', required: false },
  { value: 'FORM_16', label: 'Form 16', required: false },
  { value: 'BUSINESS_PROOF', label: 'Business Proof', required: false },
  { value: 'LOAN_REPAYMENT_STATEMENT', label: 'Previous Loan Statement', required: false },
  { value: 'OTHER', label: 'Other Support Document', required: false },
];

export const borrowerService = {
  async getProfile() {
    const response = await api.get('/borrower/profile/');
    return response.data;
  },

  async createProfile(profileData) {
    const response = await api.post('/borrower/profile/', profileData);
    return response.data;
  },

  async updateProfile(profileData) {
    const response = await api.patch('/borrower/profile/', profileData);
    return response.data;
  },

  async getDocuments() {
    const response = await api.get('/borrower/documents/');
    return response.data;
  },

  async uploadDocument(documentType, file) {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('document', file);

    const response = await api.post('/borrower/documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async submitApplication() {
    const response = await api.post('/borrower/submit/');
    return response.data;
  },
};

export default borrowerService;
