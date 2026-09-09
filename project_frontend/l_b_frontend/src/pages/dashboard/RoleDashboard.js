import { Navigate } from 'react-router-dom';
import { useUserState } from '../../context/UserContext';
import CompanyDashboard from '../company/CompanyDashboard';
import BorrowerDashboard from './BorrowerDashboard';
import LenderDashboard from './LenderDashboard';

export default function RoleDashboard() {
  const { currentUser, userRole } = useUserState();
  const role = currentUser?.role || userRole || 'borrower';

  if (role === 'company') return <CompanyDashboard />;
  if (role === 'lender') return <LenderDashboard />;
  if (role === 'borrower') return <BorrowerDashboard />;

  return <Navigate to='/app/dashboard' replace />;
}
