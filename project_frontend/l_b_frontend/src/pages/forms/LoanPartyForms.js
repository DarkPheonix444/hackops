import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SaveIcon from '@mui/icons-material/Save';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HomeIcon from '@mui/icons-material/Home';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSearchParams } from 'react-router-dom';

import loanFormsService from '../../services/loanFormsService';

const borrowerInitialValues = {
  name: '',
  name_as_per_aadhaar: '',
  name_as_per_pan: '',
  aadhaar_number: '',
  pan_number: '',
  date_of_birth: '',
  phone_number: '',
  address_line: '',
  city: '',
  state: '',
  pincode: '',
  employment_type: '',
  employer_or_business_name: '',
  monthly_income: '',
  annual_gross_income: '',
  existing_monthly_obligations: '',
  credit_score: '',
  cibil_score: '',
  amount_requested: '',
  loan_purpose: '',
  loan_purpose_details: '',
  requested_tenure_months: '',
  repayment_frequency: 'MONTHLY',
};

const lenderInitialValues = {
  company_name: '',
  available_funds: '',
  risk_tolerance: 'MEDIUM',
};

const documentTypes = [
  ['AADHAAR', 'Aadhaar Card'],
  ['PAN', 'PAN Card'],
  ['ITR', 'Income Tax Return'],
  ['INCOME_COMPUTATION', 'Income Computation'],
  ['BANK_STATEMENT', 'Bank Statement'],
  ['SALARY_SLIP', 'Salary Slip'],
  ['PASSPORT', 'Passport'],
  ['BUSINESS_PROOF', 'Business Proof'],
  ['ADDRESS_PROOF', 'Address Proof'],
  ['ELECTRICITY_BILL', 'Electricity Bill'],
  ['MAINTENANCE_BILL', 'Maintenance Bill'],
  ['FORM_16', 'Form 16'],
  ['LOAN_REPAYMENT_STATEMENT', 'Previous Loan Repayment Statement'],
  ['OTHER', 'Other Supporting Proof'],
];

const borrowerSections = [
  {
    title: 'Identity & Contact Information',
    description:
      'Enter names and government numbers exactly as they appear on your official documents.',
    fields: [
      ['name', 'Full Name (Legal)', 'text', true],
      ['name_as_per_aadhaar', 'Name as per Aadhaar', 'text', true],
      ['name_as_per_pan', 'Name as per PAN', 'text', true],
      ['aadhaar_number', 'Aadhaar Number (12 digits)', 'text', true],
      ['pan_number', 'PAN Number (e.g. ABCDE1234F)', 'text', true],
      ['date_of_birth', 'Date of Birth', 'date', true],
      ['phone_number', 'Phone Number', 'tel', true],
    ],
  },
  {
    title: 'Current Residential Address',
    description: 'Provide your verifiable primary residential address.',
    fields: [
      ['address_line', 'Address Line', 'text', true, 12],
      ['city', 'City', 'text', true, 4],
      ['state', 'State', 'text', true, 4],
      ['pincode', 'PIN Code', 'text', true, 4],
    ],
  },
  {
    title: 'Employment & Financial Profile',
    description: 'Financial parameters evaluated for affordability and credit readiness.',
    fields: [
      [
        'employment_type',
        'Employment Type',
        'select',
        true,
        6,
        [
          ['SALARIED', 'Salaried Employee'],
          ['SELF_EMPLOYED', 'Self-Employed Professional'],
          ['BUSINESS', 'Business Owner / MSME'],
          ['STUDENT', 'Student'],
          ['RETIRED', 'Retired'],
          ['OTHER', 'Other'],
        ],
      ],
      [
        'employer_or_business_name',
        'Employer or Business Name',
        'text',
        true,
        6,
      ],
      ['monthly_income', 'Monthly Net Income (₹)', 'number', true, 4],
      ['annual_gross_income', 'Annual Gross Income (₹)', 'number', true, 4],
      [
        'existing_monthly_obligations',
        'Existing Monthly EMI / Obligations (₹)',
        'number',
        true,
        4,
      ],
      ['credit_score', 'Credit Score (if known)', 'number', false, 6],
      ['cibil_score', 'CIBIL Score', 'number', false, 6],
    ],
  },
  {
    title: 'Loan Requirement & Purpose',
    description: 'Specify the loan amount, requested tenure, and intended usage.',
    fields: [
      ['amount_requested', 'Amount Requested (₹)', 'number', true, 4],
      ['requested_tenure_months', 'Requested Tenure (Months)', 'number', true, 4],
      [
        'repayment_frequency',
        'Repayment Frequency',
        'select',
        true,
        4,
        [
          ['MONTHLY', 'Monthly'],
          ['WEEKLY', 'Weekly'],
          ['BIWEEKLY', 'Bi-Weekly'],
        ],
      ],
      ['loan_purpose', 'Loan Purpose (e.g. Working Capital, Medical, Education)', 'text', true, 12],
      [
        'loan_purpose_details',
        'Detailed Usage & Repayment Plan',
        'text',
        true,
        12,
        null,
        'Describe how the funds will be utilized and the repayment source',
        4,
      ],
    ],
  },
];

function SectionCard({ title, description, children }) {
  return (
    <Card
      sx={{
        mb: 3,
        bgcolor: '#0e1c2f',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Typography variant='h6' sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
          {title}
        </Typography>
        <Typography
          variant='body2'
          sx={{ color: '#94a3b8', mt: 0.5, mb: 3 }}
        >
          {description}
        </Typography>
        <Grid container spacing={2.5}>
          {children}
        </Grid>
      </CardContent>
    </Card>
  );
}

function Field({ field, values, onChange }) {
  const [name, label, type, required, size = 6, options, placeholder, rows] =
    field;
  return (
    <Grid item xs={12} md={size}>
      <TextField
        fullWidth
        name={name}
        label={label}
        value={values[name] ?? ''}
        onChange={onChange}
        required={required}
        type={type === 'select' ? 'text' : type}
        select={type === 'select'}
        placeholder={placeholder}
        multiline={Boolean(rows)}
        rows={rows}
        size='small'
        variant='outlined'
        InputLabelProps={{
          shrink: type === 'date' ? true : undefined,
          style: { color: '#94a3b8' },
        }}
        InputProps={{
          style: {
            color: '#ffffff',
            backgroundColor: '#07111f',
            borderRadius: 8,
          },
        }}
        SelectProps={
          type === 'select'
            ? {
                MenuProps: {
                  PaperProps: {
                    sx: {
                      bgcolor: '#0e1c2f',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      '& .MuiMenuItem-root': {
                        fontSize: '0.9rem',
                        '&:hover': { bgcolor: 'rgba(54, 214, 194, 0.15)' },
                        '&.Mui-selected': { bgcolor: 'rgba(54, 214, 194, 0.25)', color: '#36d6c2' },
                      },
                    },
                  },
                },
              }
            : undefined
        }
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.12)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(54, 214, 194, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#36d6c2',
            },
          },
        }}
      >
        {type === 'select' &&
          options?.map(([value, optionLabel]) => (
            <MenuItem key={value} value={value}>
              {optionLabel}
            </MenuItem>
          ))}
      </TextField>
    </Grid>
  );
}

function ProfileForm({ kind, values, onChange, onSubmit, saving }) {
  const isBorrower = kind === 'borrower';
  const sections = isBorrower
    ? borrowerSections
    : [
        {
          title: 'Lender Capital & Risk Profile',
          description:
            'Define available lending capital, target risk appetite, and portfolio preferences.',
          fields: [
            ['company_name', 'Lender / Entity Name', 'text', false, 12],
            ['available_funds', 'Total Available Lending Capital (₹)', 'number', true, 6],
            [
              'risk_tolerance',
              'Target Risk Appetite',
              'select',
              true,
              6,
              [
                ['LOW', 'Conservative / Low Risk'],
                ['MEDIUM', 'Balanced / Medium Risk'],
                ['HIGH', 'Aggressive / High Risk'],
              ],
            ],
          ],
        },
      ];

  return (
    <form onSubmit={onSubmit}>
      {sections.map((section) => (
        <SectionCard key={section.title} {...section}>
          {section.fields.map((field) => (
            <Field
              key={field[0]}
              field={field}
              values={values}
              onChange={onChange}
            />
          ))}
        </SectionCard>
      ))}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type='submit'
          variant='contained'
          startIcon={<SaveIcon />}
          disabled={saving}
          sx={{
            bgcolor: '#36d6c2',
            color: '#07111f',
            fontWeight: 800,
            px: 4,
            py: 1.3,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '0.95rem',
            boxShadow: '0 4px 14px 0 rgba(54, 214, 194, 0.39)',
            '&:hover': { bgcolor: '#20bbaa' },
            '&.Mui-disabled': {
              bgcolor: 'rgba(54, 214, 194, 0.2)',
              color: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          {saving
            ? 'Saving Details...'
            : `Save ${isBorrower ? 'Borrower' : 'Lender'} Information →`}
        </Button>
      </Box>
    </form>
  );
}

function DocumentsSection({ documents, onUpload, uploading }) {
  const [documentType, setDocumentType] = useState('AADHAAR');
  const [file, setFile] = useState(null);

  const submitDocument = async (event) => {
    event.preventDefault();
    if (!file) return;
    await onUpload(documentType, file);
    setFile(null);
    event.target.reset();
  };

  return (
    <SectionCard
      title='Supporting Verification Documents'
      description='Upload relevant identity, income, or bank records to support your TrustLens verification.'
    >
      <Grid item xs={12} md={5}>
        <TextField
          fullWidth
          select
          size='small'
          label='Document Type'
          value={documentType}
          onChange={(event) => setDocumentType(event.target.value)}
          InputLabelProps={{ style: { color: '#94a3b8' } }}
          InputProps={{
            style: {
              color: '#ffffff',
              backgroundColor: '#07111f',
              borderRadius: 8,
            },
          }}
          SelectProps={{
            MenuProps: {
              PaperProps: {
                sx: {
                  bgcolor: '#0e1c2f',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  '& .MuiMenuItem-root': {
                    fontSize: '0.9rem',
                    '&:hover': { bgcolor: 'rgba(54, 214, 194, 0.15)' },
                    '&.Mui-selected': { bgcolor: 'rgba(54, 214, 194, 0.25)', color: '#36d6c2' },
                  },
                },
              },
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
              '&:hover fieldset': { borderColor: 'rgba(54, 214, 194, 0.5)' },
              '&.Mui-focused fieldset': { borderColor: '#36d6c2' },
            },
          }}
        >
          {documentTypes.map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} md={7}>
        <form onSubmit={submitDocument} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Button
            component='label'
            variant='outlined'
            startIcon={<AttachFileIcon sx={{ color: '#36d6c2' }} />}
            sx={{
              color: '#cbd5e1',
              borderColor: 'rgba(255, 255, 255, 0.18)',
              bgcolor: '#07111f',
              textTransform: 'none',
              borderRadius: 2,
              px: 2.5,
              py: 0.9,
              '&:hover': {
                borderColor: '#36d6c2',
                bgcolor: 'rgba(54, 214, 194, 0.08)',
                color: '#ffffff',
              },
            }}
          >
            {file ? file.name : 'Choose File'}
            <input
              hidden
              type='file'
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </Button>

          <Button
            type='submit'
            variant='contained'
            disabled={!file || uploading}
            sx={{
              bgcolor: '#36d6c2',
              color: '#07111f',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 0.9,
              '&:hover': { bgcolor: '#20bbaa' },
              '&.Mui-disabled': {
                bgcolor: 'rgba(54, 214, 194, 0.15)',
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            {uploading ? (
              <CircularProgress size={20} sx={{ color: '#07111f' }} />
            ) : (
              'Upload Document'
            )}
          </Button>
        </form>
      </Grid>

      <Grid item xs={12}>
        <Box sx={{ mt: 1 }}>
          <Typography variant='caption' sx={{ color: '#94a3b8', display: 'block', mb: 1, fontWeight: 700, textTransform: 'uppercase' }}>
            Uploaded Files ({documents.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2 }}>
            {documents.length ? (
              documents.map((document) => (
                <Chip
                  key={document.id}
                  icon={<CheckCircleOutlineIcon sx={{ color: '#34d399 !important', fontSize: 16 }} />}
                  label={`${document.document_type} · ${document.verification_status}`}
                  sx={{
                    bgcolor: 'rgba(54, 214, 194, 0.1)',
                    color: '#36d6c2',
                    border: '1px solid rgba(54, 214, 194, 0.25)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                  }}
                />
              ))
            ) : (
              <Typography variant='body2' sx={{ color: '#64748b', fontStyle: 'italic' }}>
                No documents uploaded yet. You can upload PAN, Aadhaar, or Bank Statements here.
              </Typography>
            )}
          </Box>
        </Box>
      </Grid>
    </SectionCard>
  );
}

export default function LoanPartyForms() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get('role') === 'lender' ? 1 : 0,
  );
  const [borrower, setBorrower] = useState(borrowerInitialValues);
  const [lender, setLender] = useState(lenderInitialValues);
  const [documents, setDocuments] = useState([]);
  const [profileExists, setProfileExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const loadForms = async () => {
      const [borrowerResponse, lenderResponse, documentsResponse] =
        await Promise.allSettled([
          loanFormsService.getBorrowerProfile(),
          loanFormsService.getLenderProfile(),
          loanFormsService.getBorrowerDocuments(),
        ]);
      if (borrowerResponse.status === 'fulfilled') {
        setBorrower({
          ...borrowerInitialValues,
          ...borrowerResponse.value.data,
        });
        setProfileExists(true);
      }
      if (lenderResponse.status === 'fulfilled')
        setLender({ ...lenderInitialValues, ...lenderResponse.value.data });
      if (documentsResponse.status === 'fulfilled')
        setDocuments(documentsResponse.value.data || []);
      setLoading(false);
    };
    loadForms();
  }, []);

  const handleChange = (setter) => (event) => {
    const { name, value } = event.target;
    setter((previous) => ({ ...previous, [name]: value }));
    setNotice(null);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      if (activeTab === 0) {
        const response = profileExists
          ? await loanFormsService.updateBorrowerProfile(borrower)
          : await loanFormsService.createBorrowerProfile(borrower);
        setBorrower({ ...borrowerInitialValues, ...response.data });
        setProfileExists(true);
        setNotice({ severity: 'success', message: 'Borrower details saved successfully.' });
      } else {
        const response = await loanFormsService.saveLenderProfile(lender);
        setLender({ ...lenderInitialValues, ...response.data });
        setNotice({ severity: 'success', message: 'Lender profile saved successfully.' });
      }
    } catch (error) {
      setNotice({
        severity: 'error',
        message:
          error.response?.data?.detail ||
          error.response?.data?.message ||
          'Could not save details. Please check connection and try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async (documentType, file) => {
    setUploading(true);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.append('document_type', documentType);
      formData.append('document', file);
      const response = await loanFormsService.uploadBorrowerDocument(formData);
      setDocuments((previous) => [...previous, response.data]);
      setNotice({ severity: 'success', message: `${documentType} uploaded successfully.` });
    } catch (error) {
      setNotice({
        severity: 'error',
        message:
          error.response?.data?.detail ||
          error.response?.data?.message ||
          'Could not upload this document. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading)
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#07111f',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <CircularProgress sx={{ color: '#36d6c2' }} />
      </Box>
    );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#07111f',
        color: '#f8fafc',
        fontFamily: "'Inter', sans-serif",
        p: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
        {/* TOP BRAND RIBBON & NAVIGATION */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3.5,
            flexWrap: 'wrap',
            gap: 2,
            pb: 2.5,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: '#36d6c2',
                color: '#07111f',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
              }}
            >
              TL
            </Box>
            <Typography variant='h5' sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
              Trust<span style={{ color: '#36d6c2' }}>Lens</span>
            </Typography>
            <Chip
              label='Party Onboarding'
              size='small'
              sx={{
                ml: 1,
                bgcolor: 'rgba(54, 214, 194, 0.1)',
                color: '#36d6c2',
                border: '1px solid rgba(54, 214, 194, 0.25)',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Button
              href='/'
              variant='outlined'
              size='small'
              startIcon={<HomeIcon sx={{ fontSize: 16 }} />}
              sx={{
                color: '#94a3b8',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 2,
                '&:hover': { borderColor: '#ffffff', color: '#ffffff' },
              }}
            >
              Home
            </Button>
            <Button
              href='/verification'
              variant='outlined'
              size='small'
              startIcon={<VerifiedUserIcon sx={{ fontSize: 16 }} />}
              sx={{
                color: '#36d6c2',
                borderColor: 'rgba(54, 214, 194, 0.35)',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 2,
                '&:hover': {
                  borderColor: '#36d6c2',
                  bgcolor: 'rgba(54, 214, 194, 0.1)',
                },
              }}
            >
              Identity Verification
            </Button>
            <Button
              href='/app/dashboard'
              variant='contained'
              size='small'
              sx={{
                bgcolor: '#36d6c2',
                color: '#07111f',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                '&:hover': { bgcolor: '#20bbaa' },
              }}
            >
              Dashboard
            </Button>
          </Box>
        </Box>

        {/* HERO TITLE OF FORMS */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='overline'
            sx={{ color: '#36d6c2', fontWeight: 800, letterSpacing: 1.5, display: 'block' }}
          >
            TRUSTLENS APPLICATION WORKFLOW
          </Typography>
          <Typography variant='h4' sx={{ fontWeight: 800, color: '#ffffff', mt: 0.5 }}>
            Lender & Borrower Application Forms
          </Typography>
          <Typography sx={{ color: '#94a3b8', mt: 1, maxWidth: 740, fontSize: '0.95rem' }}>
            Submit comprehensive profile and financial details that power identity verification,
            affordability analysis, and lender portfolio matching.
          </Typography>
        </Box>

        {/* NOTICES & ALERTS */}
        {notice && (
          <Alert
            severity={notice.severity}
            sx={{
              mb: 3,
              bgcolor:
                notice.severity === 'error'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(52, 211, 153, 0.15)',
              color: notice.severity === 'error' ? '#fca5a5' : '#6ee7b7',
              border:
                notice.severity === 'error'
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid rgba(52, 211, 153, 0.3)',
              borderRadius: 2,
            }}
            onClose={() => setNotice(null)}
          >
            {notice.message}
          </Alert>
        )}

        {/* ROLE SELECTION TABS */}
        <Card
          sx={{
            mb: 3.5,
            bgcolor: '#0e1c2f',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
            boxShadow: '0 15px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, value) => {
              setActiveTab(value);
              setNotice(null);
            }}
            variant='fullWidth'
            sx={{
              '& .MuiTab-root': {
                color: '#94a3b8',
                fontWeight: 700,
                fontSize: '0.95rem',
                textTransform: 'none',
                py: 2,
                '&.Mui-selected': {
                  color: '#36d6c2',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#36d6c2',
                height: 3,
              },
            }}
          >
            <Tab
              icon={<PersonOutlineIcon />}
              iconPosition='start'
              label='Borrower Application'
            />
            <Tab
              icon={<AccountBalanceIcon />}
              iconPosition='start'
              label='Lender Profile'
            />
          </Tabs>
        </Card>

        {/* ACTIVE FORM */}
        {activeTab === 0 ? (
          <>
            <ProfileForm
              kind='borrower'
              values={borrower}
              onChange={handleChange(setBorrower)}
              onSubmit={saveProfile}
              saving={saving}
            />

            <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            <DocumentsSection
              documents={documents}
              onUpload={uploadDocument}
              uploading={uploading}
            />

            {/* NEXT STEP BANNER */}
            <Box
              sx={{
                mt: 3,
                p: 3,
                bgcolor: '#0e1c2f',
                borderRadius: 3,
                border: '1px solid rgba(54, 214, 194, 0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant='subtitle1' sx={{ fontWeight: 800, color: '#ffffff' }}>
                  Ready to verify submitted information?
                </Typography>
                <Typography variant='body2' sx={{ color: '#94a3b8' }}>
                  Run the deterministic TrustLens verification engine to inspect identity match and consistency.
                </Typography>
              </Box>

              <Button
                href='/verification'
                variant='contained'
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: '#36d6c2',
                  color: '#07111f',
                  fontWeight: 800,
                  px: 3.5,
                  py: 1.2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 14px 0 rgba(54, 214, 194, 0.39)',
                  '&:hover': { bgcolor: '#20bbaa' },
                }}
              >
                Go to Identity Verification →
              </Button>
            </Box>
          </>
        ) : (
          <ProfileForm
            kind='lender'
            values={lender}
            onChange={handleChange(setLender)}
            onSubmit={saveProfile}
            saving={saving}
          />
        )}
      </Box>
    </Box>
  );
}
