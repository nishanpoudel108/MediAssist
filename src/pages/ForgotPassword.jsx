import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { AuthShell } from './Login';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <AuthShell title={t('resetPassword')} subtitle={t('tagline')}>
      {sent ? (
        <div className="rounded-lg bg-green-50 text-green-700 text-sm p-3">{t('resetSent')}</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 text-sm p-3">{error}</div>
          )}
          <div>
            <label className="label">{t('email')}</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? t('loading') : t('resetPassword')}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-slate-600">
        <Link to="/login" className="text-primary-600 hover:underline">
          {t('login')}
        </Link>
      </p>
    </AuthShell>
  );
}
