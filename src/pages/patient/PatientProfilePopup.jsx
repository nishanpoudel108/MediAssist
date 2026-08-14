import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function PatientProfilePopup({
  profile,
  open,
  onClose,
}) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !profile?.id) return;

    const loadPatientDetails = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('patients')
        .select(
          'full_name, email, date_of_birth, blood_group'
        )
        .eq('id', profile.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to load patient profile:', error);
      } else {
        setPatient(data);
      }

      setLoading(false);
    };

    loadPatientDetails();
  }, [open, profile?.id]);

  // Don't render when closed
  if (!open) return null;

  const name =
    patient?.full_name ||
    profile?.full_name ||
    'Patient';

  const email =
    patient?.email ||
    profile?.email ||
    'Not available';

  const dob =
    patient?.date_of_birth
      ? formatDate(patient.date_of_birth)
      : 'Not added';

  const bloodGroup =
    patient?.blood_group ||
    'Not added';

  return (
    <>
      {/* Background overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed bottom-24 left-6 z-50 w-[340px] max-w-[calc(100vw-2rem)]">
        <div
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >

          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">
                Patient Profile
              </h3>

              <p className="text-xs text-slate-500 mt-0.5">
                Personal information
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Profile Avatar */}
          <div className="px-5 pt-5 pb-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-lg font-semibold">
              {getInitials(name)}
            </div>

            <div className="min-w-0">
              <h4 className="font-semibold text-slate-800 truncate">
                {name}
              </h4>

              <p className="text-sm text-slate-500 truncate">
                {email}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="px-5 pb-5">

            {loading ? (
              <div className="py-5 text-center text-sm text-slate-500">
                Loading details...
              </div>
            ) : (
              <div className="space-y-3">

                {/* Name */}
                <DetailRow
                  icon="👤"
                  label="Full Name"
                  value={name}
                />

                {/* Email */}
                <DetailRow
                  icon="✉️"
                  label="Email"
                  value={email}
                />

                {/* DOB */}
                <DetailRow
                  icon="🎂"
                  label="Date of Birth"
                  value={dob}
                />

                {/* Blood Group */}
                <DetailRow
                  icon="🩸"
                  label="Blood Group"
                  value={bloodGroup}
                  highlight={bloodGroup !== 'Not added'}
                />

              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}


/* ---------------------------------------
   Detail Row
--------------------------------------- */

function DetailRow({
  icon,
  label,
  value,
  highlight = false,
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50">

      <div className="flex items-center gap-3 min-w-0">

        <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
          {icon}
        </span>

        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            {label}
          </p>

          <p className="text-sm font-medium text-slate-800 truncate">
            {value}
          </p>
        </div>

      </div>

      {highlight && label === 'Blood Group' && (
        <span className="text-sm font-bold text-red-600">
          {value}
        </span>
      )}

    </div>
  );
}


/* ---------------------------------------
   Helpers
--------------------------------------- */

function getInitials(name) {
  if (!name) return 'P';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}