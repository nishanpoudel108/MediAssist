import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { checkMedicineInteractions } from '../../lib/ai';

export default function Medicines() {
  const { profile, user } = useAuth();
  const { t, locale } = useLocale();
  const patientId = profile?.id || user?.id;
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState({ name: '', dosage: '', schedule: '' });
  const [interaction, setInteraction] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patientId) return;
    loadMedicines();
  }, [patientId]);

  async function loadMedicines() {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('patient_id', patientId);
    if (!error) setMedicines(data || []);
  }

  async function addMedicine(e) {
    e.preventDefault();
    if (!form.name) return;
    setError('');
    const { error } = await supabase.from('medicines').insert([
      { patient_id: patientId, name: form.name, dosage: form.dosage, schedule: form.schedule },
    ]);
    if (error) {
      setError(error.message);
    } else {
      setForm({ name: '', dosage: '', schedule: '' });
      loadMedicines();
    }
  }

  async function deleteMedicine(id) {
    setError('');
    const { error: deleteError } = await supabase.from('medicines').delete().eq('id', id);
    if (deleteError) setError(deleteError.message);
    else loadMedicines();
  }

  async function runInteractionCheck() {
    if (medicines.length < 2) return;
    setChecking(true);
    try {
      const result = await checkMedicineInteractions(
        medicines.map((m) => m.name),
        locale
      );
      setInteraction(result);
    } catch (err) {
      // Do not present a network/deployment problem as a medical result.
      // The medicine list remains saved and usable when AI is unavailable.
      setInteraction({
        unavailable: true,
        explanation:
          'Interaction checking is temporarily unavailable. Please ask a pharmacist or licensed healthcare professional before combining or changing medicines.',
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('medicines')}</h1>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Add medicine</h2>
        <form onSubmit={addMedicine} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Dosage"
            value={form.dosage}
            onChange={(e) => setForm({ ...form, dosage: e.target.value })}
          />
          <input
            className="input"
            placeholder="Schedule (e.g. daily after breakfast)"
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
          />
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Active medicines</h2>
          <button onClick={runInteractionCheck} disabled={checking || medicines.length < 2} className="btn-secondary text-sm">
            {checking ? t('loading') : 'Check interactions'}
          </button>
        </div>
        {medicines.length === 0 ? (
          <p className="text-slate-500 text-sm">{t('noData')}.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {medicines.map((m) => (
              <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-slate-500">{m.dosage} · {m.schedule}</p>
                </div>
                <button onClick={() => deleteMedicine(m.id)} className="btn-danger text-sm">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {interaction && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Interaction results</h2>
          <p className={interaction.unavailable ? 'text-amber-800 whitespace-pre-wrap' : 'text-slate-700 whitespace-pre-wrap'}>
            {interaction.explanation}
          </p>
          <p className="mt-3 text-sm italic text-slate-500">{t('disclaimer')}</p>
        </div>
      )}
    </div>
  );
}
