// import { useEffect, useState } from 'react';
// import { supabase } from '../../lib/supabase';

// export default function PatientProfilePopup({
//   profile,
//   open,
//   onClose,
// }) {
//   const [patient, setPatient] = useState(null);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (!open || !profile?.id) return;

//     const loadPatientDetails = async () => {
//       setLoading(true);

//       const { data, error } = await supabase
//         .from('patients')
//         .select(
//           'full_name, email, date_of_birth, blood_group'
//         )
//         .eq('id', profile.id)
//         .maybeSingle();

//       if (error) {
//         console.error('Failed to load patient profile:', error);
//       } else {
//         setPatient(data);
//       }

//       setLoading(false);
//     };

//     loadPatientDetails();
//   }, [open, profile?.id]);

//   // Don't render when closed
//   if (!open) return null;

//   const name =
//     patient?.full_name ||
//     profile?.full_name ||
//     'Patient';

//   const email =
//     patient?.email ||
//     profile?.email ||
//     'Not available';

//   const dob =
//     patient?.date_of_birth
//       ? formatDate(patient.date_of_birth)
//       : 'Not added';

//   const bloodGroup =
//     patient?.blood_group ||
//     'Not added';

//   return (
//     <>
//       {/* Background overlay */}
//       <div
//         className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
//         onClick={onClose}
//       />

//       {/* Popup */}
//       <div className="fixed bottom-24 left-6 z-50 w-[340px] max-w-[calc(100vw-2rem)]">
//         <div
//           className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
//           onClick={(e) => e.stopPropagation()}
//         >

//           {/* Header */}
//           <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
//             <div>
//               <h3 className="font-semibold text-slate-800">
//                 Patient Profile
//               </h3>

//               <p className="text-xs text-slate-500 mt-0.5">
//                 Personal information
//               </p>
//             </div>

//             <button
//               type="button"
//               onClick={onClose}
//               className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
//               aria-label="Close"
//             >
//               ×
//             </button>
//           </div>

//           {/* Profile Avatar */}
//           <div className="px-5 pt-5 pb-3 flex items-center gap-3">
//             <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-lg font-semibold">
//               {getInitials(name)}
//             </div>

//             <div className="min-w-0">
//               <h4 className="font-semibold text-slate-800 truncate">
//                 {name}
//               </h4>

//               <p className="text-sm text-slate-500 truncate">
//                 {email}
//               </p>
//             </div>
//           </div>

//           {/* Details */}
//           <div className="px-5 pb-5">

//             {loading ? (
//               <div className="py-5 text-center text-sm text-slate-500">
//                 Loading details...
//               </div>
//             ) : (
//               <div className="space-y-3">

//                 {/* Name */}
//                 <DetailRow
//                   icon="👤"
//                   label="Full Name"
//                   value={name}
//                 />

//                 {/* Email */}
//                 <DetailRow
//                   icon="✉️"
//                   label="Email"
//                   value={email}
//                 />

//                 {/* DOB */}
//                 <DetailRow
//                   icon="🎂"
//                   label="Date of Birth"
//                   value={dob}
//                 />

//                 {/* Blood Group */}
//                 <DetailRow
//                   icon="🩸"
//                   label="Blood Group"
//                   value={bloodGroup}
//                   highlight={bloodGroup !== 'Not added'}
//                 />

//               </div>
//             )}

//           </div>
//         </div>
//       </div>
//     </>
//   );
// }


// /* ---------------------------------------
//    Detail Row
// --------------------------------------- */

// function DetailRow({
//   icon,
//   label,
//   value,
//   highlight = false,
// }) {
//   return (
//     <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50">

//       <div className="flex items-center gap-3 min-w-0">

//         <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
//           {icon}
//         </span>

//         <div className="min-w-0">
//           <p className="text-xs text-slate-500">
//             {label}
//           </p>

//           <p className="text-sm font-medium text-slate-800 truncate">
//             {value}
//           </p>
//         </div>

//       </div>

//       {highlight && label === 'Blood Group' && (
//         <span className="text-sm font-bold text-red-600">
//           {value}
//         </span>
//       )}

//     </div>
//   );
// }


// /* ---------------------------------------
//    Helpers
// --------------------------------------- */

// function getInitials(name) {
//   if (!name) return 'P';

//   return name
//     .split(' ')
//     .filter(Boolean)
//     .slice(0, 2)
//     .map((word) => word[0].toUpperCase())
//     .join('');
// }

// function formatDate(dateString) {
//   const date = new Date(`${dateString}T00:00:00`);

//   if (Number.isNaN(date.getTime())) {
//     return dateString;
//   }

//   return date.toLocaleDateString('en-US', {
//     year: 'numeric',
//     month: 'long',
//     day: 'numeric',
//   });
// }
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

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

export default function PatientProfilePopup({
  profile,
  open,
  onClose,
}) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dobAD, setDobAD] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!open || !profile?.id) return;

    const loadPatientDetails = async () => {
      setLoading(true);
      setError('');
      setSuccess('');

      const { data, error } = await supabase
        .from('patients')
        .select(
          'full_name, email, date_of_birth, blood_group'
        )
        .eq('id', profile.id)
        .maybeSingle();

      if (error) {
        console.error(
          'Failed to load patient details:',
          error
        );

        setError('Unable to load profile details.');
      } else {
        setPatient(data);

        setDobAD(data?.date_of_birth || '');
        setBloodGroup(data?.blood_group || '');
      }

      setLoading(false);
    };

    loadPatientDetails();
  }, [open, profile?.id]);

  const handleEdit = () => {
    setError('');
    setSuccess('');

    setDobAD(patient?.date_of_birth || '');
    setBloodGroup(patient?.blood_group || '');

    setEditing(true);
  };

  const handleCancelEdit = () => {
    setDobAD(patient?.date_of_birth || '');
    setBloodGroup(patient?.blood_group || '');

    setError('');
    setSuccess('');
    setEditing(false);
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase
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
        )
        .select(
          'full_name, email, date_of_birth, blood_group'
        )
        .single();

      if (error) {
        throw error;
      }

      setPatient(data);

      setDobAD(data?.date_of_birth || '');
      setBloodGroup(data?.blood_group || '');

      setSuccess('Personal details updated successfully.');

      setEditing(false);
    } catch (err) {
      console.error(
        'Update patient details error:',
        err
      );

      setError(
        err?.message ||
          'Failed to update personal details.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const name =
    patient?.full_name ||
    profile?.full_name ||
    'Patient';

  const email =
    patient?.email ||
    profile?.email ||
    'Not available';

  const formattedDOB = patient?.date_of_birth
    ? new Date(
        `${patient.date_of_birth}T00:00:00`
      ).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not added';

  const currentBloodGroup =
    patient?.blood_group || 'Not added';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Patient Profile
            </h2>

            <p className="text-sm text-slate-500">
              {editing
                ? 'Edit personal information'
                : 'Personal information'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading profile...
            </div>
          ) : (
            <>
              {/* Profile header */}
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#6b8f76]/15 text-lg font-bold text-[#4f7059]">
                  {name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join('')
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-800">
                    {name}
                  </h3>

                  <p className="truncate text-sm text-slate-500">
                    {email}
                  </p>
                </div>
              </div>

              {/* VIEW MODE */}
              {!editing && (
                <>
                  <div className="space-y-3">

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Full Name
                      </p>

                      <p className="mt-1 font-medium text-slate-700">
                        {name}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Email
                      </p>

                      <p className="mt-1 break-all font-medium text-slate-700">
                        {email}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Date of Birth
                      </p>

                      <p className="mt-1 font-medium text-slate-700">
                        {formattedDOB}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Blood Group
                      </p>

                      <p className="mt-1 font-medium text-slate-700">
                        {currentBloodGroup}
                      </p>
                    </div>

                  </div>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="mt-6 w-full rounded-xl bg-[#668b70] px-4 py-3 font-medium text-white transition hover:bg-[#587960]"
                  >
                    Edit Details
                  </button>
                </>
              )}

              {/* EDIT MODE */}
              {editing && (
                <>
                  <div className="space-y-5">

                    {/* DOB */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Date of Birth
                      </label>

                      <input
                        type="date"
                        value={dobAD}
                        onChange={(event) =>
                          setDobAD(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-[#668b70] focus:ring-2 focus:ring-[#668b70]/20"
                      />
                    </div>

                    {/* Blood group */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Blood Group
                      </label>

                      <select
                        value={bloodGroup}
                        onChange={(event) =>
                          setBloodGroup(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-[#668b70] focus:ring-2 focus:ring-[#668b70]/20"
                      >
                        <option value="">
                          Select blood group
                        </option>

                        {BLOOD_GROUPS.map(
                          (group) => (
                            <option
                              key={group}
                              value={group}
                            >
                              {group}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                  </div>

                  {/* Messages */}
                  {error && (
                    <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                      {success}
                    </div>
                  )}

                  {/* Edit actions */}
                  <div className="mt-6 flex gap-3">

                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 rounded-xl bg-[#668b70] px-4 py-3 font-medium text-white transition hover:bg-[#587960] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving
                        ? 'Saving...'
                        : 'Save Details'}
                    </button>

                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}