import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

export default function FamilyDashboard() {
  const { profile } = useAuth();
  const { t } = useLocale();
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadSharedPatients() {
      setError('');
      const { data, error: patientsError } = await supabase.rpc('get_shared_family_patients');
      if (patientsError) {
        setError(patientsError.message);
        return;
      }
      setPatients(data || []);
    }

    loadSharedPatients();
  }, []);

  async function redeemCode(e) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setRedeeming(true);
    setError('');
    setMessage('');
    const { error: redeemError } = await supabase.rpc('redeem_family_invite', { invite_code: inviteCode });
    if (redeemError) setError(redeemError.message);
    else {
      setInviteCode('');
      setMessage('Family access confirmed. Shared records are now available.');
      const { data } = await supabase.rpc('get_shared_family_patients');
      setPatients(data || []);
    }
    setRedeeming(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('welcome')}, {profile?.full_name || ''}</h1>
        <p className="text-slate-500">View health information shared with you.</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Join a family share</h2>
        <p className="mt-1 text-sm text-slate-500">Enter the one-time code given to you by the patient.</p>
        <form onSubmit={redeemCode} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input className="input font-mono uppercase" placeholder="Family code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} />
          <button type="submit" disabled={redeeming} className="btn-primary shrink-0">{redeeming ? 'Confirming...' : 'Confirm access'}</button>
        </form>
        {message && <p className="mt-3 text-sm text-primary-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Shared care</h2>
            <p className="mt-1 text-sm text-slate-500">Patients who have granted you access.</p>
          </div>
          <Link to="/family/care" className="btn-primary text-sm">View shared records</Link>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">Unable to load shared care: {error}</p>}
        {!error && patients.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">No health records have been shared with you yet.</p>
        )}
        {patients.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-200">
            {patients.map((patient) => (
              <li key={patient.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{patient.full_name || patient.email}</p>
                  {patient.full_name && <p className="text-sm text-slate-500">{patient.email}</p>}
                </div>
                <Link to="/family/care" className="text-sm font-medium text-primary-600 hover:underline">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
