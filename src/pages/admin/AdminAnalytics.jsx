import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocale } from '../../context/LocaleContext';

export default function AdminAnalytics() {
  const { t } = useLocale();
  const [stats, setStats] = useState({ reports: 0, analyses: 0, audits: 0, emergencies: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from('medical_reports').select('id', { count: 'exact', head: true }),
      supabase.from('ai_analysis').select('id', { count: 'exact', head: true }),
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
      supabase.from('ai_analysis').select('id', { count: 'exact', head: true }).eq('is_emergency', true),
    ]).then(([reports, analyses, audits, emergencies]) => {
      setStats({
        reports: reports.count || 0,
        analyses: analyses.count || 0,
        audits: audits.count || 0,
        emergencies: emergencies.count || 0,
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('analytics')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card"><p className="text-sm text-slate-500">{t('reports')}</p><p className="text-3xl font-bold text-primary-600">{stats.reports}</p></div>
        <div className="card"><p className="text-sm text-slate-500">AI analyses</p><p className="text-3xl font-bold text-primary-600">{stats.analyses}</p></div>
        <div className="card"><p className="text-sm text-slate-500">{t('auditLog')}</p><p className="text-3xl font-bold text-primary-600">{stats.audits}</p></div>
        <div className="card"><p className="text-sm text-slate-500">Emergency flags</p><p className="text-3xl font-bold text-red-600">{stats.emergencies}</p></div>
      </div>
    </div>
  );
}
