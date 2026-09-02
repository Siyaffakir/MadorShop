import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Footer() {
  const { t, lang } = useLanguage();

  return (
    <footer className="footer">
      {/* Signature B&W with Green Stripe Accent */}
      <div className="sephora-stripes-thick" />

      {/* Main Footer Links */}
      <div className="container footer-main">
        <div className="footer-grid">
          {/* Col 1: Brand */}
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <img
                src="/mador-logo.svg"
                alt="Mador Shopping"
                style={{ height: '40px', width: 'auto', background: 'transparent' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
              {t('footer.brandDesc')}
            </p>
            <div style={{ fontSize: '12.5px', color: 'var(--color-green)', fontWeight: '700' }}>
              {t('footer.codAssurance')}
            </div>
          </div>

          {/* Col 2: Departments */}
          <div className="footer-col">
            <h4>{t('footer.colDepartments')}</h4>
            <ul>
              <li><Link to="/products?category=Compl%C3%A9ment+Alimentaire">{t('nav.complements')}</Link></li>
              <li><Link to="/products?category=Pack+Compl%C3%A9ment+Alimentaire">{t('nav.packComplements')}</Link></li>
              <li><Link to="/products?category=Cosm%C3%A9tique+Bio+et+Naturel">{t('nav.cosmetiqueBio')}</Link></li>
              <li><Link to="/products?category=Pack+Cosm%C3%A9tique">{t('nav.packCosmetique')}</Link></li>
              <li><Link to="/products?category=Make+up">{t('nav.makeup')}</Link></li>
              <li><Link to="/products?category=Parfums">{t('nav.parfums')}</Link></li>
            </ul>
          </div>

          {/* Col 3: Contact & Customer Care */}
          <div className="footer-col">
            <h4>{lang === 'ar' ? 'الاتصال وخدمة العملاء' : 'Contact & Service Client'}</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <a href="tel:+213561662874" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: 'var(--color-green)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  +213 (0) 561 66 28 74
                </a>
              </li>
              <li>
                <a href="https://wa.me/213561662874" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#16a34a' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.79 14.18c-.24.68-1.4 1.26-1.92 1.34-.5.08-1.14.12-3.32-.78-2.62-1.08-4.3-3.77-4.43-3.94-.13-.17-1.06-1.41-1.06-2.69s.67-1.91.91-2.17c.24-.26.53-.33.71-.33.18 0 .35 0 .5.01.16.01.37-.06.58.44.21.5.73 1.77.79 1.9.06.13.1.28.02.44-.08.17-.12.28-.24.42-.12.14-.26.31-.37.42-.12.12-.25.26-.11.5.14.24.63 1.04 1.35 1.68.93.83 1.71 1.09 1.95 1.21.24.12.38.1.53-.06.14-.17.61-.71.77-.95.16-.24.33-.2.55-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.58-.18 1.26z"/>
                  </svg>
                  WhatsApp : 0561 66 28 74
                </a>
              </li>
              <li>
                <a href="mailto:khatibazem@gmail.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  khatibazem@gmail.com
                </a>
              </li>
              <li style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {lang === 'ar' ? 'طيلة أيام الأسبوع من 09:00 إلى 21:00' : '7j/7 de 09h00 à 21h00'}
              </li>
            </ul>
          </div>

          {/* Col 4: Delivery Assurance */}
          <div className="footer-col">
            <h4>{t('footer.colDelivery')}</h4>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>
              {t('footer.deliveryDesc')}
            </p>
            <span style={{ fontSize: '12px', color: 'var(--color-green)', fontWeight: '800' }}>
              {t('nav.wilayasCount')} {t('nav.codTag')}
            </span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
            <p style={{ color: 'var(--color-gray-500)', marginTop: '2px' }}>{t('footer.currencyNotice')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-gray-600)' }}>{t('language.switchLanguage')}:</span>
            <LanguageSwitcher variant="ticker" />
          </div>
        </div>
      </div>
    </footer>
  );
}



