const isDevelopment = import.meta.env.DEV;
const backendUrlEnv = import.meta.env.VITE_BACKEND_URL;
const portApi = import.meta.env.VITE_API_PORT || (isDevelopment ? '8000' : '');
const hostApi = backendUrlEnv
  ? backendUrlEnv.replace(/\/api\/?$/, '')
  : isDevelopment
    ? 'http://127.0.0.1'
    : 'http://localhost';
const baseURLApi = backendUrlEnv
  ? backendUrlEnv.endsWith('/api')
    ? backendUrlEnv
    : `${backendUrlEnv}/api`
  : `${hostApi}${portApi ? `:${portApi}` : ''}/api`;
const redirectUrl = isDevelopment
  ? 'http://localhost:3000'
  : typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:3000';

const isBackend =
  import.meta.env.VITE_BACKEND !== undefined
    ? String(import.meta.env.VITE_BACKEND).toLowerCase() === 'true'
    : true; // Default to true so it connects to real Django backend

const appConfig = {
  hostApi,
  portApi,
  baseURLApi,
  redirectUrl,
  isBackend,
  appName: 'TrustLens',
  auth: {
    email: 'admin@trustlens.ai',
    password: 'password123',
  },
  app: {
    colors: {
      dark: '#0f172a',
      light: '#FFFFFF',
      sea: '#0284c7',
      sky: '#e0f2fe',
      wave: '#38bdf8',
      rain: '#94a3b8',
      middle: '#cbd5e1',
      black: '#020617',
      salat: '#10b981',
    },
  },
};

export default appConfig;
