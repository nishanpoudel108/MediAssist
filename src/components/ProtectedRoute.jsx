import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Route guard enforcing role-based access at the UI level.
// (Database-level enforcement is handled by Supabase RLS.)
export default function ProtectedRoute({ role }) {
  const { user, profile, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!profile) return null;
  const actualRole = profile.role;

  if (actualRole !== role) {
    // Redirect logged-in users to their own dashboard
    const routes = {
      patient: '/patient',
      doctor: '/doctor',
      family: '/family',
      admin: '/admin',
    };
    return <Navigate to={routes[actualRole] || '/login'} replace />;
  }
  return <Outlet />;
}
