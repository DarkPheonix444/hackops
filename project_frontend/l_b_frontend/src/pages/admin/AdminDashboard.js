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
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  AdminPanelSettings as AdminIcon,
  FactCheck as FactCheckIcon,
  HourglassEmpty as PendingIcon,
  ErrorOutline as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ArrowForward as ArrowForwardIcon,
  Person as BorrowerIcon,
  AccountBalance as LenderIcon,
  RateReview as ValidateIcon,
  AutoMode as ProcessIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

import { showSnackbar } from '../../components/Snackbar';
import companyService from '../../services/companyService';

// Format Indian Rupee currency
const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num) || num === 0) return '₹0';
  return '₹' + num.toLocaleString('en-IN');
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Active view tab: 'borrowers' or 'lenders'
  const [activeTab, setActiveTab] = useState('borrowers');

  // Borrower requests state
  const [borrowers, setBorrowers] = useState([]);
  const [borrowersLoading, setBorrowersLoading] = useState(true);

  // Lender requests state
  const [lenderFeed, setLenderFeed] = useState([]);
  const [lenderLoading, setLenderLoading] = useState(true);

  // Common filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Borrower Validation Modal
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [validationAction, setValidationAction] = useState('VERIFY');
  const [validationNotes, setValidationNotes] = useState('');
  const [validatingBorrower, setValidatingBorrower] = useState(false);

  // Lender Decision Modal
  const [lenderDecisionOpen, setLenderDecisionOpen] = useState(false);
  const [selectedLoanApp, setSelectedLoanApp] = useState(null);
  const [lenderAction, setLenderAction] = useState('APPROVE');
  const [lenderNotes, setLenderNotes] = useState('');
  const [submittingLenderDecision, setSubmittingLenderDecision] = useState(false);

  // Fetch all borrower requests
  const fetchBorrowers = useCallback(async () => {
    setBorrowersLoading(true);
    try {
      const data = await companyService.listBorrowers();
      setBorrowers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching borrower requests for admin:', err);
      showSnackbar({
        type: 'error',
        message: 'Could not load borrower requests.',
      });
    } finally {
      setBorrowersLoading(false);
    }
  }, []);

  // Fetch all lender requests & marketplace applications
  const fetchLenderFeed = useCallback(async () => {
    setLenderLoading(true);
    try {
      const data = await companyService.getLenderFeed(true);
      setLenderFeed(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching lender feed for admin:', err);
      showSnackbar({
        type: 'error',
        message: 'Could not load lender marketplace requests.',
      });
    } finally {
      setLenderLoading(false);
    }
  }, []);

  // Load all on mount
  useEffect(() => {
    fetchBorrowers();
    fetchLenderFeed();
  }, [fetchBorrowers, fetchLenderFeed]);

  // Overall KPI metrics
  const metrics = useMemo(() => {
    const totalBorrowerReqs = borrowers.length;
    let pendingBorrowers = 0;
    let verifiedBorrowers = 0;
    let flaggedBorrowers = 0;

    borrowers.forEach((b) => {
      const v = (b.verification_status || '').toUpperCase();
      const a = (b.application_status || '').toUpperCase();
      const r = (b.risk_score || '').toUpperCase();

      if (v === 'VERIFIED' || a === 'VERIFIED') {
        verifiedBorrowers++;
      } else if (v === 'REVERIFICATION' || v === 'NEEDS_REVIEW' || r === 'HIGH') {
        flaggedBorrowers++;
      } else {
        pendingBorrowers++;
      }
    });

    const totalLenderReqs = lenderFeed.length;
    let approvedLenderLoans = 0;
    lenderFeed.forEach((loan) => {
      if (loan.status === 'APPROVED') approvedLenderLoans++;
    });

    return {
      totalBorrowerReqs,
      pendingBorrowers,
      verifiedBorrowers,
      totalLenderReqs,
      approvedLenderLoans,
      flaggedBorrowers,
    };
  }, [borrowers, lenderFeed]);

  // Filtered Borrower list
  const filteredBorrowers = useMemo(() => {
    return borrowers.filter((b) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (b.name || '').toLowerCase();
        const pan = (b.pan_number || '').toLowerCase();
        const email = (b.email || '').toLowerCase();
        const id = String(b.id || '');
        if (!name.includes(q) && !pan.includes(q) && !email.includes(q) && !id.includes(q)) {
          return false;
        }
      }

      if (statusFilter !== 'ALL') {
        if ((b.application_status || '').toUpperCase() !== statusFilter &&
            (b.verification_status || '').toUpperCase() !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [borrowers, searchQuery, statusFilter]);

  // Filtered Lender requests list
  const filteredLenderFeed = useMemo(() => {
    return lenderFeed.filter((loan) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (loan.borrower?.name || '').toLowerCase();
        const email = (loan.borrower?.email || '').toLowerCase();
        const purpose = (loan.purpose || '').toLowerCase();
        const id = String(loan.id || '');
        if (!name.includes(q) && !email.includes(q) && !purpose.includes(q) && !id.includes(q)) {
          return false;
        }
      }

      if (statusFilter !== 'ALL') {
        if ((loan.status || '').toUpperCase() !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [lenderFeed, searchQuery, statusFilter]);

  // Handle open borrower validation modal
  const handleOpenValidateBorrower = (b) => {
    setSelectedBorrower(b);
    setValidationAction('VERIFY');
    setValidationNotes('');
    setValidationModalOpen(true);
  };

  // Submit borrower validation
  const handleSubmitBorrowerValidation = async () => {
    if (!selectedBorrower) return;
    setValidatingBorrower(true);
    try {
      const res = await companyService.validateBorrower(selectedBorrower.id, {
        action: validationAction,
        notes: validationNotes,
      });

      showSnackbar({
        type: 'success',
        message: res.message || `Borrower #${selectedBorrower.id} validated successfully!`,
      });

      setValidationModalOpen(false);
      // Refresh both borrower and lender feeds
      await fetchBorrowers();
      await fetchLenderFeed();
    } catch (err) {
      console.error('Borrower validation error:', err);
      showSnackbar({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to submit borrower validation.',
      });
    } finally {
      setValidatingBorrower(false);
    }
  };

  // Handle open lender decision modal
  const handleOpenLenderDecision = (loanApp, action) => {
    setSelectedLoanApp(loanApp);
    setLenderAction(action);
    setLenderNotes('');
    setLenderDecisionOpen(true);
  };

  // Submit lender decision
  const handleSubmitLenderDecision = async () => {
    if (!selectedLoanApp) return;
    setSubmittingLenderDecision(true);
    try {
      const res = await companyService.submitLenderDecision(
        selectedLoanApp.id,
        lenderAction,
        lenderNotes
      );
      showSnackbar({
        type: lenderAction === 'APPROVE' ? 'success' : 'info',
        message: res.message || `Loan #${selectedLoanApp.id} ${lenderAction.toLowerCase()}d!`,
      });
      setLenderDecisionOpen(false);
      await fetchLenderFeed();
      await fetchBorrowers();
    } catch (err) {
      console.error('Lender decision error:', err);
      showSnackbar({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to submit loan decision.',
      });
    } finally {
      setSubmittingLenderDecision(false);
    }
  };

  // Run AI 4-layer evaluation for a loan app
  const handleRunAiEvaluation = async (loanId) => {
    try {
      showSnackbar({
        type: 'info',
        message: `Evaluating Loan #${loanId} with 4-layer risk engine...`,
      });
      await companyService.evaluateLoanApplication(loanId);
      showSnackbar({
        type: 'success',
        message: `Loan #${loanId} evaluated successfully!`,
      });
      await fetchLenderFeed();
    } catch (err) {
      console.error('Evaluation error:', err);
      showSnackbar({
        type: 'error',
        message: err.response?.data?.detail || 'Evaluation failed.',
      });
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 50 }}>
      {/* ADMIN HEADER */}
      <Box display='flex' justifyContent='space-between' alignItems='center' flexWrap='wrap' gap={2} mb={3}>
        <div>
          <Box display='flex' alignItems='center' gap={1.5}>
            <AdminIcon style={{ color: '#c084fc', fontSize: 34 }} />
            <Typography variant='h4' style={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
              Admin Request Validation Center
            </Typography>
            <Chip
              size='small'
              label='Master Admin'
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(126, 34, 206, 0.15) 100%)',
                color: '#c084fc',
                fontWeight: 800,
                fontSize: 11,
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}
            />
          </Box>
          <Typography variant='body2' style={{ color: '#94a3b8', marginTop: 4 }}>
            Central administration hub for auditing and validating all borrower loan applications and lender marketplace requests.
          </Typography>
        </div>

        <Box display='flex' alignItems='center' gap={1.5}>
          <Button
            variant='outlined'
            onClick={() => {
              fetchBorrowers();
              fetchLenderFeed();
            }}
            disabled={borrowersLoading || lenderLoading}
            startIcon={
              <RefreshIcon
                style={{ animation: borrowersLoading || lenderLoading ? 'spin 1s linear infinite' : 'none' }}
              />
            }
            style={{
              borderColor: 'rgba(255, 255, 255, 0.15)',
              color: '#38bdf8',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 8,
            }}
          >
            Refresh All
          </Button>
        </Box>
      </Box>

      {/* 6 MASTER KPI CARDS */}
      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Borrower Reqs
              </Typography>
              <Typography variant='h4' style={{ color: '#38bdf8', fontWeight: 800, marginTop: 4 }}>
                {metrics.totalBorrowerReqs}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                All applications
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Pending Validate
              </Typography>
              <Typography variant='h4' style={{ color: '#f59e0b', fontWeight: 800, marginTop: 4 }}>
                {metrics.pendingBorrowers}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                Awaiting audit
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Verified Reqs
              </Typography>
              <Typography variant='h4' style={{ color: '#10b981', fontWeight: 800, marginTop: 4 }}>
                {metrics.verifiedBorrowers}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                Docs confirmed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Lender Feed
              </Typography>
              <Typography variant='h4' style={{ color: '#c084fc', fontWeight: 800, marginTop: 4 }}>
                {metrics.totalLenderReqs}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                Marketplace pool
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Funded Loans
              </Typography>
              <Typography variant='h4' style={{ color: '#10b981', fontWeight: 800, marginTop: 4 }}>
                {metrics.approvedLenderLoans}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                Approved decisions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Flagged / Risk
              </Typography>
              <Typography variant='h4' style={{ color: '#f43f5e', fontWeight: 800, marginTop: 4 }}>
                {metrics.flaggedBorrowers}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                Requires review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* REQUEST NAVIGATION TABS & FILTER BAR */}
      <Paper
        elevation={2}
        style={{
          borderRadius: 16,
          background: '#111c3a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 24,
          overflow: 'hidden',
        }}
      >
        <Box
          display='flex'
          justifyContent='space-between'
          alignItems='center'
          flexWrap='wrap'
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '0 16px' }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, val) => {
              setActiveTab(val);
              setStatusFilter('ALL');
            }}
            indicatorColor='secondary'
            textColor='inherit'
          >
            <Tab
              value='borrowers'
              icon={<BorrowerIcon style={{ fontSize: 18 }} />}
              iconPosition='start'
              label={`Borrower Requests (${borrowers.length})`}
              style={{
                color: activeTab === 'borrowers' ? '#38bdf8' : '#94a3b8',
                fontWeight: 700,
                fontSize: 14,
                textTransform: 'none',
              }}
            />
            <Tab
              value='lenders'
              icon={<LenderIcon style={{ fontSize: 18 }} />}
              iconPosition='start'
              label={`Lender Requests & Loans (${lenderFeed.length})`}
              style={{
                color: activeTab === 'lenders' ? '#10b981' : '#94a3b8',
                fontWeight: 700,
                fontSize: 14,
                textTransform: 'none',
              }}
            />
          </Tabs>

          <Box display='flex' alignItems='center' gap={1.5} py={1}>
            <TextField
              size='small'
              placeholder='Search requests...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon style={{ color: '#94a3b8', fontSize: 18 }} />
                  </InputAdornment>
                ),
                style: {
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#f8fafc',
                  borderRadius: 8,
                  fontSize: 13,
                  width: 260,
                },
              }}
            />
            <TextField
              select
              size='small'
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              SelectProps={{
                style: {
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#f8fafc',
                  borderRadius: 8,
                  fontSize: 13,
                },
              }}
            >
              <MenuItem value='ALL'>All Statuses</MenuItem>
              <MenuItem value='VERIFIED'>Verified / Approved</MenuItem>
              <MenuItem value='READY_FOR_LENDER'>Ready for Lender</MenuItem>
              <MenuItem value='FROZEN'>Frozen / Submitted</MenuItem>
              <MenuItem value='REVERIFICATION'>Reverification</MenuItem>
              <MenuItem value='REJECTED'>Rejected</MenuItem>
            </TextField>
          </Box>
        </Box>

        {/* TAB 1: BORROWER REQUESTS TABLE */}
        {activeTab === 'borrowers' && (
          <div>
            {borrowersLoading ? (
              <Box display='flex' justifyContent='center' p={5}>
                <CircularProgress style={{ color: '#38bdf8' }} />
              </Box>
            ) : filteredBorrowers.length === 0 ? (
              <Box p={5} textAlign='center'>
                <Typography variant='body1' style={{ color: '#94a3b8' }}>
                  No borrower requests found matching your query.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        App ID
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Borrower Name
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Amount Requested
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Employment
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Application Status
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Verification
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Submitted
                      </TableCell>
                      <TableCell
                        align='right'
                        style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}
                      >
                        Admin Validation Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBorrowers.map((b) => (
                      <TableRow key={b.id} hover style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <TableCell style={{ color: '#38bdf8', fontWeight: 800, fontSize: 13 }}>
                          #APP-{b.id}
                        </TableCell>
                        <TableCell>
                          <Typography variant='subtitle2' style={{ fontWeight: 700, color: '#f8fafc' }}>
                            {b.name || 'Unnamed'}
                          </Typography>
                          <Typography variant='caption' style={{ color: '#94a3b8' }}>
                            {b.email} • PAN: {b.pan_number || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell style={{ color: '#10b981', fontWeight: 800, fontSize: 14 }}>
                          {formatCurrency(b.amount_requested)}
                        </TableCell>
                        <TableCell style={{ color: '#cbd5e1', fontSize: 13 }}>
                          {b.employment_type || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={b.application_status}
                            style={{
                              background:
                                b.application_status === 'APPROVED' || b.application_status === 'VERIFIED'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : b.application_status === 'REVERIFICATION'
                                  ? 'rgba(244, 63, 94, 0.15)'
                                  : 'rgba(56, 189, 248, 0.15)',
                              color:
                                b.application_status === 'APPROVED' || b.application_status === 'VERIFIED'
                                  ? '#10b981'
                                  : b.application_status === 'REVERIFICATION'
                                  ? '#f43f5e'
                                  : '#38bdf8',
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={b.verification_status || 'PENDING'}
                            style={{
                              background:
                                b.verification_status === 'VERIFIED'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                              color: b.verification_status === 'VERIFIED' ? '#10b981' : '#f59e0b',
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          />
                        </TableCell>
                        <TableCell style={{ color: '#94a3b8', fontSize: 13 }}>
                          {formatDate(b.submitted_at)}
                        </TableCell>
                        <TableCell align='right'>
                          <Box display='flex' justifyContent='flex-end' gap={1}>
                            <Button
                              variant='contained'
                              size='small'
                              onClick={() => handleOpenValidateBorrower(b)}
                              startIcon={<ValidateIcon style={{ fontSize: 16 }} />}
                              style={{
                                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                color: '#fff',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 6,
                                fontSize: 12,
                              }}
                            >
                              Validate
                            </Button>
                            <Button
                              variant='outlined'
                              size='small'
                              onClick={() => navigate(`/app/company/borrowers/${b.id}`)}
                              endIcon={<ArrowForwardIcon style={{ fontSize: 16 }} />}
                              style={{
                                borderColor: 'rgba(255,255,255,0.15)',
                                color: '#38bdf8',
                                fontWeight: 600,
                                textTransform: 'none',
                                borderRadius: 6,
                                fontSize: 12,
                              }}
                            >
                              Review Docs
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </div>
        )}

        {/* TAB 2: LENDER REQUESTS & MARKETPLACE FEED */}
        {activeTab === 'lenders' && (
          <div>
            {lenderLoading ? (
              <Box display='flex' justifyContent='center' p={5}>
                <CircularProgress style={{ color: '#10b981' }} />
              </Box>
            ) : filteredLenderFeed.length === 0 ? (
              <Box p={5} textAlign='center'>
                <Typography variant='body1' style={{ color: '#94a3b8' }}>
                  No lender marketplace loan requests found.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Loan ID
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Borrower Applicant
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Amount Requested
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Purpose
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        AI Trust Score
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Risk Level
                      </TableCell>
                      <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                        Status
                      </TableCell>
                      <TableCell
                        align='right'
                        style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}
                      >
                        Admin Decision Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLenderFeed.map((loan) => (
                      <TableRow key={loan.id} hover style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <TableCell style={{ color: '#10b981', fontWeight: 800, fontSize: 13 }}>
                          #LOAN-{loan.id}
                        </TableCell>
                        <TableCell>
                          <Typography variant='subtitle2' style={{ fontWeight: 700, color: '#f8fafc' }}>
                            {loan.borrower?.name || 'Borrower'}
                          </Typography>
                          <Typography variant='caption' style={{ color: '#94a3b8' }}>
                            {loan.borrower?.email}
                          </Typography>
                        </TableCell>
                        <TableCell style={{ color: '#10b981', fontWeight: 800, fontSize: 14 }}>
                          {formatCurrency(loan.amount_requested)}
                        </TableCell>
                        <TableCell style={{ color: '#cbd5e1', fontSize: 13 }}>{loan.purpose}</TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={`${loan.ai_trust_score || 0} pts`}
                            style={{
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              fontWeight: 800,
                              fontSize: 11,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={loan.ai_risk_level || 'LOW'}
                            style={{
                              background:
                                loan.ai_risk_level === 'HIGH'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : loan.ai_risk_level === 'MEDIUM'
                                  ? 'rgba(245, 158, 11, 0.2)'
                                  : 'rgba(16, 185, 129, 0.2)',
                              color:
                                loan.ai_risk_level === 'HIGH'
                                  ? '#ef4444'
                                  : loan.ai_risk_level === 'MEDIUM'
                                  ? '#f59e0b'
                                  : '#10b981',
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={loan.status}
                            style={{
                              background:
                                loan.status === 'APPROVED'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : loan.status === 'REJECTED'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(56, 189, 248, 0.15)',
                              color:
                                loan.status === 'APPROVED'
                                  ? '#10b981'
                                  : loan.status === 'REJECTED'
                                  ? '#ef4444'
                                  : '#38bdf8',
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <Box display='flex' justifyContent='flex-end' gap={1}>
                            <Tooltip title='Evaluate with 4-layer AI engine'>
                              <IconButton
                                size='small'
                                onClick={() => handleRunAiEvaluation(loan.id)}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.1)',
                                  color: '#38bdf8',
                                }}
                              >
                                <SpeedIcon style={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>

                            <Button
                              variant='contained'
                              size='small'
                              onClick={() => handleOpenLenderDecision(loan, 'APPROVE')}
                              disabled={loan.status === 'APPROVED'}
                              style={{
                                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                color: '#fff',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 6,
                                fontSize: 11,
                              }}
                            >
                              Approve
                            </Button>

                            <Button
                              variant='outlined'
                              size='small'
                              onClick={() => handleOpenLenderDecision(loan, 'REJECT')}
                              disabled={loan.status === 'REJECTED'}
                              style={{
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                color: '#ef4444',
                                fontWeight: 600,
                                textTransform: 'none',
                                borderRadius: 6,
                                fontSize: 11,
                              }}
                            >
                              Reject
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </div>
        )}
      </Paper>

      {/* BORROWER VALIDATION MODAL */}
      <Dialog
        open={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
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
          Validate Borrower Request #{selectedBorrower?.id} ({selectedBorrower?.name})
        </DialogTitle>
        <DialogContent style={{ paddingTop: 20 }}>
          <Box mb={2}>
            <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
              Requested Amount
            </Typography>
            <Typography variant='h5' style={{ color: '#10b981', fontWeight: 800 }}>
              {formatCurrency(selectedBorrower?.amount_requested)}
            </Typography>
          </Box>

          <Typography variant='subtitle2' style={{ color: '#cbd5e1', fontWeight: 700, marginBottom: 8 }}>
            Select Validation Action:
          </Typography>

          <RadioGroup
            value={validationAction}
            onChange={(e) => setValidationAction(e.target.value)}
            style={{ marginBottom: 16 }}
          >
            <FormControlLabel
              value='VERIFY'
              control={<Radio style={{ color: '#10b981' }} />}
              label={
                <Typography style={{ color: '#f8fafc', fontWeight: 600, fontSize: 14 }}>
                  Mark as Verified (Pass KYC & Documents)
                </Typography>
              }
            />
            <FormControlLabel
              value='APPROVE'
              control={<Radio style={{ color: '#38bdf8' }} />}
              label={
                <Typography style={{ color: '#f8fafc', fontWeight: 600, fontSize: 14 }}>
                  Approve Application & Push to Lender Marketplace
                </Typography>
              }
            />
            <FormControlLabel
              value='REVERIFY'
              control={<Radio style={{ color: '#f59e0b' }} />}
              label={
                <Typography style={{ color: '#f8fafc', fontWeight: 600, fontSize: 14 }}>
                  Request Reverification (Flag Document Inconsistencies)
                </Typography>
              }
            />
            <FormControlLabel
              value='REJECT'
              control={<Radio style={{ color: '#ef4444' }} />}
              label={
                <Typography style={{ color: '#f8fafc', fontWeight: 600, fontSize: 14 }}>
                  Reject Application (Fail Underwriting)
                </Typography>
              }
            />
          </RadioGroup>

          <TextField
            fullWidth
            multiline
            rows={3}
            label='Audit & Validation Notes'
            placeholder='e.g. Identity and PAN confirmed. Income verified via salary slip.'
            value={validationNotes}
            onChange={(e) => setValidationNotes(e.target.value)}
            InputLabelProps={{ style: { color: '#94a3b8' } }}
            InputProps={{
              style: {
                color: '#f8fafc',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 8,
              },
            }}
          />
        </DialogContent>
        <DialogActions style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 24px' }}>
          <Button
            onClick={() => setValidationModalOpen(false)}
            style={{ color: '#94a3b8', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            disabled={validatingBorrower}
            onClick={handleSubmitBorrowerValidation}
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
              color: '#fff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 8,
            }}
          >
            {validatingBorrower ? 'Submitting...' : 'Submit Validation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* LENDER DECISION MODAL */}
      <Dialog
        open={lenderDecisionOpen}
        onClose={() => setLenderDecisionOpen(false)}
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
          {lenderAction === 'APPROVE' ? 'Approve Loan Request' : 'Reject Loan Request'} #{selectedLoanApp?.id}
        </DialogTitle>
        <DialogContent style={{ paddingTop: 20 }}>
          <Box mb={2}>
            <Typography variant='body2' style={{ color: '#94a3b8' }}>
              Borrower: <strong style={{ color: '#f8fafc' }}>{selectedLoanApp?.borrower?.name}</strong> • Amount:{' '}
              <strong style={{ color: '#10b981' }}>{formatCurrency(selectedLoanApp?.amount_requested)}</strong>
            </Typography>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={3}
            label='Decision Notes'
            placeholder='e.g. Terms validated against risk engine metrics.'
            value={lenderNotes}
            onChange={(e) => setLenderNotes(e.target.value)}
            InputLabelProps={{ style: { color: '#94a3b8' } }}
            InputProps={{
              style: {
                color: '#f8fafc',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 8,
              },
            }}
          />
        </DialogContent>
        <DialogActions style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 24px' }}>
          <Button
            onClick={() => setLenderDecisionOpen(false)}
            style={{ color: '#94a3b8', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            disabled={submittingLenderDecision}
            onClick={handleSubmitLenderDecision}
            style={{
              background:
                lenderAction === 'APPROVE'
                  ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                  : 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
              color: '#fff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 8,
            }}
          >
            {submittingLenderDecision ? 'Submitting...' : `Confirm ${lenderAction}`}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
