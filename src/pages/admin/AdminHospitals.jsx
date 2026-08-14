// import { useEffect, useState } from 'react';
// import { supabase } from '../../lib/supabase';
// import { useLocale } from '../../context/LocaleContext';

// export default function AdminHospitals() {
//   const { t } = useLocale();
//   const [hospitals, setHospitals] = useState([]);
//   const [form, setForm] = useState({ name: '', type: 'hospital', address: '', phone: '', latitude: '', longitude: '' });

//   useEffect(() => {
//     loadHospitals();
//   }, []);

//   async function loadHospitals() {
//     const { data } = await supabase.from('hospitals').select('*').order('name');
//     setHospitals(data || []);
//   }

//   async function addHospital(e) {
//     e.preventDefault();
//     if (!form.name) return;
//     const { error } = await supabase.from('hospitals').insert([
//       {
//         name: form.name,
//         type: form.type,
//         address: form.address,
//         phone: form.phone,
//         latitude: form.latitude ? parseFloat(form.latitude) : null,
//         longitude: form.longitude ? parseFloat(form.longitude) : null,
//       },
//     ]);
//     if (!error) {
//       setForm({ name: '', type: 'hospital', address: '', phone: '', latitude: '', longitude: '' });
//       loadHospitals();
//     }
//   }

//   return (
//     <div className="space-y-6">
//       <h1 className="text-2xl font-bold">{t('hospitals')}</h1>

//       <div className="card">
//         <h2 className="text-lg font-semibold mb-3">Add facility</h2>
//         <form onSubmit={addHospital} className="grid grid-cols-1 md:grid-cols-3 gap-3">
//           <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
//           <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
//             <option value="hospital">Hospital</option>
//             <option value="clinic">Clinic</option>
//             <option value="pharmacy">Pharmacy</option>
//             <option value="emergency">Emergency center</option>
//           </select>
//           <input className="input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
//           <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
//           <input className="input" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
//           <input className="input" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
//           <button type="submit" className="btn-primary">Add</button>
//         </form>
//       </div>

//       <div className="card">
//         {hospitals.length === 0 ? (
//           <p className="text-slate-500 text-sm">{t('noData')}.</p>
//         ) : (
//           <table className="w-full text-sm">
//             <thead>
//               <tr className="text-left text-slate-500 border-b">
//                 <th className="py-2">Name</th>
//                 <th>Type</th>
//                 <th>Address</th>
//                 <th>Phone</th>
//                 <th>Latitude</th>
//                 <th>Longitude</th>
//               </tr>
//             </thead>
//             <tbody>
//               {hospitals.map((h) => (
//                 <tr key={h.id} className="border-b">
//                   <td className="py-2">{h.name}</td>
//                   <td className="capitalize">{h.type}</td>
//                   <td>{h.address}</td>
//                   <td>{h.phone}</td>
//                   <td>{h.latitude}</td>
//                   <td>{h.longitude}</td>
//                   <td>edit</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>
//     </div>
//   );
// }
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocale } from '../../context/LocaleContext';

export default function AdminHospitals() {
  const { t } = useLocale();

  const [hospitals, setHospitals] = useState([]);
  const [editingHospital, setEditingHospital] = useState(null);

  const [form, setForm] = useState({
    name: '',
    type: 'hospital',
    address: '',
    phone: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    loadHospitals();
  }, []);

  async function loadHospitals() {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('name');

    if (!error) {
      setHospitals(data || []);
    }
  }

  async function addHospital(e) {
    e.preventDefault();

    if (!form.name) return;

    const { error } = await supabase.from('hospitals').insert([
      {
        name: form.name,
        type: form.type,
        address: form.address,
        phone: form.phone,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      },
    ]);

    if (!error) {
      setForm({
        name: '',
        type: 'hospital',
        address: '',
        phone: '',
        latitude: '',
        longitude: '',
      });

      loadHospitals();
    }
  }

  // Open edit modal
  function startEditing(hospital) {
    setEditingHospital({
      ...hospital,
      latitude: hospital.latitude ?? '',
      longitude: hospital.longitude ?? '',
    });
  }

  // Update hospital in Supabase
  async function updateHospital(e) {
    e.preventDefault();

    if (!editingHospital?.name) return;

    const { error } = await supabase
      .from('hospitals')
      .update({
        name: editingHospital.name,
        type: editingHospital.type,
        address: editingHospital.address,
        phone: editingHospital.phone,
        latitude: editingHospital.latitude
          ? parseFloat(editingHospital.latitude)
          : null,
        longitude: editingHospital.longitude
          ? parseFloat(editingHospital.longitude)
          : null,
      })
      .eq('id', editingHospital.id);

    if (!error) {
      setEditingHospital(null);
      loadHospitals();
    } else {
      console.error('Update failed:', error);
    }
  }

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        {t('hospitals')}
      </h1>

      {/* ADD FACILITY */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">
          Add facility
        </h2>

        <form
          onSubmit={addHospital}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            required
          />

          <select
            className="input"
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value })
            }
          >
            <option value="hospital">Hospital</option>
            <option value="clinic">Clinic</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="emergency">Emergency center</option>
          </select>

          <input
            className="input"
            placeholder="Address"
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Latitude"
            value={form.latitude}
            onChange={(e) =>
              setForm({ ...form, latitude: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Longitude"
            value={form.longitude}
            onChange={(e) =>
              setForm({ ...form, longitude: e.target.value })
            }
          />

          <button
            type="submit"
            className="btn-primary"
          >
            Add
          </button>
        </form>
      </div>

      {/* FACILITIES TABLE */}
      <div className="card overflow-x-auto">
        {hospitals.length === 0 ? (
          <p className="text-slate-500 text-sm">
            {t('noData')}.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Name</th>
                <th>Type</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {hospitals.map((h) => (
                <tr
                  key={h.id}
                  className="border-b"
                >
                  <td className="py-3 font-medium">
                    {h.name}
                  </td>

                  <td className="capitalize">
                    {h.type}
                  </td>

                  <td>
                    {h.address || '—'}
                  </td>

                  <td>
                    {h.phone ? (
                      <p
                        href={`tel:${h.phone}`}
                        className="text-black-600"
                      >
                        {h.phone}
                      </p>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td>
                    {h.latitude ?? '—'}
                  </td>

                  <td>
                    {h.longitude ?? '—'}
                  </td>

                  <td>
                    <div className="flex gap-2 py-2">

                      {/* EDIT */}
                      <button
                        onClick={() => startEditing(h)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition text-xs font-medium"
                      >
                        ✏️ Edit
                      </button>

                      {/* INDIVIDUAL CARE CENTER */}
                      {/* <button
                      //   onClick={() =>
                      //     window.location.href = `/care-center/${h.id}`
                      //   }
                      //   className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-xs font-medium"
                      // >
                      //   🏥 Care Center
                      // </button> */}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">

          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold">
                  Edit Facility
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Update hospital or care center details
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingHospital(null)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 text-slate-500 text-lg"
              >
                ✕
              </button>
            </div>

            {/* EDIT FORM */}
            <form
              onSubmit={updateHospital}
              className="space-y-4"
            >

              <div>
                <label className="text-sm font-medium">
                  Name
                </label>

                <input
                  className="input mt-1"
                  value={editingHospital.name || ''}
                  onChange={(e) =>
                    setEditingHospital({
                      ...editingHospital,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Type
                </label>

                <select
                  className="input mt-1"
                  value={editingHospital.type || 'hospital'}
                  onChange={(e) =>
                    setEditingHospital({
                      ...editingHospital,
                      type: e.target.value,
                    })
                  }
                >
                  <option value="hospital">Hospital</option>
                  <option value="clinic">Clinic</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="emergency">
                    Emergency center
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Address
                </label>

                <input
                  className="input mt-1"
                  value={editingHospital.address || ''}
                  onChange={(e) =>
                    setEditingHospital({
                      ...editingHospital,
                      address: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Phone
                </label>

                <input
                  className="input mt-1"
                  value={editingHospital.phone || ''}
                  onChange={(e) =>
                    setEditingHospital({
                      ...editingHospital,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                <div>
                  <label className="text-sm font-medium">
                    Latitude
                  </label>

                  <input
                    type="number"
                    step="any"
                    className="input mt-1"
                    value={editingHospital.latitude}
                    onChange={(e) =>
                      setEditingHospital({
                        ...editingHospital,
                        latitude: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Longitude
                  </label>

                  <input
                    type="number"
                    step="any"
                    className="input mt-1"
                    value={editingHospital.longitude}
                    onChange={(e) =>
                      setEditingHospital({
                        ...editingHospital,
                        longitude: e.target.value,
                      })
                    }
                  />
                </div>

              </div>

              {/* MODAL BUTTONS */}
              <div className="flex justify-end gap-3 pt-4">

                <button
                  type="button"
                  onClick={() => setEditingHospital(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Changes
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}