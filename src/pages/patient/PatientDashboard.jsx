import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

export default function PatientDashboard() {
  const { profile } = useAuth();
  const { t } = useLocale();
  const [stats, setStats] = useState({ reports: 0, medicines: 0, reminders: 0 });
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;
    const patientId = profile.id;

    Promise.all([
      supabase.from('medical_reports').select('id', { count: 'exact' }).eq('patient_id', patientId),
      supabase.from('medicines').select('id', { count: 'exact' }).eq('patient_id', patientId),
      supabase.from('reminders').select('id', { count: 'exact' }).eq('patient_id', patientId),
      supabase
        .from('medical_reports')
        .select('id, title, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]).then(([reports, medicines, reminders, recent]) => {
      setStats({
        reports: reports.count || 0,
        medicines: medicines.count || 0,
        reminders: reminders.count || 0,
      });
      setRecentReports(recent.data || []);
    });
  }, [profile?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('welcome')}, {profile?.full_name || ''}</h1>
        <p className="text-slate-500">{t('tagline')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label={t('reports')} value={stats.reports} to="/patient/reports" />
        <StatCard label={t('medicines')} value={stats.medicines} to="/patient/medicines" />
        <StatCard label={t('reminders')} value={stats.reminders} to="/patient/reminders" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('reports')}</h2>
          <Link to="/patient/reports" className="btn-secondary text-sm">
            {t('uploadReport')}
          </Link>
        </div>
        {recentReports.length === 0 ? (
          <p className="text-slate-500 text-sm">{t('noData')}.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {recentReports.map((r) => (
              <li key={r.id} className="py-3 flex justify-between items-center">
                <span className="font-medium">{r.title || 'Untitled'}</span>
                <span className="text-sm text-slate-500">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, to }) {
  return (
    <Link to={to} className="card block hover:shadow-md transition-shadow">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-primary-600">{value}</p>
    </Link>
  );
}
