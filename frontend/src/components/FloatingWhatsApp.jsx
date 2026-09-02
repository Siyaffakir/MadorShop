import { useLanguage } from '../context/LanguageContext';

export default function FloatingWhatsApp() {
  const { lang } = useLanguage();
  const PHONE_RAW = '213561662874';
  const defaultMessage = lang === 'ar'
    ? 'مرحباً مادور شوبينغ، أود الاستفسار عن منتجاتكم.'
    : 'Bonjour Mador Shopping, je souhaite des renseignements sur vos produits.';

  const whatsappUrl = `https://wa.me/${PHONE_RAW}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="floating-whatsapp-btn"
      aria-label={lang === 'ar' ? 'تواصل معنا عبر واتساب' : 'Contactez-nous sur WhatsApp'}
    >
      <span className="floating-whatsapp-pulse" />
      <span className="floating-whatsapp-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.79 14.18c-.24.68-1.4 1.26-1.92 1.34-.5.08-1.14.12-3.32-.78-2.62-1.08-4.3-3.77-4.43-3.94-.13-.17-1.06-1.41-1.06-2.69s.67-1.91.91-2.17c.24-.26.53-.33.71-.33.18 0 .35 0 .5.01.16.01.37-.06.58.44.21.5.73 1.77.79 1.9.06.13.1.28.02.44-.08.17-.12.28-.24.42-.12.14-.26.31-.37.42-.12.12-.25.26-.11.5.14.24.63 1.04 1.35 1.68.93.83 1.71 1.09 1.95 1.21.24.12.38.1.53-.06.14-.17.61-.71.77-.95.16-.24.33-.2.55-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.58-.18 1.26z"/>
        </svg>
      </span>
      <span className="floating-whatsapp-text">
        {lang === 'ar' ? 'واتساب مباشر' : 'WhatsApp Direct'}
      </span>
      <span className="floating-whatsapp-online-dot" />
    </a>
  );
}
