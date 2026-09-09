import React, { useState, useEffect } from 'react';
import {
  Grid,
  CircularProgress,
  Tabs,
  Tab,
  Grow,
  TextField,
  Typography,
  Box,
  Paper,
  Card,
  CardActionArea,
  CardContent,
  Chip,
} from '@mui/material';
import {
  AccountBalance as LenderIcon,
  Person as BorrowerIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  VerifiedUser as TrustIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate, Link } from 'react-router-dom';

// styles
import useStyles from './styles';

// context
import {
  useUserDispatch,
  loginUser,
  registerUser,
  sendPasswordResetEmail,
  receiveToken,
  doInit,
} from '../../context/UserContext';

// components
import { Button } from '../../components/Wrappers';

export default function Login() {
  const classes = useStyles();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = new URLSearchParams(location.search).get('tab');

  const userDispatch = useUserDispatch();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      receiveToken(token, userDispatch);
      doInit()(userDispatch);
      navigate('/app/dashboard');
    }
  }, [location.search, navigate, userDispatch]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const parsedTab = Number(tab);
  const [activeTabId, setActiveTabId] = useState(Number.isFinite(parsedTab) ? parsedTab : 0);

  // Role selection: 'borrower' or 'lender'
  const [selectedRole, setSelectedRole] = useState(
    localStorage.getItem('user_role') || 'borrower'
  );

  const [nameValue, setNameValue] = useState('');
  const [loginValue, setLoginValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgot, setIsForgot] = useState(false);

  const isLoginFormValid = () => {
    return loginValue.trim().length !== 0 && passwordValue.length !== 0;
  };

  const isRegisterFormValid = () => {
    return (
      nameValue.trim().length !== 0 &&
      loginValue.trim().length !== 0 &&
      passwordValue.length >= 6
    );
  };

  const handleLogin = () => {
    if (!isLoginFormValid()) return;
    loginUser(
      userDispatch,
      loginValue.trim(),
      passwordValue,
      setIsLoading,
      setError,
      selectedRole,
      navigate
    );
  };

  const handleRegister = () => {
    if (!isRegisterFormValid()) return;
    registerUser(
      userDispatch,
      {
        name: nameValue.trim(),
        email: loginValue.trim(),
        password: passwordValue,
        role: selectedRole,
      },
      setIsLoading,
      setError,
      navigate
    )();
  };

  const loginOnEnterKey = (event) => {
    if (event.key === 'Enter') {
      if (activeTabId === 0 && isLoginFormValid()) {
        handleLogin();
      } else if (activeTabId === 1 && isRegisterFormValid()) {
        handleRegister();
      }
    }
  };

  return (
    <Grid container className={classes.container} style={{ minHeight: '100vh', background: '#0a0f1d' }}>
      {/* Brand Side Panel */}
      <div
        className={classes.logotypeContainer}
        style={{
          background: 'linear-gradient(135deg, #091e3a 0%, #03204c 50%, #02122c 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <Box display='flex' alignItems='center' justifyContent='center' mb={2}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 800,
                color: '#fff',
                boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
                marginRight: 14,
              }}
            >
              T
            </div>
            <Typography variant='h2' style={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
              TrustLens
            </Typography>
          </Box>

          <Chip
            icon={<TrustIcon style={{ color: '#38bdf8' }} />}
            label='AI Lending Intelligence Platform'
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              fontWeight: 600,
              marginBottom: 24,
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          />

          <Typography
            variant='h5'
            style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 16, lineHeight: 1.4 }}
          >
            Know who to trust before you lend.
          </Typography>

          <Typography variant='body1' style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: 32 }}>
            Instant identity verification, OCR document intelligence, credit analysis, and explainable AI risk scoring for borrowers and institutional lenders.
          </Typography>

          <Box display='flex' justifyContent='center' gap={2}>
            <Link
              to='/'
              style={{
                textDecoration: 'none',
                color: '#38bdf8',
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 14,
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <ArrowBackIcon style={{ fontSize: 16, marginRight: 6 }} /> Back to Home
            </Link>
          </Box>
        </div>
      </div>

      {/* Form Panel */}
      <div className={classes.formContainer} style={{ background: '#0b1329', padding: '40px 24px' }}>
        <Paper
          elevation={4}
          style={{
            maxWidth: 520,
            width: '100%',
            padding: '36px',
            borderRadius: 18,
            background: '#111c3a',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          {isForgot ? (
            <div>
              <Typography variant='h4' style={{ color: '#f8fafc', fontWeight: 700, marginBottom: 8 }}>
                Reset Password
              </Typography>
              <Typography variant='body2' style={{ color: '#94a3b8', marginBottom: 24 }}>
                Enter your account email to receive a password reset link.
              </Typography>
              <TextField
                id='forgot-email'
                label='Email Address'
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                margin='normal'
                type='email'
                fullWidth
                variant='outlined'
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{
                  style: { color: '#f8fafc', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
                }}
              />
              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <Button
                  disabled={forgotEmail.trim().length === 0}
                  onClick={() => sendPasswordResetEmail(forgotEmail)(userDispatch)}
                  variant='contained'
                  color='primary'
                  size='large'
                >
                  Send Reset Link
                </Button>
                <Button
                  color='secondary'
                  size='large'
                  onClick={() => setIsForgot(false)}
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Switcher */}
              <Tabs
                value={activeTabId}
                onChange={(e, id) => {
                  setActiveTabId(id);
                  setError(null);
                }}
                indicatorColor='primary'
                textColor='primary'
                variant='fullWidth'
                style={{
                  marginBottom: 24,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <Tab
                  label='Sign In'
                  style={{ color: activeTabId === 0 ? '#38bdf8' : '#94a3b8', fontWeight: 600, fontSize: 15 }}
                />
                <Tab
                  label='Create Account'
                  style={{ color: activeTabId === 1 ? '#38bdf8' : '#94a3b8', fontWeight: 600, fontSize: 15 }}
                />
              </Tabs>

              {/* ROLE SELECTION (MANDATORY REQUIREMENT) */}
              <Box mb={3}>
                <Typography
                  variant='body2'
                  style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Select Your Portal Role:
                </Typography>
                <Grid container spacing={2}>
                  {/* Borrower Card */}
                  <Grid size={{ xs: 6 }}>
                    <Card
                      style={{
                        background:
                          selectedRole === 'borrower'
                            ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(2, 132, 199, 0.1) 100%)'
                            : 'rgba(15, 23, 42, 0.6)',
                        border:
                          selectedRole === 'borrower'
                            ? '2px solid #38bdf8'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 12,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <CardActionArea
                        onClick={() => setSelectedRole('borrower')}
                        style={{ padding: '14px 10px', textAlign: 'center' }}
                      >
                        <Box display='flex' justifyContent='center' alignItems='center' position='relative'>
                          <BorrowerIcon
                            style={{
                              fontSize: 32,
                              color: selectedRole === 'borrower' ? '#38bdf8' : '#94a3b8',
                              marginBottom: 4,
                            }}
                          />
                          {selectedRole === 'borrower' && (
                            <CheckCircleIcon
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                fontSize: 18,
                                color: '#38bdf8',
                              }}
                            />
                          )}
                        </Box>
                        <Typography
                          variant='subtitle1'
                          style={{
                            fontWeight: 700,
                            color: selectedRole === 'borrower' ? '#fff' : '#cbd5e1',
                          }}
                        >
                          Borrower
                        </Typography>
                        <Typography
                          variant='caption'
                          style={{ color: '#94a3b8', display: 'block', fontSize: 11, marginTop: 2 }}
                        >
                          Apply for loans & upload KYC
                        </Typography>
                      </CardActionArea>
                    </Card>
                  </Grid>

                  {/* Lender Card */}
                  <Grid size={{ xs: 6 }}>

                    <Card
                      style={{
                        background:
                          selectedRole === 'lender'
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)'
                            : 'rgba(15, 23, 42, 0.6)',
                        border:
                          selectedRole === 'lender'
                            ? '2px solid #10b981'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 12,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <CardActionArea
                        onClick={() => setSelectedRole('lender')}
                        style={{ padding: '14px 10px', textAlign: 'center' }}
                      >
                        <Box display='flex' justifyContent='center' alignItems='center' position='relative'>
                          <LenderIcon
                            style={{
                              fontSize: 32,
                              color: selectedRole === 'lender' ? '#10b981' : '#94a3b8',
                              marginBottom: 4,
                            }}
                          />
                          {selectedRole === 'lender' && (
                            <CheckCircleIcon
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                fontSize: 18,
                                color: '#10b981',
                              }}
                            />
                          )}
                        </Box>
                        <Typography
                          variant='subtitle1'
                          style={{
                            fontWeight: 700,
                            color: selectedRole === 'lender' ? '#fff' : '#cbd5e1',
                          }}
                        >
                          Lender
                        </Typography>
                        <Typography
                          variant='caption'
                          style={{ color: '#94a3b8', display: 'block', fontSize: 11, marginTop: 2 }}
                        >
                          Review feed & fund requests
                        </Typography>
                      </CardActionArea>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              {/* Error Message */}
              <Grow in={Boolean(error)}>
                <Box
                  p={1.5}
                  mb={2}
                  borderRadius={2}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    fontSize: 13,
                  }}
                >
                  {error}
                </Box>
              </Grow>

              {/* TAB 0: SIGN IN */}
              {activeTabId === 0 && (
                <div>
                  <TextField
                    id='email'
                    label='Email Address'
                    variant='outlined'
                    value={loginValue}
                    onChange={(e) => setLoginValue(e.target.value)}
                    margin='normal'
                    type='email'
                    fullWidth
                    onKeyDown={loginOnEnterKey}
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                    InputProps={{
                      style: { color: '#f8fafc', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
                    }}
                  />
                  <TextField
                    id='password'
                    label='Password'
                    variant='outlined'
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    margin='normal'
                    type='password'
                    fullWidth
                    onKeyDown={loginOnEnterKey}
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                    InputProps={{
                      style: { color: '#f8fafc', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
                    }}
                  />

                  <Box display='flex' justifyContent='space-between' alignItems='center' mt={1} mb={2}>
                    <Typography variant='caption' style={{ color: '#94a3b8' }}>
                      Entering as:{' '}
                      <strong style={{ color: selectedRole === 'lender' ? '#10b981' : '#38bdf8' }}>
                        {selectedRole === 'lender' ? 'Lender / Investor' : 'Borrower / Applicant'}
                      </strong>
                    </Typography>
                    <Button
                      color='primary'
                      size='small'
                      onClick={() => setIsForgot(true)}
                      style={{ textTransform: 'none', color: '#38bdf8' }}
                    >
                      Forgot password?
                    </Button>
                  </Box>

                  <Box mt={2}>
                    <Button
                      disabled={!isLoginFormValid() || isLoading}
                      onClick={handleLogin}
                      variant='contained'
                      color='primary'
                      size='large'
                      fullWidth
                      style={{
                        padding: '12px',
                        fontWeight: 700,
                        fontSize: 15,
                        background:
                          selectedRole === 'lender'
                            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                            : 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                        boxShadow:
                          selectedRole === 'lender'
                            ? '0 6px 20px rgba(16, 185, 129, 0.3)'
                            : '0 6px 20px rgba(2, 132, 199, 0.3)',
                      }}
                    >
                      {isLoading ? (
                        <CircularProgress size={24} style={{ color: '#fff' }} />
                      ) : (
                        `Sign In as ${selectedRole === 'lender' ? 'Lender' : 'Borrower'}`
                      )}
                    </Button>
                  </Box>
                </div>
              )}

              {/* TAB 1: CREATE ACCOUNT */}
              {activeTabId === 1 && (
                <div>
                  <TextField
                    id='reg-name'
                    label='Full Name'
                    variant='outlined'
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    margin='normal'
                    fullWidth
                    onKeyDown={loginOnEnterKey}
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                    InputProps={{
                      style: { color: '#f8fafc', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
                    }}
                  />
                  <TextField
                    id='reg-email'
                    label='Email Address'
                    variant='outlined'
                    value={loginValue}
                    onChange={(e) => setLoginValue(e.target.value)}
                    margin='normal'
                    type='email'
                    fullWidth
                    onKeyDown={loginOnEnterKey}
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                    InputProps={{
                      style: { color: '#f8fafc', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
                    }}
                  />
                  <TextField
                    id='reg-password'
                    label='Password (min 6 characters)'
                    variant='outlined'
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    margin='normal'
                    type='password'
                    fullWidth
                    onKeyDown={loginOnEnterKey}
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                    InputProps={{
                      style: { color: '#f8fafc', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
                    }}
                  />

                  <Box mt={3}>
                    <Button
                      disabled={!isRegisterFormValid() || isLoading}
                      onClick={handleRegister}
                      variant='contained'
                      color='primary'
                      size='large'
                      fullWidth
                      style={{
                        padding: '12px',
                        fontWeight: 700,
                        fontSize: 15,
                        background:
                          selectedRole === 'lender'
                            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                            : 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                        boxShadow:
                          selectedRole === 'lender'
                            ? '0 6px 20px rgba(16, 185, 129, 0.3)'
                            : '0 6px 20px rgba(2, 132, 199, 0.3)',
                      }}
                    >
                      {isLoading ? (
                        <CircularProgress size={24} style={{ color: '#fff' }} />
                      ) : (
                        `Create ${selectedRole === 'lender' ? 'Lender' : 'Borrower'} Account`
                      )}
                    </Button>
                  </Box>
                </div>
              )}
            </>
          )}
        </Paper>
      </div>
    </Grid>
  );
}
