import { useLocale } from '../context/LocaleContext';
import { locales } from '../i18n/locales';

export default function LanguageSwitcher({ compact = false }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className={compact ? 'text-sm' : ''}>
      <label className="sr-only">{t('language')}</label>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="input text-sm"
        aria-label={t('language')}
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </div>
  );
}
