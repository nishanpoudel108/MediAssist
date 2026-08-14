// import { useEffect, useState } from 'react';
// import { supabase } from '../../lib/supabase';
// import { useAuth } from '../../context/AuthContext';
// import { useLocale } from '../../context/LocaleContext';

// export default function Reminders() {
//   const { profile, user } = useAuth();
//   const { t } = useLocale();
//   const patientId = profile?.id || user?.id;
//   const [reminders, setReminders] = useState([]);
//   const [form, setForm] = useState({ title: '', frequency: 'daily', time: '08:00' });
//   const [error, setError] = useState('');
  

//   useEffect(() => {
//     if (!patientId) return;
//     loadReminders();
//   }, [patientId]);

//   async function loadReminders() {
//     const { data } = await supabase
//       .from('reminders')
//       .select('*')
//       .eq('patient_id', patientId)
//       .order('created_at', { ascending: false });
//     setReminders(data || []);
//   }

//   async function addReminder(e) {
//     e.preventDefault();
//     if (!form.title) return;
//     setError('');
//     const { error } = await supabase.from('reminders').insert([
//       { patient_id: patientId, medicine_name: form.title, frequency: form.frequency, time: form.time },
//     ]);
//     if (error) {
//       setError(error.message);
//     } else {
//       setForm({ title: '', frequency: 'daily', time: '08:00' });
//       loadReminders();
//     }
//   }

//   async function logDose(reminder) {
//     setError('');
//     const { error: doseError } = await supabase.from('dose_logs').insert([
//       { reminder_id: reminder.id, patient_id: patientId, status: 'taken', logged_at: new Date().toISOString() },
//     ]);
//     if (doseError) setError(doseError.message);
//   }

//   async function deleteReminder(id) {
//     setError('');
//     const { error: deleteError } = await supabase.from('reminders').delete().eq('id', id);
//     if (deleteError) setError(deleteError.message);
//     else loadReminders();
//   }

//   return (
//     <div className="space-y-6">
//       <h1 className="text-2xl font-bold">{t('reminders')}</h1>
//       {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

//       <div className="card">
//         <h2 className="text-lg font-semibold mb-3">New reminder</h2>
//         <form onSubmit={addReminder} className="grid grid-cols-1 md:grid-cols-4 gap-3">
//           <input
//             className="input"
//             placeholder="Medicine name"
//             value={form.title}
//             onChange={(e) => setForm({ ...form, title: e.target.value })}
//             required
//           />
//           <select
//             className="input"
//             value={form.frequency}
//             onChange={(e) => setForm({ ...form, frequency: e.target.value })}
//           >
//             <option value="daily">Daily</option>
//             <option value="weekly">Weekly</option>
//           </select>
//           <input
//             type="time"
//             className="input"
//             value={form.time}
//             onChange={(e) => setForm({ ...form, time: e.target.value })}
//           />
//           <button type="submit" className="btn-primary">Add</button>
//         </form>
//       </div>

//       <div className="card">
//         <h2 className="text-lg font-semibold mb-3">{t('reminders')}</h2>
//         {reminders.length === 0 ? (
//           <p className="text-slate-500 text-sm">{t('noData')}.</p>
//         ) : (
//           <ul className="divide-y divide-slate-200">
//             {reminders.map((r) => (
//               <li key={r.id} className="py-3 flex items-center justify-between">
//                 <div>
//                   <p className="font-medium">{r.medicine_name}</p>
//                   <p className="text-sm text-slate-500 capitalize">{r.frequency} · {r.time}</p>
//                 </div>
//                 <button onClick={() => logDose(r)} className="btn-secondary text-sm">
//                   Log dose
//                 </button>
//                 <button onClick={() => deleteReminder(r.id)} className="btn-danger text-sm">
//                   Delete
//                 </button>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </div>
//   );
// }
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

export default function Reminders() {
  const { profile, user } = useAuth();
  const { t } = useLocale();

  // Get the authenticated patient's ID
  const patientId = profile?.id || user?.id;

  const [reminders, setReminders] = useState([]);
  const [form, setForm] = useState({
    title: '',
    frequency: 'daily',
    time: '08:00',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Keeps track of doses logged during the current page session
  const [loggedDoses, setLoggedDoses] = useState({});

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loggingDose, setLoggingDose] = useState({});

  // -----------------------------------------
  // LOAD REMINDERS
  // -----------------------------------------

  useEffect(() => {
    if (!patientId) return;

    loadReminders();
  }, [patientId]);

  async function loadReminders() {
  if (!patientId) return;

  setLoading(true);
  setError('');

  try {
    // Load reminders
    const { data: reminderData, error: reminderError } =
      await supabase
        .from('reminders')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', {
          ascending: false,
        });

    if (reminderError) {
      throw reminderError;
    }

    setReminders(reminderData || []);

    // -----------------------------------------
    // Load today's logged doses
    // -----------------------------------------

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const { data: doseData, error: doseError } =
      await supabase
        .from('dose_logs')
        .select('reminder_id, status, logged_at')
        .eq('patient_id', patientId)
        .eq('status', 'taken')
        .gte(
          'logged_at',
          startOfDay.toISOString()
        )
        .lte(
          'logged_at',
          endOfDay.toISOString()
        );

    if (doseError) {
      console.error(
        'Load dose logs error:',
        doseError
      );

      // Don't break the reminders page if
      // dose history cannot be loaded.
      return;
    }

    // Convert dose logs into:
    //
    // {
    //   reminderUUID1: true,
    //   reminderUUID2: true
    // }

    const logged = {};

    (doseData || []).forEach((dose) => {
      logged[dose.reminder_id] = true;
    });

    setLoggedDoses(logged);

  } catch (err) {
    console.error(
      'Load reminders error:',
      err
    );

    setError(
      err?.message ||
        'Failed to load reminders.'
    );
  } finally {
    setLoading(false);
  }
}
  // -----------------------------------------
  // ADD REMINDER
  // -----------------------------------------

  async function addReminder(e) {
    e.preventDefault();

    if (!patientId) {
      setError('Unable to identify the patient.');
      return;
    }

    if (!form.title.trim()) {
      setError('Please enter a medicine name.');
      return;
    }

    setError('');
    setSuccess('');

    const { error: insertError } = await supabase
      .from('reminders')
      .insert([
        {
          patient_id: patientId,
          medicine_name: form.title.trim(),
          frequency: form.frequency,
          time: form.time,
        },
      ]);

    if (insertError) {
      console.error(
        'Add reminder error:',
        insertError
      );

      setError(insertError.message);
      return;
    }

    setForm({
      title: '',
      frequency: 'daily',
      time: '08:00',
    });

    setSuccess('Reminder added successfully.');

    await loadReminders();

    // Remove success message after a short time
    setTimeout(() => {
      setSuccess('');
    }, 3000);
  }

  // -----------------------------------------
  // LOG DOSE
  // -----------------------------------------

  async function handleLogDose(reminder) {
  if (!patientId) {
    setError('Unable to identify the patient.');
    return;
  }

  if (!reminder?.id) {
    setError('Unable to identify the reminder.');
    return;
  }

  if (loggedDoses[reminder.id]) {
    return;
  }

  setError('');
  setSuccess('');

  setLoggingDose((prev) => ({
    ...prev,
    [reminder.id]: true,
  }));

  try {
    const { error: doseError } =
      await supabase
        .from('dose_logs')
        .insert([
          {
            reminder_id: reminder.id,
            patient_id: patientId,
            status: 'taken',
            logged_at: new Date().toISOString(),
          },
        ]);

    if (doseError) {
      console.error(
        'Log dose error:',
        doseError
      );

      setError(doseError.message);
      return;
    }

    setLoggedDoses((prev) => ({
      ...prev,
      [reminder.id]: true,
    }));

    setSuccess(
      `${reminder.medicine_name} dose logged successfully.`
    );

  } catch (err) {
    console.error(
      'Unexpected log dose error:',
      err
    );

    setError(
      err?.message ||
        'Failed to log the dose.'
    );

  } finally {
    setLoggingDose((prev) => ({
      ...prev,
      [reminder.id]: false,
    }));
  }
}

  // -----------------------------------------
  // DELETE REMINDER
  // -----------------------------------------

  async function deleteReminder(id) {
    if (!id) return;

    setError('');
    setSuccess('');

    const { error: deleteError } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('patient_id', patientId);

    if (deleteError) {
      console.error(
        'Delete reminder error:',
        deleteError
      );

      setError(deleteError.message);
      return;
    }

    // Remove logged state for deleted reminder
    setLoggedDoses((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    setSuccess('Reminder deleted successfully.');

    await loadReminders();

    setTimeout(() => {
      setSuccess('');
    }, 3000);
  }

  // -----------------------------------------
  // UI
  // -----------------------------------------

  return (
    <div className="space-y-6">

      {/* Page title */}
      <h1 className="text-2xl font-bold">
        {t('reminders')}
      </h1>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* -----------------------------------------
          NEW REMINDER
      ------------------------------------------ */}

      <div className="card">

        <h2 className="mb-3 text-lg font-semibold">
          New reminder
        </h2>

        <form
          onSubmit={addReminder}
          className="grid grid-cols-1 gap-3 md:grid-cols-4"
        >

          {/* Medicine name */}
          <input
            className="input"
            placeholder="Medicine name"
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
              })
            }
            required
          />

          {/* Frequency */}
          <select
            className="input"
            value={form.frequency}
            onChange={(e) =>
              setForm({
                ...form,
                frequency: e.target.value,
              })
            }
          >
            <option value="daily">
              Daily
            </option>

            <option value="weekly">
              Weekly
            </option>
          </select>

          {/* Time */}
          <input
            type="time"
            className="input"
            value={form.time}
            onChange={(e) =>
              setForm({
                ...form,
                time: e.target.value,
              })
            }
          />

          {/* Add */}
          <button
            type="submit"
            className="btn-primary"
          >
            Add
          </button>

        </form>
      </div>

      {/* -----------------------------------------
          REMINDERS LIST
      ------------------------------------------ */}

      <div className="card">

        <h2 className="mb-3 text-lg font-semibold">
          {t('reminders')}
        </h2>

        {/* Loading */}
        {loading ? (
          <p className="text-sm text-slate-500">
            Loading reminders...
          </p>
        ) : reminders.length === 0 ? (

          /* Empty state */
          <p className="text-sm text-slate-500">
            {t('noData')}.
          </p>

        ) : (

          /* Reminder list */
          <ul className="divide-y divide-slate-200">

            {reminders.map((r) => (

              <li
                key={r.id}
                className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >

                {/* Medicine information */}
                <div>
                  <p className="font-medium">
                    {r.medicine_name}
                  </p>

                  <p className="text-sm capitalize text-slate-500">
                    {r.frequency} · {r.time}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3">

                  {/* LOG DOSE */}
                  <button
  type="button"
  onClick={() => handleLogDose(r)}
  disabled={
    loggedDoses[r.id] ||
    loggingDose[r.id]
  }
  className="rounded-xl border-2 border-[#668b70] px-5 py-3 font-medium text-slate-700 transition hover:bg-[#668b70]/10 disabled:cursor-not-allowed disabled:opacity-60"
>
  {loggingDose[r.id]
    ? 'Logging...'
    : loggedDoses[r.id]
    ? 'Dose logged ✓'
    : 'Log dose'}
</button>

                  {/* DELETE */}
                  <button
                    type="button"
                    onClick={() =>
                      deleteReminder(r.id)
                    }
                    className="btn-danger text-sm"
                  >
                    Delete
                  </button>

                </div>

              </li>

            ))}

          </ul>

        )}

      </div>
    </div>
  );
}