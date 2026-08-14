import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

export default function FamilyCare() {
  const { profile } = useAuth();
  const { t } = useLocale();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [reportsByPatient, setReportsByPatient] = useState({});
  const [adherence, setAdherence] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSharedReports();
  }, []);

  async function loadSharedReports() {
    setLoading(true);
    setError('');

    // RLS is the source of truth for report access.
    const [{ data: patientData, error: patientsError }, { data, error: reportsError }] = await Promise.all([
      supabase.rpc('get_shared_family_patients'),
      supabase
      .from('medical_reports')
      .select('id, patient_id, title, file_path, created_at, ai_analysis(summary)')
      .order('created_at', { ascending: false }),
    ]);

    if (patientsError || reportsError) {
      setError((patientsError || reportsError).message);
      setLoading(false);
      return;
    }

    const groupedReports = (data || []).reduce((result, report) => {
      result[report.patient_id] = [...(result[report.patient_id] || []), report];
      return result;
    }, {});
    const sharedPatients = (patientData || []).filter((patient) => groupedReports[patient.id]);
    setReportsByPatient(groupedReports);
    setPatients(sharedPatients);
    setLoading(false);
  }

  async function selectPatient(patient) {
    setSelectedPatient(patient);
    setAdherence(0);
    setError('');
    await supabase.from('audit_logs').insert([
      { actor_id: profile.id, patient_id: patient.id, action: 'view', resource: 'family:shared' },
    ]);

    const { data: doseLogs, error: dosesError } = await supabase
      .from('dose_logs')
      .select('status')
      .eq('patient_id', patient.id);
    if (dosesError) {
      setError(dosesError.message);
      return;
    }
    if (doseLogs?.length) {
      const taken = doseLogs.filter((dose) => dose.status === 'taken').length;
      setAdherence(Math.round((taken / doseLogs.length) * 100));
    }
  }

  async function openReport(report) {
    setError('');
    await supabase.from('audit_logs').insert([
      { actor_id: profile.id, patient_id: selectedPatient.id, action: 'download', resource: `report:${report.id}` },
    ]);

    const { data, error: signedUrlError } = await supabase.storage
      .from('reports')
      .createSignedUrl(report.file_path, 60);
    if (signedUrlError) {
      setError(`Unable to open this report: ${signedUrlError.message}`);
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  const selectedReports = selectedPatient ? reportsByPatient[selectedPatient.id] || [] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shared care</h1>
        <p className="text-slate-500">Health records patients have chosen to share with you.</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Shared patients</h2>
        {loading && <p className="mt-3 text-sm text-slate-500">{t('loading')}</p>}
        {error && <p className="mt-3 text-sm text-red-600">Unable to load shared records: {error}</p>}
        {!loading && !error && patients.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No uploaded reports have been shared with you yet.</p>
        )}
        {patients.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {patients.map((patient) => (
              <button key={patient.id} type="button" onClick={() => selectPatient(patient)} className={selectedPatient?.id === patient.id ? 'btn-primary' : 'btn-secondary'}>
                {patient.full_name || patient.email}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedPatient && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <p className="text-sm text-slate-500">Patient</p>
              <p className="mt-1 text-lg font-semibold">{selectedPatient.full_name || selectedPatient.email}</p>
              {selectedPatient.full_name && <p className="mt-1 text-sm text-slate-500">{selectedPatient.email}</p>}
            </div>
            <div className="card">
              <p className="text-sm text-slate-500">{t('adherence')}</p>
              <p className="mt-1 text-3xl font-bold text-teal-600">{adherence}%</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold">Shared reports</h2>
            <ul className="mt-3 divide-y divide-slate-200">
              {selectedReports.map((report) => (
                <li key={report.id} className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium">{report.title || 'Untitled report'}</p>
                    <p className="mt-1 text-sm text-slate-500">{new Date(report.created_at).toLocaleDateString()}</p>
                    {report.ai_analysis?.[0]?.summary && <p className="mt-2 text-sm text-slate-700">{report.ai_analysis[0].summary}</p>}
                  </div>
                  {report.file_path && <button type="button" onClick={() => openReport(report)} className="btn-secondary shrink-0 text-sm">{t('download')}</button>}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
