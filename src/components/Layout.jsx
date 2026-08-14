import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import LanguageSwitcher from './LanguageSwitcher';
import PatientDashboard from '../pages/patient/PatientDashboard';
import Reports from '../pages/patient/Reports';
import Medicines from '../pages/patient/Medicines';
import Reminders from '../pages/patient/Reminders';
import Sharing from '../pages/patient/Sharing';
import Hospitals from '../pages/patient/Hospitals';
import DoctorDashboard from '../pages/doctor/DoctorDashboard';
import DoctorReports from '../pages/doctor/DoctorReports';
import FamilyDashboard from '../pages/family/FamilyDashboard';
import FamilyCare from '../pages/family/FamilyCare';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminHospitals from '../pages/admin/AdminHospitals';
import AdminAnalytics from '../pages/admin/AdminAnalytics';

const navByRole = {
  patient: [
    { to: '', label: 'dashboard', end: true },
    { to: 'reports', label: 'reports' },
    { to: 'medicines', label: 'medicines' },
    { to: 'reminders', label: 'reminders' },
    { to: 'sharing', label: 'sharing' },
    { to: 'hospitals', label: 'hospitals' },
  ],
  doctor: [
    { to: '', label: 'dashboard', end: true },
    { to: 'reports', label: 'reports' },
  ],
  family: [
    { to: '', label: 'dashboard', end: true },
    { to: 'care', label: 'sharing' },
  ],
  admin: [
    { to: '', label: 'dashboard', end: true },
    { to: 'users', label: 'users' },
    { to: 'hospitals', label: 'hospitals' },
    { to: 'analytics', label: 'analytics' },
  ],
};

const roleRoutes = {
  patient: (
    <Routes>
      <Route index element={<PatientDashboard />} />
      <Route path="reports" element={<Reports />} />
      <Route path="medicines" element={<Medicines />} />
      <Route path="reminders" element={<Reminders />} />
      <Route path="sharing" element={<Sharing />} />
      <Route path="hospitals" element={<Hospitals />} />
    </Routes>
  ),
  doctor: (
    <Routes>
      <Route index element={<DoctorDashboard />} />
      <Route path="reports" element={<DoctorReports />} />
    </Routes>
  ),
  family: (
    <Routes>
      <Route index element={<FamilyDashboard />} />
      <Route path="care" element={<FamilyCare />} />
    </Routes>
  ),
  admin: (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="hospitals" element={<AdminHospitals />} />
      <Route path="analytics" element={<AdminAnalytics />} />
    </Routes>
  ),
};

export default function Layout({ role }) {
  const { profile, signOut } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const nav = navByRole[role] || [];
  const routes = roleRoutes[role] || null;
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-sm md:hidden">
        <div>
          <h1 className="font-bold text-primary-700">{t('appName')}</h1>
          <p className="text-xs capitalize text-slate-500">{role}</p>
        </div>
        <button
          type="button"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="btn-secondary px-3"
        >
          Menu
        </button>
      </header>
      {/* Sidebar */}
      <aside className={`${menuOpen ? 'flex' : 'hidden'} w-full bg-slate-800 text-white flex-col md:flex md:w-64 md:shrink-0`}>
        <div className="px-6 py-6 border-b border-white/10">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-300 text-sm font-bold text-slate-800">M</div>
          <h1 className="text-lg font-bold tracking-tight">{t('appName')}</h1>
          <p className="mt-1 text-xs text-primary-200 capitalize">{role} workspace</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-5 border-t border-white/10 space-y-3">
          <LanguageSwitcher compact />
          <p className="text-sm text-slate-300 truncate">{profile?.full_name || profile?.email}</p>
          <button onClick={handleSignOut} className="btn-secondary w-full text-slate-900">
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">{routes}</main>
    </div>
  );
}
