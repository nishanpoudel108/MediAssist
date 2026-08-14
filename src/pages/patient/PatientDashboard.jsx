// import { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';
// import { supabase } from '../../lib/supabase';
// import { useAuth } from '../../context/AuthContext';
// import { useLocale } from '../../context/LocaleContext';

// export default function PatientDashboard() {
//   const { profile } = useAuth();
//   const { t } = useLocale();
//   const [stats, setStats] = useState({ reports: 0, medicines: 0, reminders: 0 });
//   const [recentReports, setRecentReports] = useState([]);

//   useEffect(() => {
//     if (!profile?.id) return;
//     const patientId = profile.id;

//     Promise.all([
//       supabase.from('medical_reports').select('id', { count: 'exact' }).eq('patient_id', patientId),
//       supabase.from('medicines').select('id', { count: 'exact' }).eq('patient_id', patientId),
//       supabase.from('reminders').select('id', { count: 'exact' }).eq('patient_id', patientId),
//       supabase
//         .from('medical_reports')
//         .select('id, title, created_at')
//         .eq('patient_id', patientId)
//         .order('created_at', { ascending: false })
//         .limit(5),
//     ]).then(([reports, medicines, reminders, recent]) => {
//       setStats({
//         reports: reports.count || 0,
//         medicines: medicines.count || 0,
//         reminders: reminders.count || 0,
//       });
//       setRecentReports(recent.data || []);
//     });
//   }, [profile?.id]);

//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold">{t('welcome')}, {profile?.full_name || ''}</h1>
//         <p className="text-slate-500">{t('tagline')}</p>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//         <StatCard label={t('reports')} value={stats.reports} to="/patient/reports" />
//         <StatCard label={t('medicines')} value={stats.medicines} to="/patient/medicines" />
//         <StatCard label={t('reminders')} value={stats.reminders} to="/patient/reminders" />
//       </div>

//       <div className="card">
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="text-lg font-semibold">{t('reports')}</h2>
//           <Link to="/patient/reports" className="btn-secondary text-sm">
//             {t('uploadReport')}
//           </Link>
//         </div>
//         {recentReports.length === 0 ? (
//           <p className="text-slate-500 text-sm">{t('noData')}.</p>
//         ) : (
//           <ul className="divide-y divide-slate-200">
//             {recentReports.map((r) => (
//               <li key={r.id} className="py-3 flex justify-between items-center">
//                 <span className="font-medium">{r.title || 'Untitled'}</span>
//                 <span className="text-sm text-slate-500">
//                   {new Date(r.created_at).toLocaleDateString()}
//                 </span>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </div>
//   );
// }

// function StatCard({ label, value, to }) {
//   return (
//     <Link to={to} className="card block hover:shadow-md transition-shadow">
//       <p className="text-sm text-slate-500">{label}</p>
//       <p className="text-3xl font-bold text-primary-600">{value}</p>
//     </Link>
//   );
// }
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import NepaliDate from 'nepali-date-converter';

const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

export default function PatientDashboard() {
  const { profile } = useAuth();
  const { t } = useLocale();

  const [stats, setStats] = useState({
    reports: 0,
    medicines: 0,
    reminders: 0,
  });

  const [recentReports, setRecentReports] = useState([]);

  // Patient details
  const [dobAD, setDobAD] = useState('');
  const [dobBS, setDobBS] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  const [detailsLoading, setDetailsLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState('');
  const [detailsError, setDetailsError] = useState('');

  useEffect(() => {
    if (!profile?.id) return;

    const patientId = profile.id;

    async function loadDashboard() {
      try {
        const [
          reports,
          medicines,
          reminders,
          recent,
          patientDetails,
        ] = await Promise.all([
          supabase
            .from('medical_reports')
            .select('id', { count: 'exact', head: true })
            .eq('patient_id', patientId),

          supabase
            .from('medicines')
            .select('id', { count: 'exact', head: true })
            .eq('patient_id', patientId),

          supabase
            .from('reminders')
            .select('id', { count: 'exact', head: true })
            .eq('patient_id', patientId),

          supabase
            .from('medical_reports')
            .select('id, title, created_at')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(5),

          supabase
            .from('patients')
            .select('date_of_birth, blood_group')
            .eq('id', patientId)
            .maybeSingle(),
        ]);

        // Check dashboard errors
        if (reports.error) console.error('Reports error:', reports.error);
        if (medicines.error) console.error('Medicines error:', medicines.error);
        if (reminders.error) console.error('Reminders error:', reminders.error);
        if (recent.error) console.error('Recent reports error:', recent.error);

        setStats({
          reports: reports.count || 0,
          medicines: medicines.count || 0,
          reminders: reminders.count || 0,
        });

        setRecentReports(recent.data || []);

        // Load patient details
        if (patientDetails.error) {
          console.error('Patient details error:', patientDetails.error);
        } else if (patientDetails.data) {
          const savedDOB = patientDetails.data.date_of_birth || '';

          setDobAD(savedDOB);
          setBloodGroup(patientDetails.data.blood_group || '');

          // Convert AD -> BS for display
          if (savedDOB) {
            setDobBS(convertADToBS(savedDOB));
          }
        }
      } catch (error) {
        console.error('Dashboard loading error:', error);
      } finally {
        setDetailsLoading(false);
      }
    }

    loadDashboard();
  }, [profile?.id]);

  // When AD DOB changes, update BS display
  const handleADChange = (value) => {
    setDobAD(value);

    if (value) {
      setDobBS(convertADToBS(value));
    } else {
      setDobBS('');
    }

    setDetailsMessage('');
    setDetailsError('');
  };

  // const handleSaveDetails = async () => {
  //   if (!profile?.id) return;

  //   setSavingDetails(true);
  //   setDetailsMessage('');
  //   setDetailsError('');

  //   try {
  //     const { error } = await supabase
  //       .from('patients')
  //       .upsert(
  //         {
  //           id: profile.id,
  //           date_of_birth: dobAD || null,
  //           blood_group: bloodGroup || null,
  //         },
  //         {
  //           onConflict: 'id',
  //         }
  //       );

  //     if (error) {
  //       throw error;
  //     }

  //     setDetailsMessage('Personal details saved successfully.');
  //   } catch (error) {
  //     console.error('Save patient details error:', error);

  //     setDetailsError(
  //       error?.message || 'Failed to save personal details.'
  //     );
  //   } finally {
  //     setSavingDetails(false);
  //   }
  // };

  const handleSaveDetails = async () => {
  if (!profile?.id) return;

  setSavingDetails(true);
  setDetailsMessage('');
  setDetailsError('');

  try {
    const { error } = await supabase
      .from('patients')
      .upsert(
        {
          id: profile.id,
          full_name: profile.full_name || null,
          email: profile.email || null,
          date_of_birth: dobAD || null,
          blood_group: bloodGroup || null,
        },
        {
          onConflict: 'id',
        }
      );

    if (error) throw error;

    setDetailsMessage('Personal details saved successfully.');
  } catch (error) {
    console.error('Save patient details error:', error);
    setDetailsError(error.message || 'Failed to save personal details.');
  } finally {
    setSavingDetails(false);
  }
};
  return (
    <div className="space-y-6">

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          {t('welcome')}, {profile?.full_name || ''}
        </h1>

        <p className="text-slate-500">
          {t('tagline')}
        </p>
      </div>

      {/* Personal Details */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">
              Personal Details
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Add your date of birth and blood group.
            </p>
          </div>

          <span className="text-2xl">👤</span>
        </div>

        {detailsLoading ? (
          <div className="py-6 text-sm text-slate-500">
            Loading personal details...
          </div>
        ) : (
          <div className="space-y-5">

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date of Birth
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* AD */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    AD / Gregorian
                  </label>

                  <input
                    type="date"
                    value={dobAD}
                    onChange={(e) => handleADChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* BS */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    BS / Bikram Sambat
                  </label>

                  <input
                    type="text"
                    value={dobBS}
                    readOnly
                    placeholder="BS date will appear here"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-600"
                  />
                </div>

              </div>

              <p className="text-xs text-slate-400 mt-2">
                The AD date is stored in the database. The BS date is
                displayed as its converted equivalent.
              </p>
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Blood Group
              </label>

              <select
                value={bloodGroup}
                onChange={(e) => {
                  setBloodGroup(e.target.value);
                  setDetailsMessage('');
                  setDetailsError('');
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">
                  Select Blood Group
                </option>

                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {/* Messages */}
            {detailsMessage && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                {detailsMessage}
              </div>
            )}

            {detailsError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {detailsError}
              </div>
            )}

            {/* Save */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={savingDetails}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingDetails ? 'Saving...' : 'Save Details'}
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <StatCard
          label={t('reports')}
          value={stats.reports}
          to="/patient/reports"
        />

        <StatCard
          label={t('medicines')}
          value={stats.medicines}
          to="/patient/medicines"
        />

        <StatCard
          label={t('reminders')}
          value={stats.reminders}
          to="/patient/reminders"
        />

      </div>

      {/* Recent Reports */}
      <div className="card">

        <div className="flex items-center justify-between mb-4">

          <h2 className="text-lg font-semibold">
            {t('reports')}
          </h2>

          <Link
            to="/patient/reports"
            className="btn-secondary text-sm"
          >
            {t('uploadReport')}
          </Link>

        </div>

        {recentReports.length === 0 ? (
          <p className="text-slate-500 text-sm">
            {t('noData')}.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">

            {recentReports.map((r) => (
              <li
                key={r.id}
                className="py-3 flex justify-between items-center"
              >

                <span className="font-medium">
                  {r.title || 'Untitled'}
                </span>

                <span className="text-sm text-slate-500">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>

              </li>
            ))}

          </ul>
        )}

      </div>

    </div>
  );
}


/* ---------------------------------------
   Stat Card
--------------------------------------- */

function StatCard({ label, value, to }) {
  return (
    <Link
      to={to}
      className="card block hover:shadow-md transition-shadow"
    >
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="text-3xl font-bold text-primary-600">
        {value}
      </p>
    </Link>
  );
}


/* ---------------------------------------
   AD -> BS conversion

   IMPORTANT:
   Replace this with a proper Nepali
   calendar conversion library/function.
--------------------------------------- */
function convertADToBS(adDate) {
  if (!adDate) return '';

  try {
    const nepaliDate = new NepaliDate(new Date(`${adDate}T00:00:00`));

    return nepaliDate.format('YYYY-MM-DD');
  } catch (error) {
    console.error('AD to BS conversion error:', error);
    return '';
  }
}