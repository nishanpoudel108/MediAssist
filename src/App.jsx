import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLocale } from './context/LocaleContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Welcome from './pages/Welcome';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function HomeRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  const routes = {
    patient: '/patient',
    doctor: '/doctor',
    family: '/family',
    admin: '/admin',
  };
  if (!user) return <Welcome />;
  // A new session can exist a moment before the profile query completes.
  // Keep it in place rather than bouncing the user back to the login form.
  if (!profile) return null;
  const role = profile.role;
  return <Navigate to={routes[role] || '/login'} replace />;
}

export default function App() {
  const { loading } = useAuth();
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute role="patient" />}>
        <Route path="/patient/*" element={<Layout role="patient" />} />
      </Route>
      <Route element={<ProtectedRoute role="doctor" />}>
        <Route path="/doctor/*" element={<Layout role="doctor" />} />
      </Route>
      <Route element={<ProtectedRoute role="family" />}>
        <Route path="/family/*" element={<Layout role="family" />} />
      </Route>
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin/*" element={<Layout role="admin" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
