import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocale } from '../../context/LocaleContext';

export default function AdminDashboard() {
  const { t } = useLocale();
  const [counts, setCounts] = useState({ users: 0, hospitals: 0, reports: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('hospitals').select('id', { count: 'exact', head: true }),
      supabase.from('medical_reports').select('id', { count: 'exact', head: true }),
    ]).then(([users, hospitals, reports]) => {
      setCounts({
        users: users.count || 0,
        hospitals: hospitals.count || 0,
        reports: reports.count || 0,
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin')}</h1>
        <p className="text-slate-500">Platform health &amp; usage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">{t('users')}</p>
          <p className="text-3xl font-bold text-primary-600">{counts.users}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t('hospitals')}</p>
          <p className="text-3xl font-bold text-primary-600">{counts.hospitals}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t('reports')}</p>
          <p className="text-3xl font-bold text-primary-600">{counts.reports}</p>
        </div>
      </div>
    </div>
  );
}
