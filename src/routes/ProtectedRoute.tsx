import { CircularProgress, Box } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import type { Role } from '../types';

interface Props { role?: Role }

/** UX guard only. The backend enforces authorization on every request. */
export default function ProtectedRoute({ role }: Props) {
  const { user, initializing } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (initializing) {
    return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><CircularProgress aria-label="Loading" /></Box>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
