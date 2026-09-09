import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  LinearProgress,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  AutoMode as ProcessIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Launch as LaunchIcon,
  Person as PersonIcon,
  AccountBalance as BankIcon,
  Description as DocumentIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  Timeline as TimelineIcon,
  InfoOutlined as InfoIcon,
  FactCheck as FactCheckIcon,
  RateReview as ValidateIcon,
} from '@mui/icons-material';

import { showSnackbar } from '../../components/Snackbar';
import companyService from '../../services/companyService';

// Format Indian Rupee currency
const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num) || num === 0) return '₹0';
  return '₹' + num.toLocaleString('en-IN');
};

// Format dates nicely
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

// Application Timeline stages
const TIMELINE_STAGES = [
  { id: 'DRAFT', label: 'Draft', desc: 'Initial application' },
  { id: 'SUBMITTED', label: 'Submitted', desc: 'Profile completed' },
  { id: 'FROZEN', label: 'Frozen', desc: 'Locked for audit' },
  { id: 'UNDER_VERIFICATION', label: 'Under Verification', desc: 'Document OCR & KYC' },
  { id: 'REVERIFICATION', label: 'Reverification', desc: 'Corrections required' },
  { id: 'VERIFIED', label: 'Verified', desc: 'Identity & docs confirmed' },
  { id: 'RISK_ASSESSMENT', label: 'Risk Assessment', desc: '4-Layer risk scoring' },
  { id: 'COMPLETED', label: 'Completed', desc: 'Decision issued' },
];

export default function BorrowerReviewPage() {
  const { borrowerId } = useParams();
  const navigate = useNavigate();

  // Borrower and document state
  const [borrower, setBorrower] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Document processing trigger state
  const [processingDocId, setProcessingDocId] = useState(null);

  // Document viewer modal state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);

  // Admin validation modal state
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationAction, setValidationAction] = useState('VERIFY');
  const [validationNotes, setValidationNotes] = useState('');
  const [validating, setValidating] = useState(false);

  const handleOpenValidation = () => {
    setValidationAction('VERIFY');
    setValidationNotes('');
    setValidationModalOpen(true);
  };

  const handleSubmitValidation = async () => {
    setValidating(true);
    try {
      await companyService.validateBorrower(borrowerId, {
        action: validationAction,
        notes: validationNotes,
      });
      showSnackbar({
        type: 'success',
        message: `Borrower validation status updated to ${validationAction}!`,
      });
      setValidationModalOpen(false);
      await fetchBorrowerDetail();
    } catch (err) {
      console.error('Validation action failed:', err);
      showSnackbar({
        type: 'error',
        message: err.response?.data?.error || err.response?.data?.detail || 'Failed to submit validation decision.',
      });
    } finally {
      setValidating(false);
    }
  };

  // Fetch borrower details
  const fetchBorrowerDetail = useCallback(async () => {
    if (!borrowerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await companyService.getBorrower(borrowerId);
      setBorrower(data);
    } catch (err) {
      console.error('Failed to load borrower review:', err);
      setError(err.response?.data?.detail || 'Failed to load borrower application details.');
      showSnackbar({
        type: 'error',
        message: 'Could not fetch borrower details.',
      });
    } finally {
      setLoading(false);
    }
  }, [borrowerId]);

  useEffect(() => {
    fetchBorrowerDetail();
  }, [fetchBorrowerDetail]);

  // Handle OCR Document Process / Reprocess
  const handleProcessDocument = async (documentId) => {
    setProcessingDocId(documentId);
    try {
      showSnackbar({
        type: 'info',
        message: 'Running OCR extraction & identity cross-validation...',
      });
      await companyService.processDocument(documentId);
      showSnackbar({
        type: 'success',
        message: 'Document OCR processed successfully!',
      });
      // Refresh borrower data to update document extractions & verification flags
      await fetchBorrowerDetail();
    } catch (err) {
      console.error('Failed to process document:', err);
      showSnackbar({
        type: 'error',
        message: err.response?.data?.detail || 'Document OCR processing failed.',
      });
    } finally {
      setProcessingDocId(null);
    }
  };

  // Open Document Viewer
  const handleViewDocument = (doc) => {
    setActiveDoc(doc);
    setViewerOpen(true);
  };

  // Compute Timeline Active Index
  const currentStageIndex = useMemo(() => {
    if (!borrower) return 0;
    const aStatus = (borrower.application_status || 'DRAFT').toUpperCase();
    const vStatus = (borrower.verification?.verification_status || borrower.verification_status || '').toUpperCase();
    const hasLoanApp = Boolean(borrower.loan_application);

    if (aStatus === 'APPROVED' || aStatus === 'REJECTED') return 7; // Completed
    if (hasLoanApp || borrower.decision_engine) return 6; // Risk Assessment
    if (vStatus === 'VERIFIED' || aStatus === 'VERIFIED') return 5; // Verified
    if (vStatus === 'REVERIFICATION' || aStatus === 'REVERIFICATION') return 4; // Reverification
    if (vStatus === 'NEEDS_REVIEW' || aStatus === 'UNDER_VERIFICATION') return 3; // Under Verification
    if (aStatus === 'FROZEN') return 2; // Frozen
    if (aStatus === 'SUBMITTED') return 1; // Submitted
    return 0; // Draft
  }, [borrower]);

  // Extraction of intelligence details
  const verification = borrower?.verification || null;
  const decisionEngine = borrower?.decision_engine || null;
  const loanApplication = borrower?.loan_application || null;
  const documents = borrower?.documents || [];

  // Verification intelligence badges
  const identityMatchStatus = verification?.identity_match || 'PENDING';
  const docStatus = verification?.document_status || 'MISSING';
  const consistencyStatus = verification?.consistency_status || 'PENDING';
  const overallVerificationStatus = verification?.verification_status || borrower?.verification_status || 'PENDING';
  const confidenceScore = verification?.confidence_score ?? null;

  // Render Verification Badge (PASS / FLAG / REVERIFY / PENDING)
  const renderVerificationIndicator = (status) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'PASS' || s === 'VERIFIED' || s === 'MATCH' || s === 'CONSISTENT') {
      return (
        <Chip
          icon={<CheckCircleIcon style={{ color: '#10b981', fontSize: 16 }} />}
          label={s === 'VERIFIED' ? 'PASS' : s}
          style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, fontSize: 12 }}
        />
      );
    }
    if (s === 'REVERIFY' || s === 'REVERIFICATION' || s === 'MINOR_MISMATCH') {
      return (
        <Chip
          icon={<WarningIcon style={{ color: '#f59e0b', fontSize: 16 }} />}
          label={s === 'REVERIFICATION' ? 'REVERIFY' : s}
          style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 800, fontSize: 12 }}
        />
      );
    }
    if (s === 'FLAG' || s === 'NEEDS_REVIEW' || s === 'MISMATCH' || s === 'MAJOR_MISMATCH' || s === 'FAILED') {
      return (
        <Chip
          icon={<ErrorIcon style={{ color: '#f43f5e', fontSize: 16 }} />}
          label={s === 'NEEDS_REVIEW' ? 'FLAG' : s}
          style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', fontWeight: 800, fontSize: 12 }}
        />
      );
    }
    return (
      <Chip
        icon={<InfoIcon style={{ color: '#94a3b8', fontSize: 16 }} />}
        label='PENDING'
        style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}
      />
    );
  };

  if (loading) {
    return (
      <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center' minHeight='70vh'>
        <CircularProgress style={{ color: '#38bdf8' }} size={48} />
        <Typography variant='body1' style={{ color: '#94a3b8', marginTop: 18, fontWeight: 600 }}>
          Loading borrower application & verification intelligence...
        </Typography>
      </Box>
    );
  }

  if (error || !borrower) {
    return (
      <Box p={4}>
        <Button
          variant='outlined'
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/company')}
          style={{ color: '#38bdf8', borderColor: 'rgba(255,255,255,0.15)', marginBottom: 20 }}
        >
          Back to Applications
        </Button>
        <Alert severity='error' style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f8fafc', borderRadius: 10 }}>
          {error || 'Borrower not found or access denied.'}
        </Alert>
      </Box>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 60 }}>
      {/* TOP BAR / NAVIGATION */}
      <Box display='flex' justifyContent='space-between' alignItems='center' flexWrap='wrap' gap={2} mb={3}>
        <Box display='flex' alignItems='center' gap={2}>
          <IconButton
            onClick={() => navigate('/app/company')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#38bdf8',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <div>
            <Box display='flex' alignItems='center' gap={1.5}>
              <Typography variant='h4' style={{ fontWeight: 800, color: '#f8fafc' }}>
                {borrower.name || 'Borrower Application'}
              </Typography>
              <Chip
                size='small'
                label={`#APP-${borrower.id}`}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontWeight: 800,
                  fontSize: 12,
                }}
              />
            </Box>
            <Typography variant='caption' style={{ color: '#94a3b8' }}>
              PAN: {borrower.pan_number || 'N/A'} • Phone: {borrower.phone_number || 'N/A'} • Submitted:{' '}
              {formatDate(borrower.submitted_at)}
            </Typography>
          </div>
        </Box>

        <Box display='flex' alignItems='center' gap={1.5}>
          <Button
            variant='contained'
            onClick={handleOpenValidation}
            startIcon={<ValidateIcon />}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            Validate / Decide
          </Button>
          <Button
            variant='outlined'
            onClick={fetchBorrowerDetail}
            startIcon={<RefreshIcon />}
            style={{
              borderColor: 'rgba(255, 255, 255, 0.15)',
              color: '#38bdf8',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 8,
            }}
          >
            Refresh Intel
          </Button>
        </Box>
      </Box>

      {/* APPLICATION LIFECYCLE TIMELINE */}
      <Paper
        elevation={2}
        style={{
          padding: '20px 24px',
          borderRadius: 16,
          background: '#111c3a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 28,
        }}
      >
        <Box display='flex' alignItems='center' gap={1} mb={2}>
          <TimelineIcon style={{ color: '#38bdf8', fontSize: 20 }} />
          <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#f8fafc' }}>
            Application Lifecycle Timeline
          </Typography>
        </Box>

        <Box
          display='flex'
          alignItems='center'
          justifyContent='space-between'
          style={{ overflowX: 'auto', paddingBottom: 8 }}
        >
          {TIMELINE_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            return (
              <React.Fragment key={stage.id}>
                <Box
                  display='flex'
                  flexDirection='column'
                  alignItems='center'
                  textAlign='center'
                  style={{ minWidth: 100 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                      background: isCompleted
                        ? '#10b981'
                        : isCurrent
                        ? '#38bdf8'
                        : 'rgba(255, 255, 255, 0.08)',
                      color: isCompleted || isCurrent ? '#07111f' : '#64748b',
                      border: isCurrent ? '3px solid rgba(56, 189, 248, 0.4)' : 'none',
                      boxShadow: isCurrent ? '0 0 16px rgba(56, 189, 248, 0.6)' : 'none',
                      marginBottom: 8,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {isCompleted ? <CheckCircleIcon style={{ fontSize: 20 }} /> : idx + 1}
                  </div>
                  <Typography
                    variant='caption'
                    style={{
                      fontWeight: isCurrent ? 800 : 600,
                      color: isCompleted ? '#10b981' : isCurrent ? '#38bdf8' : '#64748b',
                      fontSize: 11,
                    }}
                  >
                    {stage.label}
                  </Typography>
                </Box>
                {idx < TIMELINE_STAGES.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      background: idx < currentStageIndex ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                      margin: '0 8px',
                      marginBottom: 24,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </Box>
      </Paper>

      {/* GRID: BORROWER PROFILE & LOAN REQUEST */}
      <Grid container spacing={3} mb={3}>
        {/* SECTION 1: BORROWER PROFILE */}
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
            <Box display='flex' alignItems='center' gap={1} mb={2.5}>
              <PersonIcon style={{ color: '#38bdf8' }} />
              <Typography variant='h6' style={{ fontWeight: 700, color: '#f8fafc' }}>
                1. Borrower Profile
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {/* Declared Name */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Declared Legal Name
                </Typography>
                <Typography variant='body1' style={{ fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                  {borrower.name || 'N/A'}
                </Typography>
              </Grid>

              {/* Date of Birth */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Date of Birth
                </Typography>
                <Typography variant='body1' style={{ fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                  {borrower.date_of_birth ? formatDate(borrower.date_of_birth).split(',')[0] : 'N/A'}
                </Typography>
              </Grid>

              {/* Name as per Aadhaar */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Name as per Aadhaar
                </Typography>
                <Box display='flex' alignItems='center' gap={1} mt={0.5}>
                  <Typography variant='body1' style={{ fontWeight: 600, color: '#cbd5e1' }}>
                    {borrower.name_as_per_aadhaar || 'Pending extraction'}
                  </Typography>
                  {borrower.name_as_per_aadhaar && (
                    <Chip
                      size='small'
                      label={
                        borrower.name.trim().toLowerCase() === borrower.name_as_per_aadhaar.trim().toLowerCase()
                          ? 'Exact Match'
                          : 'Name Differs'
                      }
                      style={{
                        background:
                          borrower.name.trim().toLowerCase() === borrower.name_as_per_aadhaar.trim().toLowerCase()
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                        color:
                          borrower.name.trim().toLowerCase() === borrower.name_as_per_aadhaar.trim().toLowerCase()
                            ? '#10b981'
                            : '#f59e0b',
                        fontWeight: 700,
                        fontSize: 10,
                        height: 20,
                      }}
                    />
                  )}
                </Box>
              </Grid>

              {/* Name as per PAN */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Name as per PAN
                </Typography>
                <Box display='flex' alignItems='center' gap={1} mt={0.5}>
                  <Typography variant='body1' style={{ fontWeight: 600, color: '#cbd5e1' }}>
                    {borrower.name_as_per_pan || 'Pending extraction'}
                  </Typography>
                  {borrower.name_as_per_pan && (
                    <Chip
                      size='small'
                      label={
                        borrower.name.trim().toLowerCase() === borrower.name_as_per_pan.trim().toLowerCase()
                          ? 'Exact Match'
                          : 'Name Differs'
                      }
                      style={{
                        background:
                          borrower.name.trim().toLowerCase() === borrower.name_as_per_pan.trim().toLowerCase()
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                        color:
                          borrower.name.trim().toLowerCase() === borrower.name_as_per_pan.trim().toLowerCase()
                            ? '#10b981'
                            : '#f59e0b',
                        fontWeight: 700,
                        fontSize: 10,
                        height: 20,
                      }}
                    />
                  )}
                </Box>
              </Grid>

              {/* Phone & Email */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Contact Information
                </Typography>
                <Typography variant='body2' style={{ color: '#f8fafc', marginTop: 2 }}>
                  {borrower.phone_number || 'No phone'} • {borrower.email || 'No email'}
                </Typography>
              </Grid>

              {/* Address */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Residential Address
                </Typography>
                <Typography variant='body2' style={{ color: '#cbd5e1', marginTop: 2 }}>
                  {[borrower.address_line, borrower.city, borrower.state, borrower.pincode]
                    .filter(Boolean)
                    .join(', ') || 'N/A'}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.06)', margin: '8px 0' }} />
              </Grid>

              {/* Employment & Employer */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Employment Type & Employer
                </Typography>
                <Typography variant='body1' style={{ fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                  {borrower.employment_type || 'N/A'}
                </Typography>
                <Typography variant='caption' style={{ color: '#64748b' }}>
                  {borrower.employer_or_business_name || 'Individual / Unspecified'}
                </Typography>
              </Grid>

              {/* Monthly & Annual Income */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Monthly & Annual Income
                </Typography>
                <Typography variant='body1' style={{ fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                  {formatCurrency(borrower.monthly_income)} / month
                </Typography>
                <Typography variant='caption' style={{ color: '#94a3b8' }}>
                  Gross Annual: {formatCurrency(borrower.annual_gross_income)}
                </Typography>
              </Grid>

              {/* Existing Monthly Obligations */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Existing Monthly Obligations (EMIs)
                </Typography>
                <Typography variant='body1' style={{ fontWeight: 700, color: '#f59e0b', marginTop: 2 }}>
                  {formatCurrency(borrower.existing_monthly_obligations)}
                </Typography>
              </Grid>

              {/* Credit / CIBIL Score */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Credit / CIBIL Score
                </Typography>
                <Box display='flex' alignItems='center' gap={1.5} mt={0.5}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background:
                        (borrower.cibil_score || borrower.credit_score || 0) >= 750
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                      border:
                        (borrower.cibil_score || borrower.credit_score || 0) >= 750
                          ? '2px solid #10b981'
                          : '2px solid #f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color:
                        (borrower.cibil_score || borrower.credit_score || 0) >= 750 ? '#10b981' : '#f59e0b',
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    {borrower.cibil_score || borrower.credit_score || 'N/A'}
                  </div>
                  <div>
                    <Typography variant='body2' style={{ fontWeight: 700, color: '#f8fafc' }}>
                      {(borrower.cibil_score || borrower.credit_score || 0) >= 750
                        ? 'Excellent Credit'
                        : (borrower.cibil_score || borrower.credit_score || 0) >= 650
                        ? 'Fair Credit'
                        : 'Low / Unrated'}
                    </Typography>
                    <Typography variant='caption' style={{ color: '#64748b' }}>
                      Official Bureau Data
                    </Typography>
                  </div>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* SECTION 2: LOAN REQUEST */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            elevation={2}
            style={{
              padding: 24,
              borderRadius: 16,
              background: '#111c3a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Box display='flex' alignItems='center' gap={1} mb={2.5}>
                <BankIcon style={{ color: '#10b981' }} />
                <Typography variant='h6' style={{ fontWeight: 700, color: '#f8fafc' }}>
                  2. Loan Request
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Amount Requested
                </Typography>
                <Typography variant='h3' style={{ fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                  {formatCurrency(borrower.amount_requested)}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                    Requested Tenure
                  </Typography>
                  <Typography variant='body1' style={{ fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                    {borrower.requested_tenure_months || 12} Months
                  </Typography>
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                    Repayment Frequency
                  </Typography>
                  <Typography variant='body1' style={{ fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                    {borrower.repayment_frequency || 'MONTHLY'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                    Loan Purpose
                  </Typography>
                  <Typography variant='body1' style={{ fontWeight: 600, color: '#f8fafc', marginTop: 2 }}>
                    {borrower.loan_purpose || 'General / Business Funding'}
                  </Typography>
                  {borrower.loan_purpose_details && (
                    <Typography variant='body2' style={{ color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>
                      "{borrower.loan_purpose_details}"
                    </Typography>
                  )}
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                    Application Status & Lock
                  </Typography>
                  <Box display='flex' alignItems='center' gap={1} mt={1}>
                    <Chip
                      label={borrower.application_status}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        fontWeight: 700,
                      }}
                    />
                    {borrower.frozen_at && (
                      <Typography variant='caption' style={{ color: '#94a3b8' }}>
                        Frozen on: {formatDate(borrower.frozen_at)}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </div>
          </Paper>
        </Grid>
      </Grid>

      {/* SECTION 3: DOCUMENTS & OCR EXTRACTION */}
      <Paper
        elevation={2}
        style={{
          borderRadius: 16,
          background: '#111c3a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 28,
          overflow: 'hidden',
        }}
      >
        <Box
          padding='20px 24px'
          display='flex'
          justifyContent='space-between'
          alignItems='center'
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <Box display='flex' alignItems='center' gap={1}>
            <DocumentIcon style={{ color: '#38bdf8' }} />
            <div>
              <Typography variant='h6' style={{ fontWeight: 700, color: '#f8fafc' }}>
                3. KYC & Financial Documents ({documents.length} Uploaded)
              </Typography>
              <Typography variant='caption' style={{ color: '#94a3b8' }}>
                Inspect OCR extracted metadata, verify cross-document matching, or trigger re-processing
              </Typography>
            </div>
          </Box>
        </Box>

        {documents.length === 0 ? (
          <Box p={4} textAlign='center'>
            <Typography variant='body2' style={{ color: '#94a3b8' }}>
              No documents have been uploaded for this borrower application yet.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>
                    Document Type
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>
                    Status
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>
                    OCR Status
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>
                    Extracted Name
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>
                    Doc ID Number
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>
                    Extracted Date
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>
                    Extracted Income
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}>
                    Uploaded Date
                  </TableCell>
                  <TableCell
                    align='right'
                    style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700 }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => {
                  const isProcessing = processingDocId === doc.id;
                  const ocrStatus = doc.ocr_status || (doc.raw_ocr_text ? 'COMPLETED' : 'PENDING');

                  // Resolved extracted values
                  const extName =
                    doc.extracted_name ||
                    doc.extracted_data?.fields?.name ||
                    (ocrStatus === 'PENDING' ? 'Pending' : 'Not extracted');
                  const extNumber =
                    doc.extracted_document_number ||
                    doc.extracted_data?.fields?.pan ||
                    doc.extracted_data?.fields?.aadhaar_number ||
                    (ocrStatus === 'PENDING' ? 'Pending' : 'N/A');
                  const extDate =
                    doc.extracted_date ||
                    doc.extracted_data?.fields?.date_of_birth ||
                    (ocrStatus === 'PENDING' ? 'Pending' : 'N/A');
                  const extIncome =
                    doc.extracted_income != null
                      ? formatCurrency(doc.extracted_income)
                      : doc.extracted_data?.fields?.income != null
                      ? formatCurrency(doc.extracted_data?.fields?.income)
                      : 'N/A';

                  return (
                    <TableRow key={doc.id} hover style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {/* Document Type */}
                      <TableCell style={{ color: '#f8fafc', fontWeight: 700 }}>
                        <Box display='flex' alignItems='center' gap={1}>
                          <Chip
                            size='small'
                            label={doc.document_type}
                            style={{
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          />
                        </Box>
                        {doc.verification_notes && (
                          <Typography variant='caption' style={{ color: '#94a3b8', display: 'block', marginTop: 2 }}>
                            {doc.verification_notes}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Verification Status */}
                      <TableCell>{renderVerificationIndicator(doc.verification_status)}</TableCell>

                      {/* OCR Status */}
                      <TableCell>
                        <Chip
                          size='small'
                          label={ocrStatus}
                          style={{
                            background:
                              ocrStatus === 'COMPLETED'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : ocrStatus === 'FAILED'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              ocrStatus === 'COMPLETED'
                                ? '#10b981'
                                : ocrStatus === 'FAILED'
                                ? '#ef4444'
                                : '#f59e0b',
                            fontWeight: 700,
                            fontSize: 10,
                          }}
                        />
                      </TableCell>

                      {/* Extracted Name */}
                      <TableCell style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 600 }}>{extName}</TableCell>

                      {/* Extracted Document Number */}
                      <TableCell style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700 }}>{extNumber}</TableCell>

                      {/* Extracted Date */}
                      <TableCell style={{ color: '#94a3b8', fontSize: 13 }}>{extDate}</TableCell>

                      {/* Extracted Income */}
                      <TableCell style={{ color: '#10b981', fontSize: 13, fontWeight: 700 }}>{extIncome}</TableCell>

                      {/* Uploaded Date */}
                      <TableCell style={{ color: '#94a3b8', fontSize: 12 }}>{formatDate(doc.uploaded_at)}</TableCell>

                      {/* Actions */}
                      <TableCell align='right'>
                        <Box display='flex' justifyContent='flex-end' gap={1}>
                          {/* View Document */}
                          <Tooltip title='Open document viewer'>
                            <Button
                              variant='outlined'
                              size='small'
                              onClick={() => handleViewDocument(doc)}
                              startIcon={<ViewIcon style={{ fontSize: 16 }} />}
                              style={{
                                borderColor: 'rgba(255, 255, 255, 0.15)',
                                color: '#38bdf8',
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: 11,
                              }}
                            >
                              View
                            </Button>
                          </Tooltip>

                          {/* Process / Reprocess */}
                          <Tooltip title='Run or re-run OCR & identity verification'>
                            <Button
                              variant='contained'
                              size='small'
                              disabled={isProcessing}
                              onClick={() => handleProcessDocument(doc.id)}
                              startIcon={
                                isProcessing ? (
                                  <CircularProgress size={14} style={{ color: '#fff' }} />
                                ) : (
                                  <ProcessIcon style={{ fontSize: 16 }} />
                                )
                              }
                              style={{
                                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                                color: '#fff',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: 11,
                              }}
                            >
                              {isProcessing ? 'Processing' : 'Process OCR'}
                            </Button>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* SECTION 4: VERIFICATION INTELLIGENCE CARD */}
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
        <Box display='flex' justifyContent='space-between' alignItems='center' flexWrap='wrap' gap={2} mb={3}>
          <Box display='flex' alignItems='center' gap={1.5}>
            <FactCheckIcon style={{ color: '#38bdf8', fontSize: 26 }} />
            <div>
              <Typography variant='h6' style={{ fontWeight: 700, color: '#f8fafc' }}>
                4. Verification Intelligence
              </Typography>
              <Typography variant='caption' style={{ color: '#94a3b8' }}>
                Automated cross-check between declared borrower input and OCR-extracted document records
              </Typography>
            </div>
          </Box>

          <Box display='flex' alignItems='center' gap={1}>
            <Typography variant='caption' style={{ color: '#94a3b8' }}>
              Verification Status:
            </Typography>
            {renderVerificationIndicator(overallVerificationStatus)}
          </Box>
        </Box>

        <Grid container spacing={2.5} mb={2}>
          {/* Identity Match */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
              }}
            >
              <CardContent>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Identity Match
                </Typography>
                <Box mt={1}>{renderVerificationIndicator(identityMatchStatus)}</Box>
                <Typography variant='caption' style={{ color: '#64748b', display: 'block', marginTop: 6 }}>
                  Declared vs PAN/Aadhaar Name
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Document Status */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
              }}
            >
              <CardContent>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Document Status
                </Typography>
                <Box mt={1}>
                  <Chip
                    size='small'
                    label={docStatus}
                    style={{
                      background: docStatus === 'COMPLETE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: docStatus === 'COMPLETE' ? '#10b981' : '#f59e0b',
                      fontWeight: 700,
                    }}
                  />
                </Box>
                <Typography variant='caption' style={{ color: '#64748b', display: 'block', marginTop: 6 }}>
                  Completeness of Primary Docs
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Cross-Document Consistency */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
              }}
            >
              <CardContent>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Consistency Status
                </Typography>
                <Box mt={1}>{renderVerificationIndicator(consistencyStatus)}</Box>
                <Typography variant='caption' style={{ color: '#64748b', display: 'block', marginTop: 6 }}>
                  Cross-document Name & DOB
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Confidence Score */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
              }}
            >
              <CardContent>
                <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                  Confidence Score
                </Typography>
                <Typography variant='h5' style={{ color: '#38bdf8', fontWeight: 800, marginTop: 4 }}>
                  {confidenceScore !== null && confidenceScore > 0 ? `${confidenceScore}%` : 'Pending'}
                </Typography>
                <Typography variant='caption' style={{ color: '#64748b', display: 'block' }}>
                  Provider: {verification?.provider || 'OCR Engine'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Verification Flags & Explanation Section */}
        {verification?.flags && verification.flags.length > 0 ? (
          <Box mt={2}>
            <Typography variant='subtitle2' style={{ color: '#f43f5e', fontWeight: 700, marginBottom: 8 }}>
              Detected Verification Flags ({verification.flags.length}):
            </Typography>
            <Grid container spacing={1.5}>
              {verification.flags.map((flag, idx) => (
                <Grid size={{ xs: 12 }} key={idx}>
                  <Alert
                    severity={flag.severity === 'HIGH' ? 'error' : 'warning'}
                    style={{
                      background:
                        flag.severity === 'HIGH' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      color: '#f8fafc',
                      borderRadius: 10,
                      border:
                        flag.severity === 'HIGH'
                          ? '1px solid rgba(244, 63, 94, 0.3)'
                          : '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <strong>{flag.type || 'MISMATCH'}:</strong> {flag.message || JSON.stringify(flag)}
                  </Alert>
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : (
          <Alert
            severity='info'
            style={{
              background: 'rgba(56, 189, 248, 0.08)',
              color: '#cbd5e1',
              borderRadius: 10,
              marginTop: 10,
            }}
          >
            {documents.length > 0
              ? 'No active fraud or identity flags detected. Documents and profile records pass primary consistency rules.'
              : 'Awaiting document upload and verification processing to establish automated trust.'}
          </Alert>
        )}
      </Paper>

      {/* SECTION 5: RISK & FRAUD SECTION (4-LAYER UNDERWRITING ENGINE) */}
      <Paper
        elevation={2}
        style={{
          padding: 24,
          borderRadius: 16,
          background: '#111c3a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Box display='flex' justifyContent='space-between' alignItems='center' flexWrap='wrap' gap={2} mb={3}>
          <Box display='flex' alignItems='center' gap={1.5}>
            <SecurityIcon style={{ color: '#10b981', fontSize: 26 }} />
            <div>
              <Typography variant='h6' style={{ fontWeight: 700, color: '#f8fafc' }}>
                5. Risk & Fraud Intelligence (4-Layer Underwriting Engine)
              </Typography>
              <Typography variant='caption' style={{ color: '#94a3b8' }}>
                Progressive underwriting: Layer 2 (Trust) + Layer 3 (Financial Capacity) → Layer 4 (Personalized Terms)
              </Typography>
            </div>
          </Box>

          {decisionEngine && (
            <Chip
              icon={<SpeedIcon style={{ fontSize: 16, color: '#10b981' }} />}
              label={`Composite Score: ${decisionEngine.composite_score || 0}/100`}
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                fontWeight: 800,
                fontSize: 13,
              }}
            />
          )}
        </Box>

        {/* 4 CARDS: TRUST SCORE, CREDIT RISK, FRAUD RISK, COMPOSITE DECISION */}
        <Grid container spacing={3}>
          {/* Card 1: Trust Score (Layer 2) */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                height: '100%',
              }}
            >
              <CardContent>
                <Box display='flex' justifyContent='space-between' alignItems='center' mb={1.5}>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#38bdf8' }}>
                    Layer 2: OCR Trust Score
                  </Typography>
                  <Chip
                    label={`${decisionEngine?.trust_score ?? 0} / 100`}
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      fontWeight: 800,
                    }}
                  />
                </Box>
                <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
                  Cross-validates declared profile with OCR extractions to measure integrity and prevent fraud.
                </Typography>

                <Box display='flex' flexDirection='column' gap={1.5}>
                  {/* Name match */}
                  <Box display='flex' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2' style={{ color: '#cbd5e1' }}>
                      Name Matching (+30 pts)
                    </Typography>
                    <Chip
                      size='small'
                      label={
                        decisionEngine?.trust_breakdown?.name_match
                          ? '+30 Points'
                          : decisionEngine
                          ? '0 Points'
                          : 'Pending'
                      }
                      style={{
                        background: decisionEngine?.trust_breakdown?.name_match
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(255,255,255,0.06)',
                        color: decisionEngine?.trust_breakdown?.name_match ? '#10b981' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    />
                  </Box>

                  {/* ID number match */}
                  <Box display='flex' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2' style={{ color: '#cbd5e1' }}>
                      ID Number Matching (+25 pts)
                    </Typography>
                    <Chip
                      size='small'
                      label={
                        decisionEngine?.trust_breakdown?.id_match
                          ? '+25 Points'
                          : decisionEngine
                          ? '0 Points'
                          : 'Pending'
                      }
                      style={{
                        background: decisionEngine?.trust_breakdown?.id_match
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(255,255,255,0.06)',
                        color: decisionEngine?.trust_breakdown?.id_match ? '#10b981' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    />
                  </Box>

                  {/* Income match */}
                  <Box display='flex' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2' style={{ color: '#cbd5e1' }}>
                      Income Verification (+25 pts)
                    </Typography>
                    <Chip
                      size='small'
                      label={
                        decisionEngine?.trust_breakdown?.income_match
                          ? '+25 Points'
                          : decisionEngine
                          ? '0 Points'
                          : 'Pending'
                      }
                      style={{
                        background: decisionEngine?.trust_breakdown?.income_match
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(255,255,255,0.06)',
                        color: decisionEngine?.trust_breakdown?.income_match ? '#10b981' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    />
                  </Box>

                  {/* Document presence */}
                  <Box display='flex' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2' style={{ color: '#cbd5e1' }}>
                      Document Completeness (+20 pts)
                    </Typography>
                    <Chip
                      size='small'
                      label={
                        decisionEngine?.trust_breakdown?.doc_presence_match
                          ? '+20 Points'
                          : decisionEngine
                          ? '0 Points'
                          : 'Pending'
                      }
                      style={{
                        background: decisionEngine?.trust_breakdown?.doc_presence_match
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(255,255,255,0.06)',
                        color: decisionEngine?.trust_breakdown?.doc_presence_match ? '#10b981' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 2: Financial Capacity & Credit Risk (Layer 3) */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                height: '100%',
              }}
            >
              <CardContent>
                <Box display='flex' justifyContent='space-between' alignItems='center' mb={1.5}>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#10b981' }}>
                    Layer 3: Financial Capacity & Risk
                  </Typography>
                  <Box display='flex' gap={1}>
                    <Chip
                      label={decisionEngine?.risk_level || 'PENDING'}
                      style={{
                        background:
                          decisionEngine?.risk_level === 'LOW'
                            ? 'rgba(16, 185, 129, 0.2)'
                            : decisionEngine?.risk_level === 'HIGH'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(245, 158, 11, 0.2)',
                        color:
                          decisionEngine?.risk_level === 'LOW'
                            ? '#10b981'
                            : decisionEngine?.risk_level === 'HIGH'
                            ? '#ef4444'
                            : '#f59e0b',
                        fontWeight: 800,
                      }}
                    />
                    <Chip
                      label={`${decisionEngine?.financial_score ?? 0} / 100`}
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                        fontWeight: 800,
                      }}
                    />
                  </Box>
                </Box>
                <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
                  Debt-service capability, cash flow margins, credit score, and employment stability.
                </Typography>

                <Box display='flex' flexDirection='column' gap={1.5}>
                  {/* DTI */}
                  <Box display='flex' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2' style={{ color: '#cbd5e1' }}>
                      Debt-to-Income (DTI: {decisionEngine?.financial_breakdown?.dti || 0}%)
                    </Typography>
                    <Typography variant='body2' style={{ color: '#10b981', fontWeight: 700 }}>
                      {decisionEngine?.financial_breakdown?.dti_points ?? 0} / 40 pts
                    </Typography>
                  </Box>

                  {/* DSCR */}
                  <Box display='flex' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2' style={{ color: '#cbd5e1' }}>
                      Debt Service Coverage (DSCR: {decisionEngine?.financial_breakdown?.dscr || 0})
                    </Typography>
                    <Typography variant='body2' style={{ color: '#10b981', fontWeight: 700 }}>
                      {decisionEngine?.financial_breakdown?.dscr_points ?? 0} / 30 pts
                    </Typography>
                  </Box>

                  {/* Credit Score */}
                  <Box display='flex' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2' style={{ color: '#cbd5e1' }}>
                      CIBIL / Credit Score ({decisionEngine?.financial_breakdown?.credit_score || 'N/A'})
                    </Typography>
                    <Typography variant='body2' style={{ color: '#10b981', fontWeight: 700 }}>
                      {decisionEngine?.financial_breakdown?.credit_points ?? 0} / 20 pts
                    </Typography>
                  </Box>

                  {/* Employment Stability */}
                  <Box display='flex' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2' style={{ color: '#cbd5e1' }}>
                      Employment ({decisionEngine?.financial_breakdown?.employment_type || 'N/A'})
                    </Typography>
                    <Typography variant='body2' style={{ color: '#10b981', fontWeight: 700 }}>
                      {decisionEngine?.financial_breakdown?.employment_points ?? 0} / 10 pts
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 3: Fraud Risk & Anomalies */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                height: '100%',
              }}
            >
              <CardContent>
                <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>
                  Fraud Risk & Anomalies
                </Typography>
                <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
                  Audits financial anomalies, document inconsistencies, and profile discrepancies.
                </Typography>

                <Box display='flex' flexDirection='column' gap={1.2}>
                  {/* Financial anomalies */}
                  <Box>
                    <Typography variant='caption' style={{ color: '#94a3b8', fontWeight: 700 }}>
                      FINANCIAL ANOMALIES:
                    </Typography>
                    <Typography variant='body2' style={{ color: '#cbd5e1', marginTop: 2 }}>
                      {decisionEngine?.financial_breakdown?.dti > 60
                        ? '⚠️ Critical: DTI exceeds 60% threshold'
                        : decisionEngine?.financial_breakdown?.dscr < 1.0
                        ? '⚠️ Critical: DSCR is below 1.0 (hard rejection trigger)'
                        : '✓ Cash flows and debt margins within healthy parameters.'}
                    </Typography>
                  </Box>

                  {/* Document anomalies */}
                  <Box mt={1}>
                    <Typography variant='caption' style={{ color: '#94a3b8', fontWeight: 700 }}>
                      DOCUMENT ANOMALIES:
                    </Typography>
                    <Typography variant='body2' style={{ color: '#cbd5e1', marginTop: 2 }}>
                      {documents.length === 0
                        ? 'Pending: No documents submitted yet.'
                        : documents.some((d) => d.verification_status === 'REVERIFICATION')
                        ? '⚠️ Reverification required for 1 or more uploaded documents.'
                        : '✓ Uploaded documents intact without critical format corruptions.'}
                    </Typography>
                  </Box>

                  {/* Cross-document inconsistency */}
                  <Box mt={1}>
                    <Typography variant='caption' style={{ color: '#94a3b8', fontWeight: 700 }}>
                      CROSS-DOCUMENT CONSISTENCY:
                    </Typography>
                    <Typography variant='body2' style={{ color: '#cbd5e1', marginTop: 2 }}>
                      {verification?.details?.identity_name_check?.status === 'MISMATCH'
                        ? '⚠️ Major discrepancy detected in names across PAN and Aadhaar records.'
                        : verification?.details?.identity_name_check?.status === 'PARTIAL_MATCH'
                        ? 'ℹ️ Minor string difference across identity sources.'
                        : '✓ Clean identity alignment across submitted records.'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 4: Layer 4 Decision & Recommended Terms */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                height: '100%',
              }}
            >
              <CardContent>
                <Box display='flex' justifyContent='space-between' alignItems='center' mb={1.5}>
                  <Typography variant='subtitle1' style={{ fontWeight: 700, color: '#38bdf8' }}>
                    Layer 4: Automated Underwriting Decision
                  </Typography>
                  <Chip
                    label={decisionEngine?.decision_status || 'PENDING EVALUATION'}
                    style={{
                      background:
                        decisionEngine?.decision_status === 'APPROVED'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : decisionEngine?.decision_status === 'REJECTED'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(56, 189, 248, 0.2)',
                      color:
                        decisionEngine?.decision_status === 'APPROVED'
                          ? '#10b981'
                          : decisionEngine?.decision_status === 'REJECTED'
                          ? '#ef4444'
                          : '#38bdf8',
                      fontWeight: 800,
                    }}
                  />
                </Box>
                <Typography variant='body2' style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
                  Weighting: 30% Trust Score + 70% Financial Capacity Score
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' style={{ color: '#94a3b8' }}>
                      Approved Principal Amount
                    </Typography>
                    <Typography variant='h6' style={{ color: '#10b981', fontWeight: 800, marginTop: 2 }}>
                      {decisionEngine?.recommended_terms?.approved_amount
                        ? formatCurrency(decisionEngine.recommended_terms.approved_amount)
                        : 'Pending'}
                    </Typography>
                    <Typography variant='caption' style={{ color: '#64748b' }}>
                      ({decisionEngine?.recommended_terms?.approved_percentage ?? 0}% of requested)
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' style={{ color: '#94a3b8' }}>
                      Recommended Interest Rate
                    </Typography>
                    <Typography variant='h6' style={{ color: '#38bdf8', fontWeight: 800, marginTop: 2 }}>
                      {decisionEngine?.recommended_terms?.interest_rate || 'Pending'}
                    </Typography>
                    <Typography variant='caption' style={{ color: '#64748b' }}>
                      Based on risk tier
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Alert
                      severity={
                        decisionEngine?.decision_status === 'REJECTED'
                          ? 'error'
                          : decisionEngine?.decision_status === 'APPROVED'
                          ? 'success'
                          : 'info'
                      }
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        color: '#f8fafc',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    >
                      {decisionEngine?.decision_status === 'APPROVED'
                        ? 'High composite rating allows maximum approved principal at baseline competitive rate.'
                        : decisionEngine?.decision_status === 'READY_FOR_LENDER'
                        ? 'Application meets marketplace risk criteria with adjusted principal and risk premium.'
                        : decisionEngine?.decision_status === 'REJECTED'
                        ? 'Application fails minimum underwriting threshold due to financial constraints or risk rating.'
                        : 'Upload documents and execute OCR verification to establish composite underwriting scores.'}
                    </Alert>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* DOCUMENT PREVIEW MODAL */}
      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth='md'
        fullWidth
        PaperProps={{
          style: {
            background: '#111c3a',
            color: '#f8fafc',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        <DialogTitle
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Document Preview: {activeDoc?.document_type}</span>
          {activeDoc?.document_url && (
            <Button
              size='small'
              variant='outlined'
              href={activeDoc.document_url}
              target='_blank'
              rel='noopener noreferrer'
              endIcon={<LaunchIcon style={{ fontSize: 14 }} />}
              style={{
                borderColor: 'rgba(255,255,255,0.2)',
                color: '#38bdf8',
                textTransform: 'none',
              }}
            >
              Open in New Tab
            </Button>
          )}
        </DialogTitle>
        <DialogContent style={{ paddingTop: 20 }}>
          {activeDoc?.document_url ? (
            <Box textAlign='center'>
              {activeDoc.document_url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={activeDoc.document_url}
                  title='Document PDF Viewer'
                  style={{ width: '100%', height: 480, border: 'none', borderRadius: 8 }}
                />
              ) : (
                <img
                  src={activeDoc.document_url}
                  alt={activeDoc.document_type}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 500,
                    borderRadius: 8,
                    objectFit: 'contain',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              )}
            </Box>
          ) : (
            <Typography variant='body2' style={{ color: '#94a3b8' }}>
              No preview media URL available for this document.
            </Typography>
          )}

          {activeDoc?.raw_ocr_text && (
            <Box mt={3}>
              <Typography variant='subtitle2' style={{ fontWeight: 700, color: '#38bdf8', marginBottom: 6 }}>
                Raw OCR Text Extracted:
              </Typography>
              <Paper
                style={{
                  padding: 14,
                  background: '#07111f',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  maxHeight: 180,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#cbd5e1',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {activeDoc.raw_ocr_text}
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 24px' }}>
          <Button
            onClick={() => setViewerOpen(false)}
            style={{ color: '#94a3b8', textTransform: 'none', fontWeight: 600 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* BORROWER VALIDATION MODAL */}
      <Dialog
        open={validationModalOpen}
        onClose={() => !validating && setValidationModalOpen(false)}
        maxWidth='sm'
        fullWidth
        PaperProps={{
          style: {
            background: '#111c3a',
            color: '#f8fafc',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        <DialogTitle style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700 }}>
          Admin Application Validation: {borrower.name}
        </DialogTitle>
        <DialogContent style={{ paddingTop: 20 }}>
          <Typography variant='body2' style={{ color: '#94a3b8', marginBottom: 16 }}>
            Set official validation state and synchronize document statuses according to KYC & underwriting findings.
          </Typography>

          <RadioGroup
            value={validationAction}
            onChange={(e) => setValidationAction(e.target.value)}
            style={{ marginBottom: 18 }}
          >
            <FormControlLabel
              value='VERIFY'
              control={<Radio style={{ color: '#10b981' }} />}
              label={
                <Box>
                  <Typography variant='body2' style={{ fontWeight: 700, color: '#10b981' }}>
                    Verify Application (VERIFY)
                  </Typography>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>
                    Mark borrower and pending documents as verified and ready for lender underwriting.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value='APPROVE'
              control={<Radio style={{ color: '#38bdf8' }} />}
              label={
                <Box>
                  <Typography variant='body2' style={{ fontWeight: 700, color: '#38bdf8' }}>
                    Approve Loan Directly (APPROVE)
                  </Typography>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>
                    Full platform approval, bypassing further underwriting.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value='REVERIFY'
              control={<Radio style={{ color: '#f59e0b' }} />}
              label={
                <Box>
                  <Typography variant='body2' style={{ fontWeight: 700, color: '#f59e0b' }}>
                    Request Reverification (REVERIFY)
                  </Typography>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>
                    Flag application for borrower to re-upload documents or clarify details.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value='REJECT'
              control={<Radio style={{ color: '#f43f5e' }} />}
              label={
                <Box>
                  <Typography variant='body2' style={{ fontWeight: 700, color: '#f43f5e' }}>
                    Reject Application (REJECT)
                  </Typography>
                  <Typography variant='caption' style={{ color: '#94a3b8' }}>
                    Reject due to critical document mismatch, fraud flags, or credit ineligibility.
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>

          <TextField
            fullWidth
            multiline
            rows={3}
            label='Validation Notes & Audit Rationale'
            placeholder='Add rationale for compliance and borrower notifications...'
            value={validationNotes}
            onChange={(e) => setValidationNotes(e.target.value)}
            InputLabelProps={{ style: { color: '#94a3b8' } }}
            InputProps={{
              style: {
                color: '#f8fafc',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 8,
              },
            }}
          />
        </DialogContent>
        <DialogActions style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 24px' }}>
          <Button
            onClick={() => setValidationModalOpen(false)}
            disabled={validating}
            style={{ color: '#94a3b8', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitValidation}
            disabled={validating}
            variant='contained'
            style={{
              background:
                validationAction === 'REJECT'
                  ? '#f43f5e'
                  : validationAction === 'REVERIFY'
                  ? '#f59e0b'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {validating ? <CircularProgress size={18} style={{ color: '#fff' }} /> : `Confirm ${validationAction}`}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
