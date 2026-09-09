import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SecurityIcon from '@mui/icons-material/Security';
import BadgeIcon from '@mui/icons-material/Badge';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

import { verificationService } from '../../services/verificationService';

export default function VerificationPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('FORM'); // 'FORM' | 'RESULT'
  const [resultView, setResultView] = useState('borrower'); // 'borrower' | 'lender'
  const [error, setError] = useState(null);

  // Form State (Pre-filled with safe demo synthetic data)
  const [formData, setFormData] = useState({
    method: 'HYBRID',
    pan_number: 'ABCDE1234F',
    aadhaar_number: '234567890123',
    name_as_per_pan: 'Rahul Sharma',
    name_as_per_aadhaar: 'Rahul Sharma',
    digilocker_consent: false,
  });

  const [digilockerConnected, setDigilockerConnected] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Load existing verification result on mount if available
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await verificationService.getVerificationResult();
        if (res?.data?.status && res.data.status !== 'PENDING') {
          setVerificationResult(res.data);
          setStep('RESULT');
        }
      } catch {
        // No existing verification yet, stay on FORM
      }
    }
    checkStatus();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDigiLockerConnect = () => {
    setLoading(true);
    setTimeout(() => {
      setDigilockerConnected(true);
      setFormData((prev) => ({
        ...prev,
        method: 'DIGILOCKER',
        digilocker_consent: true,
        pan_number: 'ABCDE1234F',
        aadhaar_number: '234567890123',
        name_as_per_pan: 'Rahul Sharma',
        name_as_per_aadhaar: 'Rahul Sharma',
      }));
      setLoading(false);
    }, 600);
  };

  const handleSimulateMismatch = () => {
    setFormData((prev) => ({
      ...prev,
      name_as_per_pan: 'R. K. Sharma',
      digilocker_consent: false,
    }));
  };

  const handleSubmitVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure verification session started
      await verificationService.startVerification(formData.method).catch(() => {});

      // Submit verification data
      const res = await verificationService.submitVerification(formData);
      setVerificationResult(res.data);
      setStep('RESULT');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Verification submission failed. Please verify connection and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'VERIFIED':
        return { bg: '#064e3b', text: '#34d399', border: '#059669' };
      case 'NEEDS_REVIEW':
        return { bg: '#451a03', text: '#fbbf24', border: '#d97706' };
      case 'FAILED':
        return { bg: '#4c0519', text: '#fb7185', border: '#e11d48' };
      default:
        return { bg: '#1e293b', text: '#94a3b8', border: '#475569' };
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#07111f',
        color: '#f8fafc',
        p: { xs: 2, md: 4 },
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Box sx={{ maxWidth: 860, mx: 'auto' }}>
        {/* Header Ribbon */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: '#36d6c2',
                color: '#07111f',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              TL
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
              Trust<span style={{ color: '#36d6c2' }}>Lens</span>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label="Demo environment · Test data"
              size="small"
              sx={{
                bgcolor: 'rgba(54, 214, 194, 0.1)',
                color: '#36d6c2',
                border: '1px solid rgba(54, 214, 194, 0.25)',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
            <Button
              href="/app/dashboard"
              startIcon={<HomeIcon />}
              variant="outlined"
              size="small"
              sx={{
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                textTransform: 'none',
                '&:hover': { borderColor: '#36d6c2', color: '#36d6c2' },
              }}
            >
              Go to Dashboard
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>
            {error}
          </Alert>
        )}

        {/* STEP 1: VERIFICATION FORM */}
        {step === 'FORM' && (
          <Card
            sx={{
              bgcolor: '#0e1c2f',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="overline"
                  sx={{ color: '#36d6c2', fontWeight: 800, letterSpacing: 1.5, display: 'block' }}
                >
                  BORROWER ONBOARDING
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', mt: 0.5 }}>
                  Verify Your Identity
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
                  Let's verify your information before your application reaches a lender. All checks are deterministic
                  and explainable.
                </Typography>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mb: 3 }} />

              {/* ACTION 1: DigiLocker Simulated Flow */}
              <Box
                sx={{
                  p: 2.5,
                  mb: 3,
                  borderRadius: 2,
                  bgcolor: digilockerConnected ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: digilockerConnected ? '1px solid #059669' : '1px dashed rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <SecurityIcon sx={{ color: digilockerConnected ? '#34d399' : '#36d6c2', fontSize: 32 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ffffff' }}>
                      Connect DigiLocker (Demo Simulation)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                      {digilockerConnected
                        ? '✓ Verified Aadhaar & PAN consent retrieved from demo sandbox.'
                        : 'Simulate instant consent flow to pull verified records.'}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant={digilockerConnected ? 'outlined' : 'contained'}
                  onClick={handleDigiLockerConnect}
                  disabled={loading || digilockerConnected}
                  sx={{
                    bgcolor: digilockerConnected ? 'transparent' : '#36d6c2',
                    color: digilockerConnected ? '#34d399' : '#07111f',
                    borderColor: '#34d399',
                    fontWeight: 700,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#20bbaa' },
                  }}
                >
                  {digilockerConnected ? '✓ Connected' : 'Verify with DigiLocker'}
                </Button>
              </Box>

              {/* ACTION 2: PAN & Identity Fields */}
              <Typography variant="subtitle2" sx={{ color: '#cbd5e1', fontWeight: 700, mb: 2 }}>
                Identity Information & Document Matching
              </Typography>

              <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="PAN Number"
                    name="pan_number"
                    value={formData.pan_number}
                    onChange={handleInputChange}
                    placeholder="ABCDE1234F"
                    variant="outlined"
                    size="small"
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                    InputProps={{ style: { color: '#ffffff', backgroundColor: '#07111f' } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Name as per PAN"
                    name="name_as_per_pan"
                    value={formData.name_as_per_pan}
                    onChange={handleInputChange}
                    placeholder="Rahul Sharma"
                    variant="outlined"
                    size="small"
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                    InputProps={{ style: { color: '#ffffff', backgroundColor: '#07111f' } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Aadhaar Reference (12 digits)"
                    name="aadhaar_number"
                    value={formData.aadhaar_number}
                    onChange={handleInputChange}
                    placeholder="234567890123"
                    variant="outlined"
                    size="small"
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                    InputProps={{ style: { color: '#ffffff', backgroundColor: '#07111f' } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Name as per Aadhaar"
                    name="name_as_per_aadhaar"
                    value={formData.name_as_per_aadhaar}
                    onChange={handleInputChange}
                    placeholder="Rahul Sharma"
                    variant="outlined"
                    size="small"
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                    InputProps={{ style: { color: '#ffffff', backgroundColor: '#07111f' } }}
                  />
                </Grid>
              </Grid>

              {/* ACTION 3: Document Status Checklist */}
              <Box
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: 2,
                  bgcolor: '#07111f',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Document Verification Readiness
                </Typography>
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleIcon sx={{ fontSize: 16 }} /> Aadhaar Card
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleIcon sx={{ fontSize: 16 }} /> PAN Card
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WarningAmberIcon sx={{ fontSize: 16 }} /> Bank Proof (Optional)
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <Button
                  variant="text"
                  onClick={handleSimulateMismatch}
                  sx={{ color: '#94a3b8', textTransform: 'none', fontSize: '0.85rem' }}
                >
                  ⚡ Simulate Minor Name Mismatch
                </Button>

                <Button
                  variant="contained"
                  onClick={handleSubmitVerification}
                  disabled={loading}
                  sx={{
                    bgcolor: '#36d6c2',
                    color: '#07111f',
                    fontWeight: 800,
                    px: 4,
                    py: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 14px 0 rgba(54, 214, 194, 0.39)',
                    '&:hover': { bgcolor: '#20bbaa' },
                  }}
                >
                  {loading ? <CircularProgress size={22} sx={{ color: '#07111f' }} /> : 'Run Verification →'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: VERIFICATION RESULT */}
        {step === 'RESULT' && verificationResult && (
          <Card
            sx={{
              bgcolor: '#0e1c2f',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 25px 30px -5px rgba(0, 0, 0, 0.6)',
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              {/* Header Status */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 800, letterSpacing: 1.5 }}>
                    VERIFICATION ASSESSMENT
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff' }}>
                    Verification Result
                  </Typography>
                </Box>

                <Box
                  sx={{
                    px: 2.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: getStatusColor(verificationResult.status).bg,
                    color: getStatusColor(verificationResult.status).text,
                    border: `1px solid ${getStatusColor(verificationResult.status).border}`,
                    fontWeight: 800,
                    fontSize: '1rem',
                    letterSpacing: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {verificationResult.status === 'VERIFIED' ? <CheckCircleIcon /> : <WarningAmberIcon />}
                  {verificationResult.status}
                </Box>
              </Box>

              {/* View Mode Tabs (Borrower Experience vs Lender Inspection) */}
              <Tabs
                value={resultView}
                onChange={(e, val) => setResultView(val)}
                sx={{
                  mb: 3.5,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  '& .MuiTab-root': {
                    color: '#94a3b8',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    '&.Mui-selected': { color: '#36d6c2' },
                  },
                  '& .MuiTabs-indicator': { backgroundColor: '#36d6c2', height: 3 },
                }}
              >
                <Tab value="borrower" label="👤 Borrower Experience" />
                <Tab value="lender" label="🔍 Lender Evidence Inspection" />
              </Tabs>

              {/* LENDER EVIDENCE INSPECTION VIEW (Section 10) */}
              {resultView === 'lender' && (
                <Box sx={{ mb: 4 }}>
                  <Box
                    sx={{
                      p: 3,
                      bgcolor: '#07111f',
                      borderRadius: 2.5,
                      border: '1px solid rgba(54, 214, 194, 0.25)',
                      mb: 3,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff' }}>
                        Verification Evidence Summary
                      </Typography>
                      <Chip
                        label="Lender Audit Perspective"
                        size="small"
                        sx={{ bgcolor: 'rgba(54, 214, 194, 0.12)', color: '#36d6c2', fontWeight: 700, border: '1px solid rgba(54, 214, 194, 0.3)' }}
                      />
                    </Box>

                    <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                      Deterministic identity and documentation checks performed before loan risk assessment.
                    </Typography>

                    {/* Section 10 Core Evidence Checklist */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.05)', mb: 3 }}>
                      <Typography variant="body1" sx={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                        <CheckCircleIcon sx={{ fontSize: 20 }} /> Identity information available
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: verificationResult.document_status === 'COMPLETE' ? '#34d399' : '#fbbf24',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          fontWeight: 600,
                        }}
                      >
                        {verificationResult.document_status === 'COMPLETE' ? (
                          <CheckCircleIcon sx={{ fontSize: 20 }} />
                        ) : (
                          <WarningAmberIcon sx={{ fontSize: 20 }} />
                        )}
                        {verificationResult.document_status === 'COMPLETE'
                          ? 'Documents complete'
                          : `Document Status: ${verificationResult.document_status || 'PENDING'}`}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: verificationResult.identity_match === 'MATCH' ? '#34d399' : '#fbbf24',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          fontWeight: 600,
                        }}
                      >
                        {verificationResult.identity_match === 'MATCH' ? (
                          <CheckCircleIcon sx={{ fontSize: 20 }} />
                        ) : (
                          <WarningAmberIcon sx={{ fontSize: 20 }} />
                        )}
                        {verificationResult.identity_match === 'MATCH'
                          ? 'Identity fields matched'
                          : `Identity Match: ${verificationResult.identity_match || 'PARTIAL'}`}
                      </Typography>

                      {verificationResult.flags && verificationResult.flags.length > 0 ? (
                        verificationResult.flags.map((flag, idx) => (
                          <Typography
                            key={idx}
                            variant="body1"
                            sx={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}
                          >
                            <WarningAmberIcon sx={{ fontSize: 20 }} /> ⚠ {flag.message || flag.type}
                          </Typography>
                        ))
                      ) : (
                        <Typography variant="body1" sx={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                          <CheckCircleIcon sx={{ fontSize: 20 }} /> No inconsistencies detected
                        </Typography>
                      )}
                    </Box>

                    {/* Section 10 Confidence Score */}
                    <Box sx={{ p: 2.5, bgcolor: '#0b1626', borderRadius: 2, border: '1px solid rgba(54, 214, 194, 0.2)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#e2e8f0' }}>
                          Verification Confidence
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#36d6c2' }}>
                          {verificationResult.verification_confidence} / 100
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={verificationResult.verification_confidence || 0}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'rgba(255, 255, 255, 0.05)',
                          '& .MuiLinearProgress-bar': { bgcolor: '#36d6c2' },
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
                        * This represents deterministic identity & document verification confidence only. Trust/Risk scoring and loan decisions are not evaluated in this module.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* BORROWER EXPERIENCE VIEW */}
              {resultView === 'borrower' && (
                <>
              {/* Checklist Badges */}
              <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, bgcolor: '#07111f', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                      Identity Match
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#34d399', mt: 0.5 }}>
                      ✓ {verificationResult.identity_match || 'MATCH'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, bgcolor: '#07111f', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                      Documents
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#34d399', mt: 0.5 }}>
                      ✓ {verificationResult.document_status || 'COMPLETE'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, bgcolor: '#07111f', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                      Consistency
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: verificationResult.consistency_status === 'CONSISTENT' ? '#34d399' : '#fbbf24',
                        mt: 0.5,
                      }}
                    >
                      {verificationResult.consistency_status === 'CONSISTENT' ? '✓ CONSISTENT' : '⚠ ' + verificationResult.consistency_status}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Confidence Score Bar */}
              <Box sx={{ p: 3, bgcolor: '#07111f', borderRadius: 2.5, border: '1px solid rgba(255, 255, 255, 0.08)', mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e2e8f0' }}>
                    Verification Confidence
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#36d6c2' }}>
                    {verificationResult.verification_confidence || 0}{' '}
                    <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/ 100</span>
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={verificationResult.verification_confidence || 0}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#36d6c2', borderRadius: 5 },
                  }}
                />
                <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
                  Independent verification score based strictly on document completeness, identity match, and consistency.
                </Typography>
              </Box>

              {/* WHY? Explanation Reasons */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', mb: 1.5 }}>
                  Why this result? (Explainable Evidence)
                </Typography>
                <List dense sx={{ bgcolor: '#07111f', borderRadius: 2, p: 1.5, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  {verificationResult.explanation && verificationResult.explanation.length > 0 ? (
                    verificationResult.explanation.map((reason, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircleIcon sx={{ color: '#36d6c2', fontSize: 18 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={reason}
                          primaryTypographyProps={{ style: { color: '#cbd5e1', fontSize: '0.9rem' } }}
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText
                        primary="Identity details and uploaded documents verified successfully."
                        primaryTypographyProps={{ style: { color: '#cbd5e1', fontSize: '0.9rem' } }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>

              {/* Verification Flags (if any) */}
              {verificationResult.flags && verificationResult.flags.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fbbf24', mb: 1 }}>
                    Review Flags ({verificationResult.flags.length})
                  </Typography>
                  {verificationResult.flags.map((flag, idx) => (
                    <Alert
                      key={idx}
                      severity={flag.severity === 'HIGH' ? 'error' : 'warning'}
                      sx={{ mb: 1, bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#fde68a' }}
                    >
                      <strong>{flag.type}:</strong> {flag.message}
                    </Alert>
                  ))}
                </Box>
              )}

              {/* Privacy & Masked Identifiers */}
              <Box
                sx={{
                  p: 2,
                  mb: 4,
                  bgcolor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  🔒 Masked Aadhaar: <strong>{verificationResult.masked_aadhaar || 'XXXX-XXXX-XXXX'}</strong>
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  🔒 Masked PAN: <strong>{verificationResult.masked_pan || 'XXXXXXXXXX'}</strong>
                </Typography>
                <Typography variant="caption" sx={{ color: '#36d6c2' }}>
                  Provider: <strong>{verificationResult.provider || 'MOCK'} (DEMO)</strong>
                </Typography>
              </Box>

              {/* Continue Actions */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setStep('FORM')}
                  startIcon={<RefreshIcon />}
                  sx={{
                    color: '#94a3b8',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    textTransform: 'none',
                    '&:hover': { borderColor: '#ffffff', color: '#ffffff' },
                  }}
                >
                  Re-test with different data
                </Button>

                <Button
                  variant="contained"
                  href="/app/dashboard"
                  sx={{
                    bgcolor: '#36d6c2',
                    color: '#07111f',
                    fontWeight: 800,
                    px: 5,
                    py: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    '&:hover': { bgcolor: '#20bbaa' },
                  }}
                >
                  Continue →
                </Button>
              </Box>
              </>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}
