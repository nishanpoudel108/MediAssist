import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

export default function DoctorReports() {
  const { profile } = useAuth();
  const { t } = useLocale();
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!profile?.id) return;
    loadAuthorizedReports();
  }, [profile?.id]);

  async function loadAuthorizedReports() {
    // Doctor can only see reports via active permissions (RLS enforces this server-side).
    // Fetch permissions granted to this doctor, then the underlying reports.
    const { data: perms } = await supabase
      .from('permissions')
      .select('patient_id')
      .eq('grantee_email', profile.email)
      .eq('grantee_type', 'doctor');

    if (!perms?.length) return;
    const patientIds = perms.map((p) => p.patient_id);

    const { data } = await supabase
      .from('medical_reports')
      .select('*, ai_analysis(*), patients(full_name)')
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false });
    setReports(data || []);
  }

  function selectReport(r) {
    setSelected(r);
    // Audit log this access (Phase 4 requirement).
    supabase.from('audit_logs').insert([
      { actor_id: profile.id, patient_id: r.patient_id, action: 'view', resource: `report:${r.id}` },
    ]);
  }

  async function downloadReport(r) {
    await supabase.from('audit_logs').insert([
      { actor_id: profile.id, patient_id: r.patient_id, action: 'download', resource: `report:${r.id}` },
    ]);
    const { data, error } = await supabase.storage
      .from('reports')
      .createSignedUrl(r.file_path, 60);
    if (!error) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('reports')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold mb-3">Authorized reports</h2>
          {reports.length === 0 ? (
            <p className="text-slate-500 text-sm">{t('noData')}.</p>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => selectReport(r)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                      selected?.id === r.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-medium">{r.title}</span>
                    <span className="block text-xs text-slate-500">{r.patients?.full_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="card flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{selected.title}</h2>
                  <p className="text-sm text-slate-500">{selected.patients?.full_name}</p>
                </div>
                <button onClick={() => downloadReport(selected)} className="btn-primary text-sm">
                  {t('download')}
                </button>
              </div>
              {selected.ai_analysis?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold mb-2">{t('summary')}</h3>
                  <p className="text-slate-700 whitespace-pre-wrap">{selected.ai_analysis[0].summary}</p>
                  <p className="mt-3 text-sm italic text-slate-500">{selected.ai_analysis[0].disclaimer}</p>
                </div>
              )}
            </>
          ) : (
            <div className="card text-slate-500">{t('noData')}.</div>
          )}
        </div>
      </div>
    </div>
  );
}
