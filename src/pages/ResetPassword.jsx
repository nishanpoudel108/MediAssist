import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLocale } from '../context/LocaleContext';
import { AuthShell } from './Login';

export default function ResetPassword() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    navigate('/login');
  }

  return (
    <AuthShell title={t('resetPassword')} subtitle={t('tagline')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 text-sm p-3">{error}</div>
        )}
        <div>
          <label className="label">{t('password')}</label>
          <input
            type="password"
            required
            minLength={8}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t('loading') : t('resetPassword')}
        </button>
      </form>
    </AuthShell>
  );
}
