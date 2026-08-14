// import { useEffect, useState } from 'react';
// import { supabase } from '../../lib/supabase';
// import { useAuth } from '../../context/AuthContext';
// import { useLocale } from '../../context/LocaleContext';

// const FAMILY_CODE_STORAGE_KEY = 'mediassist-family-invite-code';

// export default function Sharing() {
//   const { profile, user } = useAuth();
//   const { t } = useLocale();
//   const patientId = profile?.id || user?.id;
//   const [permissions, setPermissions] = useState([]);
//   const [reports, setReports] = useState([]);
//   const [form, setForm] = useState({ email: '', granteeType: 'doctor', scope: 'full' });
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [familyCode, setFamilyCode] = useState(() => {
//     try {
//       return JSON.parse(sessionStorage.getItem(FAMILY_CODE_STORAGE_KEY) || 'null');
//     } catch {
//       return null;
//     }
//   });
//   const [error, setError] = useState('');

//   useEffect(() => {
//     if (!patientId) return;
//     loadPermissions();
//     loadReports();
//   }, [patientId]);

//   useEffect(() => {
//     if (!familyCode?.expires_at) return undefined;
//     const remaining = new Date(familyCode.expires_at).getTime() - Date.now();
//     const removeExpiredCode = () => {
//       sessionStorage.removeItem(FAMILY_CODE_STORAGE_KEY);
//       setFamilyCode(null);
//     };

//     if (remaining <= 0) {
//       removeExpiredCode();
//       return undefined;
//     }

//     const expiryTimer = window.setTimeout(removeExpiredCode, remaining);
//     return () => window.clearTimeout(expiryTimer);
//   }, [familyCode]);

//   async function loadPermissions() {
//     const { data } = await supabase
//       .from('permissions')
//       .select('*')
//       .eq('patient_id', patientId);
//     setPermissions(data || []);
//   }

//   async function loadReports() {
//     const { data } = await supabase
//       .from('medical_reports')
//       .select('id, title, created_at')
//       .eq('patient_id', patientId)
//       .order('created_at', { ascending: false });
//     setReports(data || []);
//   }

//   async function grantAccess(e) {
//     e.preventDefault();
//     setError('');
//     if (!form.email) return;
//     if (form.granteeType === 'family') {
//       if (!confirmPassword) {
//         setError('Confirm your password before creating a family invitation.');
//         return;
//       }
//       const { error: reauthError } = await supabase.auth.signInWithPassword({
//         email: user?.email || profile?.email,
//         password: confirmPassword,
//       });
//       if (reauthError) {
//         setError('Password confirmation failed. No invitation was created.');
//         return;
//       }
//       const { data, error } = await supabase.rpc('create_family_invite', {
//         recipient: form.email,
//         access_scope: form.scope,
//       });
//       if (error) setError(error.message);
//       else {
//         const createdCode = data?.[0] || null;
//         if (!createdCode?.code) {
//           setError('The invitation was created, but its code could not be read. Create a new invitation.');
//           return;
//         }
//         // Keep the one-time code for this browser session until it expires.
//         sessionStorage.setItem(FAMILY_CODE_STORAGE_KEY, JSON.stringify(createdCode));
//         setFamilyCode(createdCode);
//         setForm({ email: '', granteeType: 'family', scope: 'full' });
//         setConfirmPassword('');
//       }
//       return;
//     }

//     const { error } = await supabase.from('permissions').insert([
//       { patient_id: patientId, grantee_email: form.email, grantee_type: form.granteeType, scope: form.scope },
//     ]);
//     if (error) {
//       setError(error.message);
//     } else {
//       setForm({ email: '', granteeType: 'doctor', scope: 'full' });
//       loadPermissions();
//     }
//   }

//   async function revokeAccess(id) {
//     setError('');
//     const { error: deleteError } = await supabase.from('permissions').delete().eq('id', id);
//     if (deleteError) setError(deleteError.message);
//     else loadPermissions();
//   }

//   return (
//     <div className="space-y-6">
//       <h1 className="text-2xl font-bold">{t('sharing')}</h1>

//       <div className="card">
//         <h2 className="text-lg font-semibold mb-3">{t('grant')}</h2>
//         <form onSubmit={grantAccess} className="grid grid-cols-1 md:grid-cols-4 gap-3">
//           <input
//             className="input md:col-span-2"
//             placeholder="Grantee email"
//             value={form.email}
//             onChange={(e) => setForm({ ...form, email: e.target.value })}
//             required
//           />
//           <select
//             className="input"
//             value={form.granteeType}
//             onChange={(e) => setForm({ ...form, granteeType: e.target.value })}
//           >
//             <option value="doctor">{t('doctor')}</option>
//             <option value="family">{t('family')}</option>
//           </select>
//           {form.granteeType === 'family' && (
//             <input
//               type="password"
//               className="input md:col-span-2"
//               placeholder="Confirm your password"
//               value={confirmPassword}
//               onChange={(e) => setConfirmPassword(e.target.value)}
//               required
//             />
//           )}
//           <select
//             className="input"
//             value={form.scope}
//             onChange={(e) => setForm({ ...form, scope: e.target.value })}
//             aria-label="Reports to share"
//           >
//             <option value="full">All reports</option>
//             {reports.map((report) => (
//               <option key={report.id} value={report.id}>
//                 {report.title || 'Untitled report'}
//               </option>
//             ))}
//           </select>
//           <button type="submit" className="btn-primary">{form.granteeType === 'family' ? 'Create family code' : t('grant')}</button>
//         </form>
//         {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
//         {familyCode?.code && (
//           <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 p-4">
//             <p className="text-sm font-medium text-slate-800">Share this one-time family code with the intended family member.</p>
//             <p className="mt-2 font-mono text-xl font-bold tracking-widest text-primary-800">{familyCode.code}</p>
//             <p className="mt-2 text-xs text-slate-600">It expires {new Date(familyCode.expires_at).toLocaleString()} and works only for the email entered above. It is not sent by email.</p>
//           </div>
//         )}
//       </div>

//       <div className="card">
//         <h2 className="text-lg font-semibold mb-3">Active shares</h2>
//         {permissions.length === 0 ? (
//           <p className="text-slate-500 text-sm">{t('noData')}.</p>
//         ) : (
//           <ul className="divide-y divide-slate-200">
//             {permissions.map((p) => (
//               <li key={p.id} className="py-3 flex items-center justify-between">
//                 <div>
//                   <p className="font-medium">{p.grantee_email}</p>
//                   <p className="text-sm text-slate-500 capitalize">
//                     {p.grantee_type} · {p.scope}
//                   </p>
//                 </div>
//                 <button onClick={() => revokeAccess(p.id)} className="btn-danger text-sm">
//                   {t('revoke')}
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

export default function Sharing() {
  const { profile, user } = useAuth();

  const patientId = profile?.id || user?.id;
  const patientEmail = profile?.email || user?.email;

  const [familyEmail, setFamilyEmail] = useState('');
  const [scope, setScope] = useState('full');

  const [shares, setShares] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingShares, setLoadingShares] = useState(true);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // --------------------------------------------------
  // LOAD EXISTING FAMILY SHARES
  // --------------------------------------------------

  useEffect(() => {
    if (!patientId) return;

    loadShares();
  }, [patientId]);

  async function loadShares() {
    if (!patientId) return;

    setLoadingShares(true);
    setError('');

    const { data, error: fetchError } = await supabase
      .from('permissions')
      .select('*')
      .eq('patient_id', patientId)
      .eq('grantee_type', 'family')
      .order('created_at', {
        ascending: false,
      });

    if (fetchError) {
      console.error(
        'Load family shares error:',
        fetchError
      );

      setError(fetchError.message);
      setShares([]);
    } else {
      setShares(data || []);
    }

    setLoadingShares(false);
  }

  // --------------------------------------------------
  // ADD FAMILY MEMBER
  // --------------------------------------------------

  async function handleAddFamily(e) {
    e.preventDefault();

    setMessage('');
    setError('');

    const email = familyEmail.trim().toLowerCase();

    if (!patientId) {
      setError('Unable to identify the patient.');
      return;
    }

    if (!email) {
      setError('Please enter a family member email.');
      return;
    }

    if (email === patientEmail?.toLowerCase()) {
      setError(
        'You cannot add your own email as a family member.'
      );
      return;
    }

    setLoading(true);

    try {
      // Check whether this email is already shared
      const { data: existing } = await supabase
        .from('permissions')
        .select('id')
        .eq('patient_id', patientId)
        .eq('grantee_email', email)
        .eq('grantee_type', 'family')
        .maybeSingle();

      if (existing) {
        setError(
          'This family member already has access.'
        );
        return;
      }

      const { error: insertError } =
        await supabase
          .from('permissions')
          .insert([
            {
              patient_id: patientId,
              grantee_email: email,
              grantee_type: 'family',
              scope,
            },
          ]);

      if (insertError) {
        console.error(
          'Add family member error:',
          insertError
        );

        setError(insertError.message);
        return;
      }

      setFamilyEmail('');
      setScope('full');

      setMessage(
        'Family member added successfully.'
      );

      await loadShares();

    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          'Failed to add family member.'
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // REMOVE FAMILY MEMBER
  // --------------------------------------------------

  async function handleRemove(id) {
    if (!id) return;

    const confirmed = window.confirm(
      'Remove this family member from your shared records?'
    );

    if (!confirmed) return;

    setError('');
    setMessage('');

    const { error: deleteError } =
      await supabase
        .from('permissions')
        .delete()
        .eq('id', id)
        .eq('patient_id', patientId);

    if (deleteError) {
      console.error(
        'Remove family member error:',
        deleteError
      );

      setError(deleteError.message);
      return;
    }

    setMessage(
      'Family member access removed.'
    );

    await loadShares();
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div>
        <h1 className="text-2xl font-bold">
          Family Sharing
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Share your health records with trusted
          family members.
        </p>
      </div>

      {/* MESSAGE */}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ------------------------------------------
          ADD FAMILY MEMBER
      ------------------------------------------- */}

      <div className="card">

        <h2 className="mb-2 text-lg font-semibold">
          Add Family Member
        </h2>

        <p className="mb-5 text-sm text-slate-500">
          Enter the email address associated with
          the family member's MediAssist account.
        </p>

        <form
          onSubmit={handleAddFamily}
          className="space-y-4"
        >

          {/* EMAIL */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Family member email
            </label>

            <input
              type="email"
              className="input w-full"
              placeholder="family@example.com"
              value={familyEmail}
              onChange={(e) =>
                setFamilyEmail(e.target.value)
              }
              required
            />
          </div>

          {/* ACCESS */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Access
            </label>

            <select
              className="input w-full"
              value={scope}
              onChange={(e) =>
                setScope(e.target.value)
              }
            >
              <option value="full">
                All reports
              </option>

              <option value="reports">
                Medical reports only
              </option>
            </select>
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading
              ? 'Adding...'
              : 'Add Family Member'}
          </button>

        </form>

      </div>

      {/* ------------------------------------------
          FAMILY MEMBERS
      ------------------------------------------- */}

      <div className="card">

        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            Family Members
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            People who currently have access to
            your shared health records.
          </p>
        </div>

        {loadingShares ? (

          <p className="text-sm text-slate-500">
            Loading family members...
          </p>

        ) : shares.length === 0 ? (

          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">

            <p className="font-medium text-slate-700">
              No family members yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Add a trusted family member using
              their MediAssist email address.
            </p>

          </div>

        ) : (

          <div className="space-y-3">

            {shares.map((share) => (

              <div
                key={share.id}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >

                {/* MEMBER INFO */}
                <div>

                  <p className="font-medium text-slate-800">
                    {share.grantee_email}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Family member
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Access:{' '}
                    {share.scope === 'full'
                      ? 'All reports'
                      : 'Medical reports only'}
                  </p>

                </div>

                {/* REMOVE */}
                <button
                  type="button"
                  onClick={() =>
                    handleRemove(share.id)
                  }
                  className="btn-danger text-sm"
                >
                  Remove access
                </button>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* ------------------------------------------
          PRIVACY INFORMATION
      ------------------------------------------- */}

      <div className="rounded-xl border border-[#668b70]/30 bg-[#668b70]/5 p-5">

        <h3 className="font-semibold text-slate-800">
          Your health data stays under your control
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Family members can only access records
          that you choose to share. You can remove
          their access at any time.
        </p>

      </div>

    </div>
  );
}