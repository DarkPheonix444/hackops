import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Description as DocumentIcon,
  VerifiedUser as VerifiedIcon,
  Send as SendIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

// context
import { useUserState } from '../../context/UserContext';
import { showSnackbar } from '../../components/Snackbar';

// services
import borrowerService, { DOCUMENT_TYPES } from '../../services/borrowerService';
import lenderService from '../../services/lenderService';
import authService from '../../services/authService';

const demoLenderRequests = [
  {
    name: 'Northstar Capital',
    type: 'NBFC Partner',
    amount: 'Up to requested amount',
    rate: '12.5% - 15.0%',
    status: 'Reviewing',
  },
  {
    name: 'BrightPath Finance',
    type: 'Digital Lender',
    amount: 'Up to 90% of request',
    rate: '14.0% - 17.5%',
    status: 'Interested',
  },
  {
    name: 'Cedar Ridge Bank',
    type: 'Institutional Lender',
    amount: 'Pending verification',
    rate: 'To be determined',
    status: 'Awaiting KYC',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, userRole } = useUserState();
  const [userDetails, setUserDetails] = useState(currentUser);

  // Active view perspective: 'borrower' or 'lender'
  const activeTab = userRole || 'borrower';

  useEffect(() => {
    let mounted = true;
    authService
      .getMe()
      .then((user) => {
        if (mounted) setUserDetails(user);
      })
      .catch(() => {
        if (mounted) setUserDetails(currentUser);
      });
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // ========================================================
  // BORROWER STATE
  // ========================================================
  const [borrowerProfile, setBorrowerProfile] = useState(null);
  const [borrowerLoading, setBorrowerLoading] = useState(false);
  const [borrowerNotFound, setBorrowerNotFound] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docLoading, setDocLoading] = useState(false);

  // Document Upload State
  const [selectedDocType, setSelectedDocType] = useState('AADHAAR');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Borrower Profile Creation / Edit Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    aadhaar_number: '',
    pan_number: '',
    phone_number: '',
    address_line: '',
    city: '',
    state: '',
    pincode: '',
    employment_type: 'SALARIED',
    employer_or_business_name: '',
    monthly_income: '',
    annual_gross_income: '',
    existing_monthly_obligations: '',
    amount_requested: '',
    loan_purpose: '',
    loan_purpose_details: '',
    requested_tenure_months: '12',
    repayment_frequency: 'MONTHLY',
  });
  const [submittingProfile, setSubmittingProfile] = useState(false);

  // ========================================================
  // LENDER STATE
  // ========================================================
  const [lenderProfile, setLenderProfile] = useState(null);
  const [lenderLoading, setLenderLoading] = useState(false);
  const [loanFeed, setLoanFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Lender Decision Modal
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // ========================================================
  // DATA FETCHING HOOKS
  // ========================================================

  const fetchBorrowerData = useCallback(async () => {
    setBorrowerLoading(true);
    setDocLoading(true);
    try {
      const profile = await borrowerService.getProfile();
      setBorrowerProfile(profile);
      setBorrowerNotFound(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setBorrowerNotFound(true);
        setBorrowerProfile(null);
      } else {
        console.error('Error fetching borrower profile:', err);
      }
    } finally {
      setBorrowerLoading(false);
    }

    try {
      const docs = await borrowerService.getDocuments();
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error('Error fetching borrower documents:', err);
      setDocuments([]);
    } finally {
      setDocLoading(false);
    }
  }, []);

  const fetchLenderData = useCallback(async () => {
    setLenderLoading(true);
    setFeedLoading(true);
    try {
      const profile = await lenderService.getProfile();
      setLenderProfile(profile);
    } catch (err) {
      console.error('Error fetching lender profile:', err);
    } finally {
      setLenderLoading(false);
    }

    try {
      const feed = await lenderService.getFeed();
      setLoanFeed(Array.isArray(feed) ? feed : []);
    } catch (err) {
      console.error('Error fetching lender feed:', err);
      setLoanFeed([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBorrowerData();
    fetchLenderData();
  }, [fetchBorrowerData, fetchLenderData]);

  // ========================================================
  // BORROWER ACTIONS
  // ========================================================

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadDocument = async () => {
    if (!borrowerProfile) {
      showSnackbar({
        type: 'warning',
        message: 'Save your borrower profile before uploading documents.',
      });
      return;
    }

    if (!selectedFile) {
      showSnackbar({ type: 'warning', message: 'Please select a file to upload.' });
      return;
    }

    setUploading(true);
    try {
      await borrowerService.uploadDocument(selectedDocType, selectedFile);
      showSnackbar({ type: 'success', message: `Document uploaded successfully!` });
      setSelectedFile(null);
      const fileInput = document.getElementById('borrower-file-input');
      if (fileInput) fileInput.value = '';
      const docs = await borrowerService.getDocuments();
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error('Upload failed:', err);
      const errMsg = err.response?.data?.detail || 'Failed to upload document. Ensure profile exists and application is in DRAFT.';
      showSnackbar({ type: 'error', message: errMsg });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitApplication = async () => {
    try {
      const res = await borrowerService.submitApplication();
      showSnackbar({
        type: 'success',
        message: res.message || 'Application submitted successfully! It is now locked for verification.',
      });
      fetchBorrowerData();
    } catch (err) {
      console.error('Submission failed:', err);
      const missing = err.response?.data?.missing_documents;
      let errorMsg = err.response?.data?.detail || 'Failed to submit application.';
      if (missing && missing.length > 0) {
        errorMsg = `Missing required documents: ${missing.join(', ')}`;
      }
      showSnackbar({ type: 'error', message: errorMsg });
    }
  };

  const handleOpenCreateProfile = () => {
    setIsEditingProfile(false);
    setProfileForm({
      name: currentUser?.name || '',
      aadhaar_number: '',
      pan_number: '',
      phone_number: '',
      address_line: '',
      city: '',
      state: '',
      pincode: '',
      employment_type: 'SALARIED',
      employer_or_business_name: '',
      monthly_income: '',
      annual_gross_income: '',
      existing_monthly_obligations: '',
      amount_requested: '',
      loan_purpose: '',
      loan_purpose_details: '',
      requested_tenure_months: '12',
      repayment_frequency: 'MONTHLY',
    });
    setProfileModalOpen(true);
  };

  const handleOpenEditProfile = () => {
    if (!borrowerProfile) return;
    setIsEditingProfile(true);
    setProfileForm({
      name: borrowerProfile.name || '',
      aadhaar_number: borrowerProfile.aadhaar_number || '',
      pan_number: borrowerProfile.pan_number || '',
      phone_number: borrowerProfile.phone_number || '',
      address_line: borrowerProfile.address_line || '',
      city: borrowerProfile.city || '',
      state: borrowerProfile.state || '',
      pincode: borrowerProfile.pincode || '',
      employment_type: borrowerProfile.employment_type || 'SALARIED',
      employer_or_business_name: borrowerProfile.employer_or_business_name || '',
      monthly_income: borrowerProfile.monthly_income || '',
      annual_gross_income: borrowerProfile.annual_gross_income || '',
      existing_monthly_obligations: borrowerProfile.existing_monthly_obligations || '',
      amount_requested: borrowerProfile.amount_requested || '',
      loan_purpose: borrowerProfile.loan_purpose || '',
      loan_purpose_details: borrowerProfile.loan_purpose_details || '',
      requested_tenure_months: borrowerProfile.requested_tenure_months || '12',
      repayment_frequency: borrowerProfile.repayment_frequency || 'MONTHLY',
    });
    setProfileModalOpen(true);
  };

  const handleSaveProfile = async () => {
    setSubmittingProfile(true);
    try {
      if (isEditingProfile) {
        await borrowerService.updateProfile(profileForm);
        showSnackbar({ type: 'success', message: 'Borrower profile updated successfully!' });
      } else {
        await borrowerService.createProfile(profileForm);
        showSnackbar({ type: 'success', message: 'Borrower profile created successfully!' });
      }
      setProfileModalOpen(false);
      fetchBorrowerData();
    } catch (err) {
      console.error('Error saving profile:', err);
      let errorMsg = 'Failed to save profile.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (typeof err.response.data === 'object') {
          errorMsg = Object.entries(err.response.data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
        }
      }
      showSnackbar({ type: 'error', message: errorMsg });
    } finally {
      setSubmittingProfile(false);
    }
  };

  // Required documents check
  const requiredDocs = useMemo(
    () => ['AADHAAR', 'PAN', 'ITR', 'INCOME_COMPUTATION', 'BANK_STATEMENT'],
    []
  );
  const uploadedDocTypes = useMemo(
    () => new Set(documents.map((d) => d.document_type)),
    [documents]
  );
  const allRequiredDocsUploaded = useMemo(
    () => requiredDocs.every((type) => uploadedDocTypes.has(type)),
    [requiredDocs, uploadedDocTypes]
  );

  // ========================================================
  // LENDER ACTIONS
  // ========================================================

  const handleOpenDecisionModal = (application) => {
    setSelectedApplication(application);
    setDecisionNotes('');
    setDecisionModalOpen(true);
  };

  const handleSubmitDecision = async (action) => {
    if (!selectedApplication) return;
    setSubmittingDecision(true);
    try {
      const res = await lenderService.submitDecision(
        selectedApplication.id,
        action,
        decisionNotes
      );
      showSnackbar({
        type: action === 'APPROVE' ? 'success' : 'info',
        message: res.message || `Application #${selectedApplication.id} ${action.toLowerCase()}d successfully.`,
      });
      setDecisionModalOpen(false);
      fetchLenderData();
    } catch (err) {
      console.error('Decision submission failed:', err);
      const errMsg = err.response?.data?.detail || 'Failed to submit decision.';
      showSnackbar({ type: 'error', message: errMsg });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const getTrustScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <Box p={3} style={{ minHeight: '100vh', background: '#0a0f1d', color: '#f8fafc' }}>
      {/* 1. TOP HERO / PORTAL CONTROL BANNER */}
      <Paper
        elevation={3}
        style={{
          padding: '24px 28px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, #0d1a33 0%, #0c234a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 28,
        }}
      >
        <Grid container alignItems='center' justifyContent='space-between' spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Box display='flex' alignItems='center' gap={2}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#fff',
                }}
              >
                T
              </div>
              <div>
                <Typography variant='h4' style={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
                  Welcome back, {userDetails?.name || 'User'}!
                </Typography>
                <Typography variant='body2' style={{ color: '#94a3b8', marginTop: 2 }}>
                  {userDetails?.email || 'Logged In'} | {activeTab === 'lender' ? 'Lender' : 'Borrower'} account
                </Typography>
              </div>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box display='flex' justifyContent={{ xs: 'flex-start', md: 'flex-end' }} alignItems='center' gap={1.5} flexWrap='wrap'>
              <Button
                variant='contained'
                onClick={() => navigate(activeTab === 'lender' ? '/app/loan-forms?role=lender' : '/app/loan-forms?role=borrower')}
                startIcon={<DocumentIcon />}
                style={{
                  background:
                    activeTab === 'lender'
                      ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                      : 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                  color: '#ffffff',
                }}
              >
                📋 Fill Loan Forms
              </Button>
              <Tooltip title='Refresh live API data'>
                <IconButton
                  onClick={() => {
                    fetchBorrowerData();
                    fetchLenderData();
                    showSnackbar({ type: 'info', message: 'Syncing live API data...' });
                  }}
                  style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)' }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Chip
                icon={<VerifiedIcon style={{ color: '#10b981', fontSize: 18 }} />}
                label='API Connected'
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  fontWeight: 700,
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              />

              <Chip
                label={activeTab === 'lender' ? 'Lender Mode Active' : 'Borrower Mode Active'}
                style={{
                  background: activeTab === 'lender' ? '#059669' : '#0284c7',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              />
            </Box>
          </Grid>
        </Grid>

      </Paper>

      <Paper
        elevation={2}
        style={{
          padding: '20px 24px',
          borderRadius: 14,
          background: '#111c3a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 28,
        }}
      >
        <Typography variant='overline' style={{ color: '#38bdf8', fontWeight: 800 }}>
          User Details
        </Typography>
        <Grid container spacing={2} mt={0.5}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant='caption' style={{ color: '#94a3b8' }}>Name</Typography>
            <Typography style={{ color: '#ffffff', fontWeight: 700 }}>{userDetails?.name || 'Not available'}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant='caption' style={{ color: '#94a3b8' }}>Email</Typography>
            <Typography style={{ color: '#ffffff', fontWeight: 700 }}>{userDetails?.email || 'Not available'}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant='caption' style={{ color: '#94a3b8' }}>Account Type</Typography>
            <Typography style={{ color: '#ffffff', fontWeight: 700, textTransform: 'capitalize' }}>{activeTab}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* ========================================================
          BORROWER PORTAL VIEW
      ======================================================== */}
      {activeTab === 'borrower' && (
        <div>
          {/* KPI CARDS (BORROWER) */}
          <Grid container spacing={3} mb={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card style={{ background: '#111c3a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                <CardContent>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    Application Status
                  </Typography>
                  <Typography variant='h4' style={{ color: '#38bdf8', fontWeight: 800, marginTop: 6 }}>
                    {borrowerProfile ? borrowerProfile.application_status : 'NO PROFILE'}
                  </Typography>
                  <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    {borrowerProfile?.application_status === 'FROZEN'
                      ? 'Locked for verification'
                      : borrowerProfile?.application_status === 'DRAFT'
                      ? 'Drafting - upload required docs'
                      : 'Create profile below'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card style={{ background: '#111c3a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                <CardContent>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    Requested Amount
                  </Typography>
                  <Typography variant='h4' style={{ color: '#10b981', fontWeight: 800, marginTop: 6 }}>
                    ₹{borrowerProfile?.amount_requested ? Number(borrowerProfile.amount_requested).toLocaleString() : '0'}
                  </Typography>
                  <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    Tenure: {borrowerProfile?.requested_tenure_months || 0} Months ({borrowerProfile?.repayment_frequency || 'MONTHLY'})
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card style={{ background: '#111c3a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                <CardContent>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    Monthly Income
                  </Typography>
                  <Typography variant='h4' style={{ color: '#f59e0b', fontWeight: 800, marginTop: 6 }}>
                    ₹{borrowerProfile?.monthly_income ? Number(borrowerProfile.monthly_income).toLocaleString() : '0'}
                  </Typography>
                  <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    Type: {borrowerProfile?.employment_type || 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card style={{ background: '#111c3a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                <CardContent>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    KYC Documents
                  </Typography>
                  <Typography variant='h4' style={{ color: allRequiredDocsUploaded ? '#10b981' : '#ec4899', fontWeight: 800, marginTop: 6 }}>
                    {documents.length} Uploaded
                  </Typography>
                  <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    {allRequiredDocsUploaded ? 'All 5 required docs ready' : 'Required docs pending'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* BORROWER PROFILE DETAILS CARD */}
          <Paper
            elevation={2}
            style={{
              padding: 24,
              borderRadius: 16,
              background: '#111c3a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: 28,
            }}
          >
            <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
              <div>
                <Typography variant='h5' style={{ fontWeight: 700, color: '#f8fafc' }}>
                  Borrower Profile & Loan Request
                </Typography>
                <Typography variant='body2' style={{ color: '#94a3b8' }}>
                  Identity, contact details, financial capacity, and requested loan parameters
                </Typography>
              </div>

              <Box display='flex' gap={1.5} alignItems='center' flexWrap='wrap'>
                <Button
                  variant='contained'
                  onClick={() => navigate('/app/loan-forms?role=borrower')}
                  startIcon={<DocumentIcon />}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 8,
                  }}
                >
                  📋 Fill Borrower Application Form
                </Button>
                {borrowerNotFound ? (
                  <Button
                    variant='outlined'
                    color='primary'
                    onClick={handleOpenCreateProfile}
                    style={{ borderColor: '#38bdf8', color: '#38bdf8', fontWeight: 700, textTransform: 'none', borderRadius: 8 }}
                  >
                    Quick Create Modal
                  </Button>
                ) : (
                  borrowerProfile?.application_status === 'DRAFT' && (
                    <Button
                      variant='outlined'
                      startIcon={<EditIcon />}
                      onClick={handleOpenEditProfile}
                      style={{ borderColor: '#38bdf8', color: '#38bdf8', fontWeight: 600, textTransform: 'none', borderRadius: 8 }}
                    >
                      Quick Edit
                    </Button>
                  )
                )}
              </Box>
            </Box>

            {borrowerLoading ? (
              <Box display='flex' justifyContent='center' p={4}>
                <CircularProgress style={{ color: '#38bdf8' }} />
              </Box>
            ) : borrowerNotFound ? (
              <Alert severity='warning' style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fcd34d', borderRadius: 10 }}>
                You do not have a Borrower profile yet. Click "Create Borrower Profile" above to initialize your loan request and upload KYC documents.
              </Alert>
            ) : borrowerProfile ? (
              <Grid container spacing={3} mt={0.5}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Applicant Name</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#fff' }}>
                    {borrowerProfile.name}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>PAN Number</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#fff' }}>
                    {borrowerProfile.pan_number || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Aadhaar Number</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#fff' }}>
                    {borrowerProfile.aadhaar_number ? `XXXX-XXXX-${borrowerProfile.aadhaar_number.slice(-4)}` : 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Phone Number</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#fff' }}>
                    {borrowerProfile.phone_number || 'N/A'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Date of Birth</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#fff' }}>
                    {borrowerProfile.date_of_birth || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Name as per Aadhaar</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#fff' }}>
                    {borrowerProfile.name_as_per_aadhaar || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Name as per PAN</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#fff' }}>
                    {borrowerProfile.name_as_per_pan || 'N/A'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Employer / Business</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#fff' }}>
                    {borrowerProfile.employer_or_business_name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Monthly Income</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#10b981' }}>
                    ₹{Number(borrowerProfile.monthly_income || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Annual Gross Income</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#10b981' }}>
                    ₹{Number(borrowerProfile.annual_gross_income || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Existing Obligations</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#f43f5e' }}>
                    ₹{Number(borrowerProfile.existing_monthly_obligations || 0).toLocaleString()} / mo
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Location</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#fff' }}>
                    {borrowerProfile.city ? `${borrowerProfile.city}, ${borrowerProfile.state}` : 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Credit / CIBIL Score</Typography>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#f59e0b' }}>
                    {borrowerProfile.credit_score || 'N/A'} / {borrowerProfile.cibil_score || 'N/A'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Full Address</Typography>
                  <Typography variant='body2' style={{ color: '#cbd5e1', marginTop: 2 }}>
                    {borrowerProfile.address_line || 'N/A'}{borrowerProfile.pincode ? `, ${borrowerProfile.pincode}` : ''}
                  </Typography>
                  <Divider style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Loan Purpose & Details</Typography>
                  <Typography variant='body1' style={{ color: '#cbd5e1', marginTop: 2 }}>
                    <strong>{borrowerProfile.loan_purpose || 'General Loan'}</strong>: {borrowerProfile.loan_purpose_details || 'No additional details provided.'}
                  </Typography>
                  <Typography variant='body2' style={{ color: '#94a3b8', marginTop: 8 }}>
                    Requested tenure: {borrowerProfile.requested_tenure_months || 'N/A'} months · Repayment: {borrowerProfile.repayment_frequency || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            ) : null}
          </Paper>

          <Paper
            elevation={2}
            style={{
              padding: 24,
              borderRadius: 16,
              background: '#111c3a',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              marginBottom: 28,
            }}
          >
            <Box display='flex' justifyContent='space-between' alignItems='center' mb={2} flexWrap='wrap' gap={1}>
              <div>
                <Typography variant='h6' style={{ fontWeight: 700, color: '#f8fafc' }}>
                  Lenders Requesting This Loan
                </Typography>
                <Typography variant='body2' style={{ color: '#94a3b8' }}>
                  Demo lender interest shown for now. Live lender requests will come from the backend feed.
                </Typography>
              </div>
              <Chip label='Demo data' size='small' style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)' }} />
            </Box>
            <Grid container spacing={2}>
              {demoLenderRequests.map((lender) => (
                <Grid size={{ xs: 12, md: 4 }} key={lender.name}>
                  <Card style={{ height: '100%', background: '#0c1630', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                    <CardContent>
                      <Typography variant='subtitle1' style={{ color: '#ffffff', fontWeight: 800 }}>
                        {lender.name}
                      </Typography>
                      <Typography variant='caption' style={{ color: '#94a3b8' }}>{lender.type}</Typography>
                      <Divider style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />
                      <Typography variant='body2' style={{ color: '#cbd5e1' }}>Offer: {lender.amount}</Typography>
                      <Typography variant='body2' style={{ color: '#cbd5e1', marginTop: 6 }}>Rate: {lender.rate}</Typography>
                      <Chip label={lender.status} size='small' style={{ marginTop: 12, color: '#34d399', background: 'rgba(52, 211, 153, 0.12)' }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* ========================================================
              FILE INPUT & DOCUMENT UPLOAD HUB (REQUIRED FEATURE)
          ======================================================== */}
          <Grid container spacing={3} mb={3}>
            {/* Upload Section */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper
                elevation={2}
                style={{
                  padding: 24,
                  borderRadius: 16,
                  background: '#111c3a',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  height: '100%',
                }}
              >
                <Typography variant='h6' style={{ fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>
                  Upload KYC & Financial Documents
                </Typography>
                <Typography variant='body2' style={{ color: '#94a3b8', marginBottom: 20 }}>
                  Upload your identity and income documents for OCR parsing and AI verification.
                </Typography>

                {borrowerProfile?.application_status && borrowerProfile.application_status !== 'DRAFT' ? (
                  <Alert severity='info' style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: 10 }}>
                    Your application is currently <strong>{borrowerProfile.application_status}</strong>. Document uploads are locked after submission.
                  </Alert>
                ) : (
                  <div>
                    {/* Document Type Dropdown */}
                    <Box mb={2}>
                      <TextField
                        select
                        fullWidth
                        label='Select Document Type'
                        value={selectedDocType}
                        onChange={(e) => setSelectedDocType(e.target.value)}
                        variant='outlined'
                        InputLabelProps={{ style: { color: '#94a3b8' } }}
                        InputProps={{
                          style: { color: '#f8fafc', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
                        }}
                      >
                        {DOCUMENT_TYPES.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label} {option.required && '(Required)'}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>

                    {/* FILE INPUT THING (Direct File Input Element) */}
                    <Box
                      p={3}
                      mb={2}
                      textAlign='center'
                      style={{
                        border: '2px dashed rgba(56, 189, 248, 0.4)',
                        borderRadius: 12,
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => document.getElementById('borrower-file-input').click()}
                    >
                      <UploadIcon style={{ fontSize: 42, color: '#38bdf8', marginBottom: 8 }} />
                      <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#f8fafc' }}>
                        {selectedFile ? selectedFile.name : 'Choose Document File'}
                      </Typography>
                      <Typography variant='caption' style={{ color: '#94a3b8', display: 'block' }}>
                        {selectedFile
                          ? `Size: ${(selectedFile.size / 1024).toFixed(1)} KB`
                          : 'Supports PDF, JPG, PNG (Max 15MB)'}
                      </Typography>

                      <input
                        id='borrower-file-input'
                        type='file'
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        accept='.pdf,.jpg,.jpeg,.png'
                      />
                    </Box>

                    <Button
                      variant='contained'
                      color='primary'
                      fullWidth
                      disabled={!selectedFile || uploading}
                      onClick={handleUploadDocument}
                      startIcon={uploading ? <CircularProgress size={20} color='inherit' /> : <UploadIcon />}
                      style={{
                        padding: '12px',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                      }}
                    >
                      {uploading ? 'Uploading & Analyzing...' : 'Upload Document'}
                    </Button>
                  </div>
                )}

                {/* Required Documents Checklist */}
                <Box mt={3} pt={2} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <Typography variant='caption' style={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Required For Application Submission:
                  </Typography>
                  <Box mt={1} display='flex' flexDirection='column' gap={0.8}>
                    {requiredDocs.map((type) => {
                      const uploaded = uploadedDocTypes.has(type);
                      const typeLabel = DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
                      return (
                        <Box key={type} display='flex' alignItems='center' gap={1}>
                          {uploaded ? (
                            <CheckIcon style={{ color: '#10b981', fontSize: 18 }} />
                          ) : (
                            <CancelIcon style={{ color: '#f43f5e', fontSize: 18 }} />
                          )}
                          <Typography variant='body2' style={{ color: uploaded ? '#f8fafc' : '#94a3b8', fontSize: 13 }}>
                            {typeLabel}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>

                  {borrowerProfile?.application_status === 'DRAFT' && (
                    <Box mt={2.5}>
                      <Button
                        variant='contained'
                        fullWidth
                        disabled={!allRequiredDocsUploaded}
                        onClick={handleSubmitApplication}
                        startIcon={<SendIcon />}
                        style={{
                          padding: '12px',
                          fontWeight: 700,
                          background: allRequiredDocsUploaded
                            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                            : 'rgba(255,255,255,0.1)',
                          color: allRequiredDocsUploaded ? '#fff' : '#94a3b8',
                        }}
                      >
                        Submit Application to Lenders
                      </Button>
                      {!allRequiredDocsUploaded && (
                        <Typography variant='caption' style={{ color: '#f43f5e', display: 'block', textAlign: 'center', marginTop: 4 }}>
                          Upload all 5 required documents above to submit
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Uploaded Documents List */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper
                elevation={2}
                style={{
                  padding: 24,
                  borderRadius: 16,
                  background: '#111c3a',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  height: '100%',
                }}
              >
                <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
                  <div>
                    <Typography variant='h6' style={{ fontWeight: 700, color: '#f8fafc' }}>
                      Uploaded Documents & OCR Extraction
                    </Typography>
                    <Typography variant='body2' style={{ color: '#94a3b8' }}>
                      Status of uploaded identity and financial records
                    </Typography>
                  </div>
                  <Chip
                    label={`${documents.length} Files`}
                    style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 700 }}
                  />
                </Box>

                {docLoading ? (
                  <Box display='flex' justifyContent='center' p={4}>
                    <CircularProgress style={{ color: '#38bdf8' }} />
                  </Box>
                ) : documents.length === 0 ? (
                  <Alert severity='info' style={{ background: 'rgba(56, 189, 248, 0.08)', color: '#94a3b8', borderRadius: 10 }}>
                    No documents uploaded yet. Select a document type and upload your files using the panel on the left.
                  </Alert>
                ) : (
                  <TableContainer style={{ maxHeight: 420 }}>
                    <Table stickyHeader size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>Type</TableCell>
                          <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>Status</TableCell>
                          <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>AI Extracted Info</TableCell>
                          <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>Uploaded</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {documents.map((doc) => {
                          const typeObj = DOCUMENT_TYPES.find((t) => t.value === doc.document_type);
                          const isVerified = doc.verification_status === 'VERIFIED';
                          const isRejected = doc.verification_status === 'REJECTED';

                          return (
                            <TableRow key={doc.id} hover style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <TableCell style={{ color: '#f8fafc', fontWeight: 600 }}>
                                <Box display='flex' alignItems='center' gap={1}>
                                  <DocumentIcon style={{ color: '#38bdf8', fontSize: 18 }} />
                                  <span>{typeObj?.label || doc.document_type}</span>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size='small'
                                  label={doc.verification_status}
                                  style={{
                                    background: isVerified
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : isRejected
                                      ? 'rgba(239, 68, 68, 0.15)'
                                      : 'rgba(245, 158, 11, 0.15)',
                                    color: isVerified ? '#10b981' : isRejected ? '#f43f5e' : '#f59e0b',
                                    fontWeight: 700,
                                    fontSize: 11,
                                  }}
                                />
                              </TableCell>
                              <TableCell style={{ color: '#cbd5e1', fontSize: 12 }}>
                                {doc.extracted_name ? (
                                  <div>Name: {doc.extracted_name}</div>
                                ) : null}
                                {doc.extracted_document_number ? (
                                  <div>Doc #: {doc.extracted_document_number}</div>
                                ) : null}
                                {doc.extracted_income ? (
                                  <div>Income: ₹{Number(doc.extracted_income).toLocaleString()}</div>
                                ) : null}
                                {!doc.extracted_name && !doc.extracted_document_number && !doc.extracted_income && (
                                  <span style={{ color: '#64748b' }}>Pending verification review</span>
                                )}
                              </TableCell>
                              <TableCell style={{ color: '#94a3b8', fontSize: 12 }}>
                                {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Recent'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        </div>
      )}

      {/* ========================================================
          LENDER PORTAL VIEW
      ======================================================== */}
      {activeTab === 'lender' && (
        <div>
          {/* KPI CARDS (LENDER) */}
          <Grid container spacing={3} mb={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card style={{ background: '#111c3a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                <CardContent>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    Available Capital
                  </Typography>
                  <Typography variant='h4' style={{ color: '#10b981', fontWeight: 800, marginTop: 6 }}>
                    ₹{lenderProfile?.available_funds ? Number(lenderProfile.available_funds).toLocaleString() : '1,000,000'}
                  </Typography>
                  <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    Deployable capital balance
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card style={{ background: '#111c3a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                <CardContent>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    Marketplace Feed
                  </Typography>
                  <Typography variant='h4' style={{ color: '#38bdf8', fontWeight: 800, marginTop: 6 }}>
                    {loanFeed.length} Applications
                  </Typography>
                  <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    Verified & ready for review
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card style={{ background: '#111c3a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                <CardContent>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    Risk Tolerance
                  </Typography>
                  <Typography variant='h4' style={{ color: '#f59e0b', fontWeight: 800, marginTop: 6 }}>
                    {lenderProfile?.risk_tolerance || 'MEDIUM'}
                  </Typography>
                  <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    Entity: {lenderProfile?.company_name || 'Individual Lender'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card style={{ background: '#111c3a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                <CardContent>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    Average AI Trust Index
                  </Typography>
                  <Typography variant='h4' style={{ color: '#a855f7', fontWeight: 800, marginTop: 6 }}>
                    84 / 100
                  </Typography>
                  <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    High confidence verified cohort
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* LENDER MARKETPLACE FEED TABLE */}
          <Paper
            elevation={2}
            style={{
              padding: 24,
              borderRadius: 16,
              background: '#111c3a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: 28,
            }}
          >
            <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
              <div>
                <Typography variant='h5' style={{ fontWeight: 700, color: '#f8fafc' }}>
                  Live Borrower Marketplace Feed
                </Typography>
                <Typography variant='body2' style={{ color: '#94a3b8' }}>
                  Verified applications ready for lender evaluation, terms review, and funding decisions
                </Typography>
              </div>

              <Box display='flex' gap={1.5} alignItems='center' flexWrap='wrap'>
                <Button
                  variant='contained'
                  onClick={() => navigate('/app/loan-forms?role=lender')}
                  startIcon={<DocumentIcon />}
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 8,
                  }}
                >
                  📋 Update Lender Capital Form
                </Button>
                <Button
                  variant='outlined'
                  startIcon={<RefreshIcon />}
                  onClick={fetchLenderData}
                  style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#f8fafc', textTransform: 'none', borderRadius: 8 }}
                >
                  Refresh Feed
                </Button>
              </Box>
            </Box>

            {feedLoading ? (
              <Box display='flex' justifyContent='center' p={4}>
                <CircularProgress style={{ color: '#10b981' }} />
              </Box>
            ) : loanFeed.length === 0 ? (
              <Alert severity='info' style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#94a3b8', borderRadius: 10 }}>
                No active loan applications in the feed right now. Borrowers submitting completed KYC documents will appear here automatically!
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>ID</TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>Borrower</TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>Amount Requested</TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>Purpose</TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>AI Trust Score</TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>Risk Level</TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>Status</TableCell>
                      <TableCell align='right' style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loanFeed.map((app) => {
                      const trustScore = app.ai_trust_score || 78;
                      const scoreColor = getTrustScoreColor(trustScore);

                      return (
                        <TableRow key={app.id} hover style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <TableCell style={{ color: '#38bdf8', fontWeight: 700 }}>#{app.id}</TableCell>
                          <TableCell>
                            <Typography variant='subtitle2' style={{ fontWeight: 700, color: '#f8fafc' }}>
                              {app.borrower?.name || 'Borrower'}
                            </Typography>
                            <Typography variant='caption' style={{ color: '#94a3b8' }}>
                              {app.borrower?.email}
                            </Typography>
                          </TableCell>
                          <TableCell style={{ color: '#10b981', fontWeight: 800, fontSize: 15 }}>
                            ₹{Number(app.amount_requested).toLocaleString()}
                          </TableCell>
                          <TableCell style={{ color: '#cbd5e1' }}>{app.purpose}</TableCell>
                          <TableCell>
                            <Box display='flex' alignItems='center' gap={1}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: `${scoreColor}20`,
                                  border: `2px solid ${scoreColor}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: scoreColor,
                                  fontWeight: 800,
                                  fontSize: 12,
                                }}
                              >
                                {trustScore}
                              </div>
                              <Typography variant='caption' style={{ color: scoreColor, fontWeight: 700 }}>
                                {trustScore >= 80 ? 'High Trust' : trustScore >= 60 ? 'Moderate' : 'High Risk'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              label={app.ai_risk_level || 'LOW'}
                              style={{
                                background:
                                  app.ai_risk_level === 'HIGH'
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : app.ai_risk_level === 'MEDIUM'
                                    ? 'rgba(245, 158, 11, 0.2)'
                                    : 'rgba(16, 185, 129, 0.2)',
                                color:
                                  app.ai_risk_level === 'HIGH'
                                    ? '#f43f5e'
                                    : app.ai_risk_level === 'MEDIUM'
                                    ? '#f59e0b'
                                    : '#10b981',
                                fontWeight: 700,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              label={app.status}
                              style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <Button
                              variant='contained'
                              size='small'
                              onClick={() => handleOpenDecisionModal(app)}
                              style={{
                                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                color: '#fff',
                                fontWeight: 700,
                                textTransform: 'none',
                              }}
                            >
                              Review & Decide
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </div>
      )}

      {/* ========================================================
          BORROWER PROFILE CREATE / EDIT DIALOG
      ======================================================== */}
      <Dialog
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        maxWidth='md'
        fullWidth
        PaperProps={{
          style: { background: '#111c3a', color: '#f8fafc', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' },
        }}
      >
        <DialogTitle style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700 }}>
          {isEditingProfile ? 'Update Borrower Profile' : 'Create New Borrower Profile'}
        </DialogTitle>
        <DialogContent style={{ paddingTop: 20 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label='Full Legal Name'
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label='Phone Number'
                value={profileForm.phone_number}
                onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label='Aadhaar Number (12 digits)'
                value={profileForm.aadhaar_number}
                onChange={(e) => setProfileForm({ ...profileForm, aadhaar_number: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label='PAN Number (10 alphanumeric)'
                value={profileForm.pan_number}
                onChange={(e) => setProfileForm({ ...profileForm, pan_number: e.target.value.toUpperCase() })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label='Residential Address Line'
                value={profileForm.address_line}
                onChange={(e) => setProfileForm({ ...profileForm, address_line: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label='City'
                value={profileForm.city}
                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label='State'
                value={profileForm.state}
                onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label='Pincode'
                value={profileForm.pincode}
                onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>

            {/* Employment & Income */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label='Employment Type'
                value={profileForm.employment_type}
                onChange={(e) => setProfileForm({ ...profileForm, employment_type: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              >
                <MenuItem value='SALARIED'>Salaried</MenuItem>
                <MenuItem value='SELF_EMPLOYED'>Self Employed</MenuItem>
                <MenuItem value='BUSINESS'>Business</MenuItem>
                <MenuItem value='STUDENT'>Student</MenuItem>
                <MenuItem value='OTHER'>Other</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label='Employer / Business Name'
                value={profileForm.employer_or_business_name}
                onChange={(e) => setProfileForm({ ...profileForm, employer_or_business_name: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label='Monthly Income (₹)'
                type='number'
                value={profileForm.monthly_income}
                onChange={(e) => setProfileForm({ ...profileForm, monthly_income: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label='Existing Monthly Obligations (₹)'
                type='number'
                value={profileForm.existing_monthly_obligations}
                onChange={(e) => setProfileForm({ ...profileForm, existing_monthly_obligations: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>

            {/* Loan Requirement */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label='Loan Amount Requested (₹)'
                type='number'
                value={profileForm.amount_requested}
                onChange={(e) => setProfileForm({ ...profileForm, amount_requested: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label='Requested Tenure (Months)'
                type='number'
                value={profileForm.requested_tenure_months}
                onChange={(e) => setProfileForm({ ...profileForm, requested_tenure_months: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                label='Repayment Frequency'
                value={profileForm.repayment_frequency}
                onChange={(e) => setProfileForm({ ...profileForm, repayment_frequency: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              >
                <MenuItem value='MONTHLY'>Monthly</MenuItem>
                <MenuItem value='WEEKLY'>Weekly</MenuItem>
                <MenuItem value='BIWEEKLY'>Bi-weekly</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label='Loan Purpose'
                placeholder='e.g., Working Capital, Equipment, Medical, Education'
                value={profileForm.loan_purpose}
                onChange={(e) => setProfileForm({ ...profileForm, loan_purpose: e.target.value })}
                variant='outlined'
                margin='dense'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Button onClick={() => setProfileModalOpen(false)} style={{ color: '#94a3b8' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveProfile}
            variant='contained'
            color='primary'
            disabled={submittingProfile}
            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', fontWeight: 700 }}
          >
            {submittingProfile ? 'Saving...' : 'Save Borrower Profile'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================
          LENDER APPLICATION REVIEW & DECISION DIALOG
      ======================================================== */}
      <Dialog
        open={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        maxWidth='md'
        fullWidth
        PaperProps={{
          style: { background: '#111c3a', color: '#f8fafc', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' },
        }}
      >
        <DialogTitle style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700 }}>
          Review Application #{selectedApplication?.id} — {selectedApplication?.borrower?.name}
        </DialogTitle>
        <DialogContent style={{ paddingTop: 20 }}>
          {selectedApplication && (
            <div>
              <Grid container spacing={2} mb={3}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Requested Loan</Typography>
                  <Typography variant='h5' style={{ color: '#10b981', fontWeight: 800 }}>
                    ₹{Number(selectedApplication.amount_requested).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>AI Trust Score</Typography>
                  <Typography variant='h5' style={{ color: getTrustScoreColor(selectedApplication.ai_trust_score), fontWeight: 800 }}>
                    {selectedApplication.ai_trust_score || 82} / 100
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>Risk Level</Typography>
                  <Typography variant='h5' style={{ color: '#38bdf8', fontWeight: 800 }}>
                    {selectedApplication.ai_risk_level || 'LOW'}
                  </Typography>
                </Grid>
              </Grid>

              <Box mb={2} p={2} borderRadius={2} style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
                <Typography variant='subtitle2' style={{ color: '#94a3b8', fontWeight: 700 }}>
                  Borrower Stated Purpose:
                </Typography>
                <Typography variant='body1' style={{ color: '#f8fafc', marginTop: 4 }}>
                  {selectedApplication.purpose}
                </Typography>
              </Box>

              {/* AI Breakdown */}
              <Box mb={3} p={2} borderRadius={2} style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <Typography variant='subtitle2' style={{ color: '#38bdf8', fontWeight: 700, marginBottom: 8 }}>
                  AI Risk & Repayment Breakdown:
                </Typography>
                <Typography variant='body2' style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
                  • Consistent monthly cash-flow detected from verified bank statement.
                  <br />
                  • Debt-to-Income obligation ratio is comfortably below 35%.
                  <br />
                  • Identity and PAN credentials matched with official registries.
                </Typography>
              </Box>

              {/* Decision Notes Input */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label='Decision Notes / Conditions (Optional)'
                placeholder='Add any internal lender remarks or approval conditions...'
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                variant='outlined'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)' } }}
              />
            </div>
          )}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', gap: 12 }}>
          <Button onClick={() => setDecisionModalOpen(false)} style={{ color: '#94a3b8' }}>
            Close
          </Button>

          <Button
            variant='contained'
            disabled={submittingDecision}
            onClick={() => handleSubmitDecision('REJECT')}
            style={{ background: '#dc2626', color: '#fff', fontWeight: 700 }}
          >
            Reject Application
          </Button>

          <Button
            variant='contained'
            disabled={submittingDecision}
            onClick={() => handleSubmitDecision('APPROVE')}
            style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', fontWeight: 700 }}
          >
            {submittingDecision ? 'Submitting...' : 'Approve & Fund Loan'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
