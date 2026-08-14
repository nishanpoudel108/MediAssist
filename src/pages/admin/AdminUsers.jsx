import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocale } from '../../context/LocaleContext';

export default function AdminUsers() {
  const { t } = useLocale();
  const [users, setUsers] = useState([]);
  const [doctorVerification, setDoctorVerification] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUsers() {
      const [{ data: userData }, { data: doctorData }] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('doctors').select('id, is_verified'),
      ]);
      setUsers(userData || []);
      setDoctorVerification(Object.fromEntries((doctorData || []).map((doctor) => [doctor.id, doctor.is_verified])));
    }
    loadUsers();
  }, []);

  async function verifyDoctor(user) {
    setError('');
    const { error: verifyError } = await supabase
      .from('doctors')
      .update({ is_verified: true })
      .eq('id', user.id);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setDoctorVerification((current) => ({ ...current, [user.id]: true }));
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.full_name || user.email}? This cannot be undone.`)) return;
    setError('');
    const { data, error: deleteError } = await supabase.functions.invoke('delete-user', {
      body: { user_id: user.id },
    });
    if (deleteError || data?.error) {
      setError(deleteError?.message || data.error);
      return;
    }
    setUsers((current) => current.filter((item) => item.id !== user.id));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('users')}</h1>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="card">
        {users.length === 0 ? (
          <p className="text-slate-500 text-sm">{t('noData')}.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-2">{u.full_name}</td>
                  <td>{u.email}</td>
                  <td className="capitalize">{u.role}</td>
                  <td className="py-2 text-right">
                    {u.role === 'doctor' && doctorVerification[u.id] === false && (
                      <button onClick={() => verifyDoctor(u)} className="btn-secondary mr-2 text-sm">
                        Approve
                      </button>
                    )}
                    <button onClick={() => deleteUser(u)} className="btn-danger text-sm">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
