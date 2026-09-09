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
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  FactCheck as FactCheckIcon,
  HourglassEmpty as PendingIcon,
  ErrorOutline as ErrorIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';

import { useUserState, useUserDispatch, switchUserRole } from '../../context/UserContext';
import { showSnackbar } from '../../components/Snackbar';
import companyService from '../../services/companyService';

// Format Indian Rupee currency
const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
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

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const { currentUser, userRole } = useUserState();
  const userDispatch = useUserDispatch();

  // Applications data state
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Fetch applications list
  const fetchBorrowers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const data = await companyService.listBorrowers();
      setBorrowers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load company borrowers:', err);
      if (err.response?.status === 403 || err.response?.status === 401) {
        setUnauthorized(true);
        setError('Access restricted to Company Underwriting & Staff accounts.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load borrower applications.');
        showSnackbar({
          type: 'error',
          message: 'Error fetching applications. Please retry.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBorrowers();
  }, [fetchBorrowers]);

  // Derived KPI metrics
  const metrics = useMemo(() => {
    const total = borrowers.length;
    let pending = 0;
    let underReview = 0;
    let reverification = 0;
    let verified = 0;
    let flaggedOrHighRisk = 0;

    borrowers.forEach((b) => {
      const vStatus = (b.verification_status || '').toUpperCase();
      const aStatus = (b.application_status || '').toUpperCase();
      const rScore = (b.risk_score || '').toUpperCase();
      const fraudCount = Number(b.fraud_score) || 0;

      if (vStatus === 'VERIFIED') {
        verified++;
      } else if (vStatus === 'REVERIFICATION' || aStatus === 'REVERIFICATION') {
        reverification++;
      } else if (
        vStatus === 'UNDER_VERIFICATION' ||
        vStatus === 'UNDER_REVIEW' ||
        vStatus === 'NEEDS_REVIEW' ||
        aStatus === 'UNDER_VERIFICATION'
      ) {
        underReview++;
      } else {
        pending++;
      }

      if (rScore === 'HIGH' || fraudCount > 0 || vStatus === 'REVERIFICATION') {
        flaggedOrHighRisk++;
      }
    });

    return {
      total,
      pending,
      underReview,
      reverification,
      verified,
      flaggedOrHighRisk,
    };
  }, [borrowers]);

  // Filtered applications list
  const filteredBorrowers = useMemo(() => {
    return borrowers.filter((b) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (b.name || '').toLowerCase();
        const pan = (b.pan_number || '').toLowerCase();
        const email = (b.email || '').toLowerCase();
        const id = String(b.id || '');
        if (!name.includes(query) && !pan.includes(query) && !email.includes(query) && !id.includes(query)) {
          return false;
        }
      }

      // Application status filter
      if (appStatusFilter !== 'ALL') {
        if ((b.application_status || '').toUpperCase() !== appStatusFilter) {
          return false;
        }
      }

      // Verification status filter
      if (verificationFilter !== 'ALL') {
        const vStatus = (b.verification_status || 'PENDING').toUpperCase();
        if (verificationFilter === 'PENDING' && vStatus !== 'PENDING') return false;
        if (verificationFilter === 'VERIFIED' && vStatus !== 'VERIFIED') return false;
        if (verificationFilter === 'REVERIFICATION' && vStatus !== 'REVERIFICATION') return false;
        if (verificationFilter === 'NEEDS_REVIEW' && vStatus !== 'NEEDS_REVIEW') return false;
      }

      // Risk filter
      if (riskFilter !== 'ALL') {
        const rScore = (b.risk_score || '').toUpperCase();
        if (riskFilter === 'HIGH' && rScore !== 'HIGH') return false;
        if (riskFilter === 'MEDIUM' && rScore !== 'MEDIUM') return false;
        if (riskFilter === 'LOW' && rScore !== 'LOW') return false;
        if (riskFilter === 'NOT_ASSESSED' && rScore !== '') return false;
      }

      return true;
    });
  }, [borrowers, searchQuery, appStatusFilter, verificationFilter, riskFilter]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setAppStatusFilter('ALL');
    setVerificationFilter('ALL');
    setRiskFilter('ALL');
  };

  // Helper chip styles for Application Status
  const renderAppStatusChip = (status) => {
    const s = (status || 'DRAFT').toUpperCase();
    let bg = 'rgba(148, 163, 184, 0.15)';
    let color = '#94a3b8';

    if (s === 'FROZEN' || s === 'SUBMITTED') {
      bg = 'rgba(56, 189, 248, 0.15)';
      color = '#38bdf8';
    } else if (s === 'UNDER_VERIFICATION') {
      bg = 'rgba(245, 158, 11, 0.15)';
      color = '#f59e0b';
    } else if (s === 'VERIFIED' || s === 'APPROVED') {
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#10b981';
    } else if (s === 'REVERIFICATION') {
      bg = 'rgba(244, 63, 94, 0.15)';
      color = '#f43f5e';
    } else if (s === 'REJECTED') {
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#ef4444';
    }

    return (
      <Chip
        size='small'
        label={s}
        style={{
          background: bg,
          color: color,
          fontWeight: 700,
          fontSize: 11,
          borderRadius: 6,
        }}
      />
    );
  };

  // Helper chip styles for Verification Status
  const renderVerificationChip = (vStatus) => {
    const v = (vStatus || 'PENDING').toUpperCase();

    if (v === 'VERIFIED') {
      return (
        <Chip
          size='small'
          icon={<VerifiedIcon style={{ fontSize: 14, color: '#10b981' }} />}
          label='PASS'
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            fontWeight: 800,
            fontSize: 11,
            borderRadius: 6,
          }}
        />
      );
    }
    if (v === 'REVERIFICATION') {
      return (
        <Chip
          size='small'
          icon={<WarningIcon style={{ fontSize: 14, color: '#f59e0b' }} />}
          label='REVERIFY'
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            fontWeight: 800,
            fontSize: 11,
            borderRadius: 6,
          }}
        />
      );
    }
    if (v === 'NEEDS_REVIEW' || v === 'FLAG') {
      return (
        <Chip
          size='small'
          icon={<ErrorIcon style={{ fontSize: 14, color: '#f43f5e' }} />}
          label='FLAG'
          style={{
            background: 'rgba(244, 63, 94, 0.15)',
            color: '#f43f5e',
            fontWeight: 800,
            fontSize: 11,
            borderRadius: 6,
          }}
        />
      );
    }
    return (
      <Chip
        size='small'
        icon={<PendingIcon style={{ fontSize: 14, color: '#94a3b8' }} />}
        label='PENDING'
        style={{
          background: 'rgba(148, 163, 184, 0.12)',
          color: '#94a3b8',
          fontWeight: 700,
          fontSize: 11,
          borderRadius: 6,
        }}
      />
    );
  };

  // Helper chip for Risk Level
  const renderRiskChip = (riskLevel) => {
    const r = (riskLevel || '').toUpperCase();

    if (r === 'LOW') {
      return (
        <Chip
          size='small'
          label='LOW RISK'
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            fontWeight: 700,
            fontSize: 11,
          }}
        />
      );
    }
    if (r === 'MEDIUM') {
      return (
        <Chip
          size='small'
          label='MEDIUM RISK'
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            fontWeight: 700,
            fontSize: 11,
          }}
        />
      );
    }
    if (r === 'HIGH') {
      return (
        <Chip
          size='small'
          label='HIGH RISK'
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            fontWeight: 800,
            fontSize: 11,
          }}
        />
      );
    }
    return (
      <Typography variant='caption' style={{ color: '#64748b', fontStyle: 'italic' }}>
        Not assessed
      </Typography>
    );
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      {/* PAGE HEADER */}
      <Box display='flex' justifyContent='space-between' alignItems='center' flexWrap='wrap' gap={2} mb={3}>
        <div>
          <Box display='flex' alignItems='center' gap={1.5}>
            <FactCheckIcon style={{ color: '#38bdf8', fontSize: 32 }} />
            <Typography variant='h4' style={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
              Company Verification Hub
            </Typography>
            <Chip
              size='small'
              label='Lending Intelligence'
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontWeight: 700,
                fontSize: 11,
              }}
            />
          </Box>
          <Typography variant='body2' style={{ color: '#94a3b8', marginTop: 4 }}>
            Review borrower loan applications, audit OCR document extractions, and evaluate automated risk intelligence.
          </Typography>
        </div>

        <Box display='flex' alignItems='center' gap={1.5}>
          <Button
            variant='outlined'
            onClick={fetchBorrowers}
            disabled={loading}
            startIcon={<RefreshIcon style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />}
            style={{
              borderColor: 'rgba(255, 255, 255, 0.15)',
              color: '#38bdf8',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 8,
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* UNAUTHORIZED / 403 WARNING BANNER */}
      {unauthorized && (
        <Alert
          severity='warning'
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#f8fafc',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 12,
            marginBottom: 24,
          }}
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => switchUserRole(userDispatch, 'lender')}
              style={{ fontWeight: 700, textTransform: 'none' }}
            >
              Switch to Lender / Staff Role
            </Button>
          }
        >
          <strong>Access Notice:</strong> The Company Verification API requires a Staff or Lender account. If you are
          logged in as a Borrower, switch perspective or login with an authorized credential.
        </Alert>
      )}

      {/* KPI METRIC CARDS (6 METRICS) */}
      <Grid container spacing={2.5} mb={3}>
        {/* Total Applications */}
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Apps
              </Typography>
              <Typography variant='h4' style={{ color: '#f8fafc', fontWeight: 800, marginTop: 4 }}>
                {metrics.total}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                All received
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Verification */}
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Pending
              </Typography>
              <Typography variant='h4' style={{ color: '#38bdf8', fontWeight: 800, marginTop: 4 }}>
                {metrics.pending}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                Awaiting review
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Under Review */}
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Under Review
              </Typography>
              <Typography variant='h4' style={{ color: '#f59e0b', fontWeight: 800, marginTop: 4 }}>
                {metrics.underReview}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                Active audit
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Reverification Required */}
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Reverify Req.
              </Typography>
              <Typography variant='h4' style={{ color: '#ec4899', fontWeight: 800, marginTop: 4 }}>
                {metrics.reverification}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                Mismatch flagged
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Verified */}
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Verified
              </Typography>
              <Typography variant='h4' style={{ color: '#10b981', fontWeight: 800, marginTop: 4 }}>
                {metrics.verified}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                Ready for decision
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk / Fraud Flags */}
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card
            style={{
              background: '#111c3a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}
          >
            <CardContent style={{ padding: '16px 20px' }}>
              <Typography variant='caption' style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Risk / Flags
              </Typography>
              <Typography variant='h4' style={{ color: '#f43f5e', fontWeight: 800, marginTop: 4 }}>
                {metrics.flaggedOrHighRisk}
              </Typography>
              <Typography variant='caption' style={{ color: '#64748b' }}>
                Needs attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* FILTER & SEARCH TOOLBAR */}
      <Paper
        elevation={2}
        style={{
          padding: '18px 24px',
          borderRadius: 14,
          background: '#111c3a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 24,
        }}
      >
        <Grid container spacing={2} alignItems='center'>
          {/* Search bar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size='small'
              placeholder='Search by borrower name, PAN, application ID, or email...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon style={{ color: '#94a3b8', fontSize: 20 }} />
                  </InputAdornment>
                ),
                style: {
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#f8fafc',
                  borderRadius: 8,
                  fontSize: 14,
                },
              }}
            />
          </Grid>

          {/* Application status filter */}
          <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
            <TextField
              select
              fullWidth
              size='small'
              label='Application Status'
              value={appStatusFilter}
              onChange={(e) => setAppStatusFilter(e.target.value)}
              InputLabelProps={{ style: { color: '#94a3b8', fontSize: 13 } }}
              SelectProps={{
                style: {
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#f8fafc',
                  borderRadius: 8,
                  fontSize: 13,
                },
              }}
            >
              <MenuItem value='ALL'>All Application Statuses</MenuItem>
              <MenuItem value='SUBMITTED'>Submitted</MenuItem>
              <MenuItem value='FROZEN'>Frozen</MenuItem>
              <MenuItem value='UNDER_VERIFICATION'>Under Verification</MenuItem>
              <MenuItem value='VERIFIED'>Verified</MenuItem>
              <MenuItem value='REVERIFICATION'>Reverification</MenuItem>
              <MenuItem value='APPROVED'>Approved</MenuItem>
              <MenuItem value='REJECTED'>Rejected</MenuItem>
            </TextField>
          </Grid>

          {/* Verification status filter */}
          <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
            <TextField
              select
              fullWidth
              size='small'
              label='Verification Status'
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              InputLabelProps={{ style: { color: '#94a3b8', fontSize: 13 } }}
              SelectProps={{
                style: {
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#f8fafc',
                  borderRadius: 8,
                  fontSize: 13,
                },
              }}
            >
              <MenuItem value='ALL'>All Verification Results</MenuItem>
              <MenuItem value='PENDING'>Pending</MenuItem>
              <MenuItem value='VERIFIED'>Pass (Verified)</MenuItem>
              <MenuItem value='REVERIFICATION'>Reverify</MenuItem>
              <MenuItem value='NEEDS_REVIEW'>Flag / Needs Review</MenuItem>
            </TextField>
          </Grid>

          {/* Risk Level filter */}
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <TextField
              select
              fullWidth
              size='small'
              label='Risk Level'
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              InputLabelProps={{ style: { color: '#94a3b8', fontSize: 13 } }}
              SelectProps={{
                style: {
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#f8fafc',
                  borderRadius: 8,
                  fontSize: 13,
                },
              }}
            >
              <MenuItem value='ALL'>All Risk Levels</MenuItem>
              <MenuItem value='LOW'>Low Risk</MenuItem>
              <MenuItem value='MEDIUM'>Medium Risk</MenuItem>
              <MenuItem value='HIGH'>High Risk</MenuItem>
              <MenuItem value='NOT_ASSESSED'>Not Assessed</MenuItem>
            </TextField>
          </Grid>

          {/* Clear Filters button */}
          <Grid size={{ xs: 12, md: 1 }} style={{ textAlign: 'right' }}>
            <Tooltip title='Reset all filters'>
              <Button
                variant='text'
                size='small'
                onClick={handleResetFilters}
                style={{ color: '#94a3b8', textTransform: 'none', fontWeight: 600 }}
              >
                Clear
              </Button>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* APPLICATIONS TABLE CARD */}
      <Paper
        elevation={2}
        style={{
          borderRadius: 16,
          background: '#111c3a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <Box
          display='flex'
          justifyContent='space-between'
          alignItems='center'
          padding='18px 24px'
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div>
            <Typography variant='h6' style={{ fontWeight: 700, color: '#f8fafc' }}>
              Borrower Loan Applications
            </Typography>
            <Typography variant='caption' style={{ color: '#94a3b8' }}>
              Showing {filteredBorrowers.length} of {borrowers.length} applications
            </Typography>
          </div>
        </Box>

        {loading ? (
          <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center' p={6}>
            <CircularProgress style={{ color: '#38bdf8' }} />
            <Typography variant='body2' style={{ color: '#94a3b8', marginTop: 14 }}>
              Loading applications...
            </Typography>
          </Box>
        ) : error && borrowers.length === 0 ? (
          <Box p={4}>
            <Alert
              severity='error'
              action={
                <Button color='inherit' size='small' onClick={fetchBorrowers}>
                  Retry
                </Button>
              }
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f8fafc', borderRadius: 10 }}
            >
              {error}
            </Alert>
          </Box>
        ) : filteredBorrowers.length === 0 ? (
          <Box p={5} textAlign='center'>
            <Typography variant='body1' style={{ color: '#94a3b8', fontWeight: 600 }}>
              No applications match the current search or filters.
            </Typography>
            <Button
              variant='outlined'
              size='small'
              onClick={handleResetFilters}
              style={{
                marginTop: 12,
                borderColor: '#38bdf8',
                color: '#38bdf8',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Clear Filters
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                    ID
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                    Borrower Name
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                    Amount Requested
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                    Employment Type
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                    App Status
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                    Verification
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                    Risk Status
                  </TableCell>
                  <TableCell style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                    Submitted Date
                  </TableCell>
                  <TableCell
                    align='right'
                    style={{ background: '#0c1630', color: '#94a3b8', fontWeight: 700, fontSize: 12 }}
                  >
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBorrowers.map((borrower) => (
                  <TableRow
                    key={borrower.id}
                    hover
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/app/company/borrowers/${borrower.id}`)}
                  >
                    {/* ID */}
                    <TableCell style={{ color: '#38bdf8', fontWeight: 800, fontSize: 13 }}>
                      #APP-{borrower.id}
                    </TableCell>

                    {/* Borrower Name */}
                    <TableCell>
                      <Typography variant='subtitle2' style={{ fontWeight: 700, color: '#f8fafc' }}>
                        {borrower.name || 'Unnamed Borrower'}
                      </Typography>
                      <Typography variant='caption' style={{ color: '#94a3b8' }}>
                        {borrower.email || (borrower.city ? `${borrower.city}, ${borrower.state || ''}` : 'No email')}
                      </Typography>
                    </TableCell>

                    {/* Amount Requested */}
                    <TableCell style={{ color: '#10b981', fontWeight: 800, fontSize: 14 }}>
                      {formatCurrency(borrower.amount_requested)}
                    </TableCell>

                    {/* Employment Type */}
                    <TableCell>
                      <Typography variant='body2' style={{ color: '#cbd5e1', fontSize: 13 }}>
                        {borrower.employment_type || 'N/A'}
                      </Typography>
                      {borrower.employer_or_business_name && (
                        <Typography variant='caption' style={{ color: '#64748b', display: 'block' }}>
                          {borrower.employer_or_business_name}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Application Status */}
                    <TableCell>{renderAppStatusChip(borrower.application_status)}</TableCell>

                    {/* Verification Status */}
                    <TableCell>{renderVerificationChip(borrower.verification_status)}</TableCell>

                    {/* Risk Status */}
                    <TableCell>{renderRiskChip(borrower.risk_score)}</TableCell>

                    {/* Submitted Date */}
                    <TableCell style={{ color: '#94a3b8', fontSize: 13 }}>
                      {formatDate(borrower.submitted_at)}
                    </TableCell>

                    {/* Action Button */}
                    <TableCell align='right'>
                      <Button
                        variant='contained'
                        size='small'
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/company/borrowers/${borrower.id}`);
                        }}
                        endIcon={<ArrowForwardIcon style={{ fontSize: 16 }} />}
                        style={{
                          background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                          color: '#fff',
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </div>
  );
}
