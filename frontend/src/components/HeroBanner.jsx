import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { productImage } from '../api';
import { useLanguage } from '../context/LanguageContext';

function formatDZD(price) {
  return `${Number(price).toLocaleString('en-US')} DZD`;
}

export default function HeroBanner({ products }) {
  const [active, setActive] = useState(0);
  const { t, dict } = useLanguage();
  const navigate = useNavigate();

  const campaignTags = dict?.hero?.tags || [
    '✦ MADOR SHOPPING EXCLUSIVE',
    '✦ SPECIAL VALUE PACKS',
    '✦ GUARANTEED QUALITY',
    '✦ NEW ARRIVALS',
  ];

  useEffect(() => {
    if (!products || products.length < 2) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % products.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [products]);

  if (!products || products.length === 0) return null;

  return (
    <div className="marketplace-hero-wrap">
      <div className="container">
        <div className="hero-marketplace-grid">
          {/* Main Marketplace Slider Banner */}
          <div className="hero">
            {products.map((p, i) => {
              const img = productImage(p);
              const tag = campaignTags[i % campaignTags.length];
              return (
                <div
                  key={p.id}
                  className={`hero-slide ${i === active ? 'active' : ''}`}
                  style={{
                    backgroundImage: `url(${img})`,
                  }}
                >
                  <div className="hero-content">
                    <div className="hero-badge">{tag}</div>
                    <h1>{p.name}</h1>
                    <p>{p.description || t('hero.defaultDesc')}</p>
                    <div className="hero-price-row">
                      <div className="hero-price">
                        {formatDZD(p.price)}
                      </div>
                      <span className="hero-price-tag">
                        {t('hero.inStockCOD')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button className="btn btn-green" onClick={() => navigate(`/product/${p.id}`)}>
                        {t('hero.shopNow')}
                      </button>
                      <button className="btn btn-outline" onClick={() => navigate('/products')}>
                        {t('hero.explore')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="hero-dots">
              {products.map((p, i) => (
                <button
                  key={p.id}
                  className={`hero-dot ${i === active ? 'active' : ''}`}
                  onClick={() => setActive(i)}
                  aria-label={`${t('hero.slideAria')} ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right Side Promo Marketplace Cards */}
          <div className="hero-side-cards">
            {/* Card 1: Value Packs */}
            <div className="side-promo-card" style={{ background: '#ffffff' }}>
              <div>
                <span className="side-promo-badge">★ OFFRE SPÉCIALE PACKS</span>
                <h3>Packs Compléments & Cosmétiques</h3>
                <p>Profitez de nos coffrets complets pour maximiser votre bien-être et vos économies.</p>
              </div>
              <Link to="/products?category=Pack+Compl%C3%A9ment+Alimentaire" className="side-promo-link">
                Explorer les Packs ➔
              </Link>
            </div>

            {/* Card 2: 58 Wilayas Express Delivery */}
            <div className="side-promo-card" style={{ background: 'var(--color-green-tint)', borderColor: 'var(--color-green-border)' }}>
              <div>
                <span className="side-promo-badge" style={{ background: '#ffffff' }}>🚚 LIVRAISON 58 WILAYAS</span>
                <h3>Expédition Rapide & Sécurisée</h3>
                <p>Livraison à domicile ou en point relais avec paiement en espèces à la réception.</p>
              </div>
              <Link to="/products" className="side-promo-link">
                Commander Maintenant ➔
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


