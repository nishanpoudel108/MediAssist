import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

const FAMILY_CODE_STORAGE_KEY = 'mediassist-family-invite-code';

export default function Sharing() {
  const { profile, user } = useAuth();
  const { t } = useLocale();
  const patientId = profile?.id || user?.id;
  const [permissions, setPermissions] = useState([]);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ email: '', granteeType: 'doctor', scope: 'full' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [familyCode, setFamilyCode] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(FAMILY_CODE_STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patientId) return;
    loadPermissions();
    loadReports();
  }, [patientId]);

  useEffect(() => {
    if (!familyCode?.expires_at) return undefined;
    const remaining = new Date(familyCode.expires_at).getTime() - Date.now();
    const removeExpiredCode = () => {
      sessionStorage.removeItem(FAMILY_CODE_STORAGE_KEY);
      setFamilyCode(null);
    };

    if (remaining <= 0) {
      removeExpiredCode();
      return undefined;
    }

    const expiryTimer = window.setTimeout(removeExpiredCode, remaining);
    return () => window.clearTimeout(expiryTimer);
  }, [familyCode]);

  async function loadPermissions() {
    const { data } = await supabase
      .from('permissions')
      .select('*')
      .eq('patient_id', patientId);
    setPermissions(data || []);
  }

  async function loadReports() {
    const { data } = await supabase
      .from('medical_reports')
      .select('id, title, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    setReports(data || []);
  }

  async function grantAccess(e) {
    e.preventDefault();
    setError('');
    if (!form.email) return;
    if (form.granteeType === 'family') {
      if (!confirmPassword) {
        setError('Confirm your password before creating a family invitation.');
        return;
      }
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user?.email || profile?.email,
        password: confirmPassword,
      });
      if (reauthError) {
        setError('Password confirmation failed. No invitation was created.');
        return;
      }
      const { data, error } = await supabase.rpc('create_family_invite', {
        recipient: form.email,
        access_scope: form.scope,
      });
      if (error) setError(error.message);
      else {
        const createdCode = data?.[0] || null;
        if (!createdCode?.code) {
          setError('The invitation was created, but its code could not be read. Create a new invitation.');
          return;
        }
        // Keep the one-time code for this browser session until it expires.
        sessionStorage.setItem(FAMILY_CODE_STORAGE_KEY, JSON.stringify(createdCode));
        setFamilyCode(createdCode);
        setForm({ email: '', granteeType: 'family', scope: 'full' });
        setConfirmPassword('');
      }
      return;
    }

    const { error } = await supabase.from('permissions').insert([
      { patient_id: patientId, grantee_email: form.email, grantee_type: form.granteeType, scope: form.scope },
    ]);
    if (error) {
      setError(error.message);
    } else {
      setForm({ email: '', granteeType: 'doctor', scope: 'full' });
      loadPermissions();
    }
  }

  async function revokeAccess(id) {
    setError('');
    const { error: deleteError } = await supabase.from('permissions').delete().eq('id', id);
    if (deleteError) setError(deleteError.message);
    else loadPermissions();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('sharing')}</h1>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">{t('grant')}</h2>
        <form onSubmit={grantAccess} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="input md:col-span-2"
            placeholder="Grantee email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <select
            className="input"
            value={form.granteeType}
            onChange={(e) => setForm({ ...form, granteeType: e.target.value })}
          >
            <option value="doctor">{t('doctor')}</option>
            <option value="family">{t('family')}</option>
          </select>
          {form.granteeType === 'family' && (
            <input
              type="password"
              className="input md:col-span-2"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}
          <select
            className="input"
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value })}
            aria-label="Reports to share"
          >
            <option value="full">All reports</option>
            {reports.map((report) => (
              <option key={report.id} value={report.id}>
                {report.title || 'Untitled report'}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">{form.granteeType === 'family' ? 'Create family code' : t('grant')}</button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {familyCode?.code && (
          <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 p-4">
            <p className="text-sm font-medium text-slate-800">Share this one-time family code with the intended family member.</p>
            <p className="mt-2 font-mono text-xl font-bold tracking-widest text-primary-800">{familyCode.code}</p>
            <p className="mt-2 text-xs text-slate-600">It expires {new Date(familyCode.expires_at).toLocaleString()} and works only for the email entered above. It is not sent by email.</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Active shares</h2>
        {permissions.length === 0 ? (
          <p className="text-slate-500 text-sm">{t('noData')}.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {permissions.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.grantee_email}</p>
                  <p className="text-sm text-slate-500 capitalize">
                    {p.grantee_type} · {p.scope}
                  </p>
                </div>
                <button onClick={() => revokeAccess(p.id)} className="btn-danger text-sm">
                  {t('revoke')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
