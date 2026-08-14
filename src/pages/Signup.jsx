import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { AuthShell } from './Login';

const roles = ['patient', 'family', 'doctor'];

export default function Signup() {
  const { signUp } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error } = await signUp({ email, password, role, fullName });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // If a session is returned immediately (email confirmation disabled),
    // auto-login and route to the home (which redirects to the role dashboard).
    if (data?.session) {
      navigate('/');
    } else {
      // Email confirmation required — prompt the user to verify.
      navigate('/login', { state: { message: 'check email' } });
    }
  }

  return (
    <AuthShell title={t('signup')} subtitle={t('tagline')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 text-sm p-3">{error}</div>
        )}
        <div>
          <label className="label">{t('fullName')}</label>
          <input
            required
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
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
            minLength={8}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t('role')}</label>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setRole(item)}
                className={role === item ? 'btn-primary' : 'btn-secondary'}
              >
                {t(item)}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t('loading') : t('signup')}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {t('login')}?{' '}
        <Link to="/login" className="text-primary-600 hover:underline">
          {t('login')}
        </Link>
      </p>
    </AuthShell>
  );
}
