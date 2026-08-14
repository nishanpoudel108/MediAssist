import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

export default function Reminders() {
  const { profile, user } = useAuth();
  const { t } = useLocale();
  const patientId = profile?.id || user?.id;
  const [reminders, setReminders] = useState([]);
  const [form, setForm] = useState({ title: '', frequency: 'daily', time: '08:00' });
  const [error, setError] = useState('');
  const [loggedDoses, setLoggedDoses] = useState({});

  useEffect(() => {
    if (!patientId) return;
    loadReminders();
  }, [patientId]);

  async function loadReminders() {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    setReminders(data || []);
  }

  async function addReminder(e) {
    e.preventDefault();
    if (!form.title) return;
    setError('');
    const { error } = await supabase.from('reminders').insert([
      { patient_id: patientId, medicine_name: form.title, frequency: form.frequency, time: form.time },
    ]);
    if (error) {
      setError(error.message);
    } else {
      setForm({ title: '', frequency: 'daily', time: '08:00' });
      loadReminders();
    }
  }
  
   const handleLogDose = async (reminder) => {
  if (!profile?.id || !reminder?.id) return;

  const { error } = await supabase
    .from('dose_logs')
    .insert({
      reminder_id: reminder.id,
      patient_id: profile.id,
      status: 'taken',
    });

  if (error) {
    console.error('Log dose error:', error);
    alert(error.message);
    return;
  }

  setLoggedDoses((prev) => ({
    ...prev,
    [reminder.id]: true,
  }));
};

  async function logDose(reminder) {
    setError('');
    const { error: doseError } = await supabase.from('dose_logs').insert([
      { reminder_id: reminder.id, patient_id: patientId, status: 'taken', logged_at: new Date().toISOString() },
    ]);
    if (doseError) setError(doseError.message);
  }

  async function deleteReminder(id) {
    setError('');
    const { error: deleteError } = await supabase.from('reminders').delete().eq('id', id);
    if (deleteError) setError(deleteError.message);
    else loadReminders();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('reminders')}</h1>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">New reminder</h2>
        <form onSubmit={addReminder} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="input"
            placeholder="Medicine name"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <select
            className="input"
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <input
            type="time"
            className="input"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">{t('reminders')}</h2>
        {reminders.length === 0 ? (
          <p className="text-slate-500 text-sm">{t('noData')}.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {reminders.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.medicine_name}</p>
                  <p className="text-sm text-slate-500 capitalize">{r.frequency} · {r.time}</p>
                </div>
                <button
  type="button"
  onClick={() => handleLogDose(reminder)}
  disabled={loggedDoses[reminder.id]}
  className="rounded-xl border-2 px-5 py-3 font-medium disabled:opacity-60"
>
  {loggedDoses[reminder.id]
    ? 'Dose logged ✓'
    : 'Log dose'}
</button>
                <button onClick={() => deleteReminder(r.id)} className="btn-danger text-sm">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
