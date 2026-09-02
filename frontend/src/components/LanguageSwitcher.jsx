import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher({ variant = 'default' }) {
  const { lang, setLanguage } = useLanguage();

  return (
    <div className={`lang-switcher lang-switcher-${variant}`} role="group" aria-label="Language selection">
      <button
        type="button"
        className={`lang-btn ${lang === 'fr' ? 'active' : ''}`}
        onClick={() => setLanguage('fr')}
        aria-pressed={lang === 'fr'}
      >
        <span className="lang-flag">FR</span>
      </button>
      <span className="lang-sep">|</span>
      <button
        type="button"
        className={`lang-btn ${lang === 'ar' ? 'active' : ''}`}
        onClick={() => setLanguage('ar')}
        aria-pressed={lang === 'ar'}
        title="العربية"
      >
        <span className="lang-flag">AR</span>
      </button>
    </div>
  );
}
