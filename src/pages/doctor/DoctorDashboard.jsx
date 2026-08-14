import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const { t } = useLocale();
  const [authorizedCount, setAuthorizedCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    // Count distinct patients who have granted this doctor access
    supabase
      .from('permissions')
      .select('patient_id', { count: 'exact', head: true })
      .eq('grantee_email', profile.email)
      .eq('grantee_type', 'doctor')
      .then(({ count }) => setAuthorizedCount(count || 0));
  }, [profile?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('welcome')}, Dr. {profile?.full_name || ''}</h1>
        <p className="text-slate-500">{t('doctor')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">{t('sharing')} — {t('patient')}s</p>
          <p className="text-3xl font-bold text-primary-600">{authorizedCount}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-2">{t('reports')}</h2>
        <p className="text-slate-500 text-sm mb-4">
          View reports shared with you by patients.
        </p>
        <Link to="/doctor/reports" className="btn-primary text-sm">
          {t('reports')}
        </Link>
      </div>
    </div>
  );
}
