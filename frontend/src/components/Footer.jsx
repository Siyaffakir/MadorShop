import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Footer() {
  const { t } = useLanguage();

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
              <li><Link to="/products?category=Outils+de+travail">{t('nav.outils')}</Link></li>
              <li><Link to="/products?category=Make+up">{t('nav.makeup')}</Link></li>
              <li><Link to="/products?category=Parfums">{t('nav.parfums')}</Link></li>
              <li><Link to="/products?category=Home">{t('nav.home')}</Link></li>
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div className="footer-col">
            <h4>{t('footer.colCustomerCare')}</h4>
            <ul>
              <li><Link to="/products">{t('footer.trackOrder')}</Link></li>
              <li><Link to="/products">{t('footer.deliveryInfo')}</Link></li>
              <li><Link to="/products">{t('footer.codFaq')}</Link></li>
              <li><Link to="/products">{t('footer.authenticity')}</Link></li>
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



