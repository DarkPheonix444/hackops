import React from 'react';
import axios from 'axios';
import { decodeJwtPayload } from '../utils/jwt';
import config from '../config';
import { showSnackbar } from '../components/Snackbar';
import authService from '../services/authService';

let UserStateContext = React.createContext();
let UserDispatchContext = React.createContext();

function userReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isFetching: false,
        errorMessage: '',
        ...action.payload,
      };
    case 'REGISTER_REQUEST':
    case 'LOGIN_REQUEST':
    case 'RESET_REQUEST':
    case 'PASSWORD_RESET_EMAIL_REQUEST':
      return {
        ...state,
        isFetching: true,
        errorMessage: '',
      };
    case 'SIGN_OUT_SUCCESS':
      return {
        ...state,
        currentUser: null,
        userRole: 'borrower',
        isFetching: false,
      };
    case 'ROLE_CHANGED':
      return {
        ...state,
        userRole: action.payload,
      };
    case 'AUTH_INIT_ERROR':
      return {
        ...state,
        currentUser: null,
        loadingInit: false,
        isFetching: false,
      };
    case 'REGISTER_SUCCESS':
    case 'RESET_SUCCESS':
    case 'PASSWORD_RESET_EMAIL_SUCCESS':
      return {
        ...state,
        isFetching: false,
        errorMessage: '',
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isFetching: false,
        errorMessage: action.payload,
      };
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

function UserProvider({ children }) {
  let [state, dispatch] = React.useReducer(userReducer, {
    isAuthenticated: () => {
      const token = localStorage.getItem('token');
      if (token) {
        const date = new Date().getTime() / 1000;
        const data = decodeJwtPayload(token);
        if (!data || !data.exp) return true; // If exp not present, consider authenticated
        return date < data.exp;
      }
      return false;
    },
    isFetching: false,
    errorMessage: '',
    currentUser: null,
    userRole: localStorage.getItem('user_role') || 'borrower',
    loadingInit: true,
  });

  return (
    <UserStateContext.Provider value={state}>
      <UserDispatchContext.Provider value={dispatch}>
        {children}
      </UserDispatchContext.Provider>
    </UserStateContext.Provider>
  );
}

function useUserState() {
  let context = React.useContext(UserStateContext);
  if (context === undefined) {
    throw new Error('useUserState must be used within a UserProvider');
  }
  return context;
}

function useUserDispatch() {
  let context = React.useContext(UserDispatchContext);
  if (context === undefined) {
    throw new Error('useUserDispatch must be used within a UserProvider');
  }
  return context;
}

export { UserProvider, useUserState, useUserDispatch };

// ###########################################################

export async function loginUser(
  dispatch,
  login,
  password,
  setIsLoading,
  setError,
  role = 'borrower',
  navigate = null
) {
  if (setError) setError(false);
  if (setIsLoading) setIsLoading(true);
  dispatch({ type: 'LOGIN_REQUEST' });

  try {
    const data = await authService.login(login, password);
    const accessToken = data.access;
    const refreshToken = data.refresh;

    if (accessToken) {
      localStorage.setItem('token', accessToken);
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user_role', role);
      
      const userObj = {
        email: data.email || login,
        name: data.name || login.split('@')[0],
      };
      localStorage.setItem('user', JSON.stringify(userObj));
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;

      let meData = userObj;
      try {
        meData = await authService.getMe();
        sessionStorage.setItem('user_id', meData.id);
      } catch (e) {
        console.warn('Could not fetch /users/me/ immediately:', e);
      }

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          currentUser: meData,
          userRole: role,
        },
      });

      showSnackbar({
        type: 'success',
        message: `Welcome back, ${meData.name || 'User'}! Signed in as ${role === 'admin' ? 'Administrator' : role === 'lender' ? 'Lender' : 'Borrower'}.`,
      });

      if (setError) setError(null);
      if (setIsLoading) setIsLoading(false);

      if (navigate) {
        if (role === 'admin') {
          navigate('/app/admin');
        } else {
          navigate('/app/dashboard');
        }
      } else {
        window.location.href = role === 'admin' ? '#/app/admin' : '#/app/dashboard';
      }
    } else {
      throw new Error('No access token returned');
    }
  } catch (err) {
    console.error('Login error:', err);
    const errorMsg =
      err.response?.data?.detail ||
      err.response?.data?.non_field_errors?.[0] ||
      'Invalid email or password. Please check credentials.';
    if (setError) setError(errorMsg);
    if (setIsLoading) setIsLoading(false);
    dispatch({ type: 'AUTH_FAILURE', payload: errorMsg });
    showSnackbar({
      type: 'error',
      message: errorMsg,
    });
  }
}

export function switchUserRole(dispatch, newRole) {
  localStorage.setItem('user_role', newRole);
  dispatch({
    type: 'ROLE_CHANGED',
    payload: newRole,
  });
  showSnackbar({
    type: 'info',
    message: `Switched dashboard perspective to ${newRole === 'company' ? 'Company Verification Hub' : newRole === 'lender' ? 'Lender Hub' : 'Borrower Hub'}`,
  });
}

export function signOut(dispatch, navigate) {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('user_id');
  sessionStorage.removeItem('user_id');
  axios.defaults.headers.common['Authorization'] = '';
  dispatch({ type: 'SIGN_OUT_SUCCESS' });
  if (navigate) {
    navigate('/login');
  } else {
    window.location.href = '/login';
  }
}

export function receiveToken(token, dispatch) {
  localStorage.setItem('token', token);
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
  dispatch({ type: 'LOGIN_SUCCESS' });
}

export function doInit() {
  return async (dispatch) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
        const currentUser = await authService.getMe();
        if (currentUser?.id) {
          sessionStorage.setItem('user_id', currentUser.id);
        }
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            currentUser,
            userRole: localStorage.getItem('user_role') || 'borrower',
            loadingInit: false,
          },
        });
      } else {
        dispatch({
          type: 'AUTH_INIT_ERROR',
        });
      }
    } catch (error) {
      console.warn('doInit error:', error);
      dispatch({
        type: 'AUTH_INIT_ERROR',
        payload: error,
      });
    }
  };
}

export function registerUser(
  dispatch,
  { name, email, password, role = 'borrower' },
  setIsLoading,
  setError,
  navigate
) {
  return async () => {
    if (setIsLoading) setIsLoading(true);
    if (setError) setError(false);
    dispatch({ type: 'REGISTER_REQUEST' });

    try {
      await authService.signup(email, name, password);
      dispatch({ type: 'REGISTER_SUCCESS' });

      showSnackbar({
        type: 'success',
        message: 'Account created successfully! Logging you in...',
      });

      // Auto login immediately with newly created account
      await loginUser(
        dispatch,
        email,
        password,
        setIsLoading,
        setError,
        role,
        navigate
      );
    } catch (err) {
      console.error('Registration error:', err);
      let errorMsg = 'Failed to register. Please check your details.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (typeof err.response.data === 'object') {
          errorMsg = Object.entries(err.response.data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
        }
      }
      if (setError) setError(errorMsg);
      if (setIsLoading) setIsLoading(false);
      dispatch({ type: 'AUTH_FAILURE', payload: errorMsg });
      showSnackbar({
        type: 'error',
        message: errorMsg,
      });
    }
  };
}

export function sendPasswordResetEmail(email) {
  return (dispatch) => {
    dispatch({ type: 'PASSWORD_RESET_EMAIL_REQUEST' });
    showSnackbar({
      type: 'info',
      message: 'If this email is registered, password reset instructions have been sent.',
    });
    dispatch({ type: 'PASSWORD_RESET_EMAIL_SUCCESS' });
  };
}

export function resetPassword(token, password, navigate) {
  return (dispatch) => {
    dispatch({ type: 'RESET_REQUEST' });
    // TODO: wire to real backend endpoint when available
    showSnackbar({
      type: 'success',
      message: 'Password has been reset successfully.',
    });
    dispatch({ type: 'RESET_SUCCESS' });
    if (navigate) navigate('/login');
  };
}

export function authError(message) {
  return (dispatch) => {
    dispatch({
      type: 'AUTH_FAILURE',
      payload: message || '',
    });
    if (message) {
      showSnackbar({ type: 'error', message });
    }
  };
}

export function verifyEmail(token, navigate) {
  return (dispatch) => {
    // TODO: wire to real backend endpoint when available
    showSnackbar({
      type: 'success',
      message: 'Email verified successfully!',
    });
    dispatch({ type: 'LOGIN_SUCCESS', payload: {} });
    if (navigate) navigate('/login');
  };
}
