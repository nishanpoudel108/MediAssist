import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

export default function Login() {
  const { signIn } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const info = location.state?.message === 'check email' ? t('checkEmail') : '';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    navigate('/');
  }

  return (
    <AuthShell title={t('login')} subtitle={t('tagline')}>
<form onSubmit={handleSubmit} className="space-y-4">
        {info && (
          <div className="rounded-lg bg-green-50 text-green-700 text-sm p-3">{info}</div>
        )}
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
        <div>
          <label className="label">{t('password')}</label>
          <input
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">
            {t('forgotPassword')}
          </Link>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t('loading') : t('login')}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {t('signup')}?{' '}
        <Link to="/signup" className="text-primary-600 hover:underline">
          {t('signup')}
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  const { t } = useLocale();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-5 sm:p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-xl font-bold text-primary-700">M</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">{t('appName')}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </div>
        <div className="card p-7 sm:p-8">
          <h2 className="mb-5 text-xl font-semibold tracking-tight">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
