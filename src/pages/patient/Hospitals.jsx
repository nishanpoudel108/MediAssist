import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocale } from '../../context/LocaleContext';

export default function Hospitals() {
  const { t } = useLocale();
  const [hospitals, setHospitals] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadHospitals();
  }, []);

  async function loadHospitals() {
    const { data } = await supabase.from('hospitals').select('*').limit(50);
    setHospitals(data || []);
  }

  const filtered = hospitals.filter((h) =>
    (h.name || '').toLowerCase().includes(query.toLowerCase()) ||
    (h.type || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('hospitals')}</h1>

      <div className="card">
        <input
          className="input"
          placeholder={t('search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <p className="text-slate-500 text-sm">{t('noData')}.</p>
        ) : (
          filtered.map((h) => (
            <div key={h.id} className="card">
              <h3 className="font-semibold">{h.name}</h3>
              <p className="text-sm text-slate-500 capitalize">{h.type}</p>
              <p className="text-sm text-slate-600 mt-1">{h.address}</p>
              {/* {h.phone && <p className="text-sm text-slate-600">📞 {h.phone}</p>} */}
              {h.phone && (
                  <a  href={`tel:${h.phone}`} className="text-sm text-slate-600 hover:text-blue-600 cursor-pointer">
                     📞 {h.phone}
                  </a>
    
              )}
              {h.latitude && h.longitude && (
                <div className="mt-3">
                <a
                  className="btn-secondary text-sm mt-3"
                  href={`https://www.google.com/maps?q=${h.latitude},${h.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('nearby')} → Maps
                </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
