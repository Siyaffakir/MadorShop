import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const [navSearch, setNavSearch] = useState('');
  const { cartCount, openCart } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchCategory, setSearchCategory] = useState('');

  function handleSearchSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (navSearch.trim()) params.set('search', navSearch.trim());
    if (searchCategory) params.set('category', searchCategory);
    
    const query = params.toString();
    navigate(query ? `/products?${query}` : '/products');
  }

  const isProducts = location.pathname === '/products';
  const searchParams = new URLSearchParams(location.search);
  const currentCategory = searchParams.get('category') || '';

  const CATEGORY_ITEMS = [
    { label: t('nav.complements'), query: 'Complément Alimentaire' },
    { label: t('nav.packComplements'), query: 'Pack Complément Alimentaire' },
    { label: t('nav.cosmetiqueBio'), query: 'Cosmétique Bio et Naturel' },
    { label: t('nav.packCosmetique'), query: 'Pack Cosmétique' },
    { label: t('nav.makeup'), query: 'Make up' },
    { label: t('nav.parfums'), query: 'Parfums' },
  ];

  return (
    <header className="navbar">
      {/* Top Announcement Bar / Mador Ticker */}
      <div className="top-ticker">
        <span>
          <span className="badge-green">58 WILAYAS</span> {t('nav.codTag')}
        </span>
        <span className="hide-mobile">{t('nav.authenticTag')}</span>
        <LanguageSwitcher variant="ticker" />
      </div>

      {/* Modern Green & Black Divider Ribbon */}
      <div className="sephora-stripes" />

      {/* Main Navbar */}
      <div className="navbar-main">
        {/* Brand Logo with Mador Emblem */}
        <div className="navbar-brand-group">
          <Link to="/" className="navbar-logo">
            <img
              src="/mador-logo.svg"
              alt="Mador Shopping"
              className="brand-logo-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="logo-text-group">
              <div className="logo-main">
                Mador<span>.</span>
              </div>
              <div className="logo-sub">Shopping</div>
            </div>
          </Link>
        </div>

        {/* Marketplace Global Search Bar with Integrated Category Selector */}
        <div className="nav-search-wrap">
          <form onSubmit={handleSearchSubmit} className="nav-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
            />
            {navSearch && (
              <button
                type="button"
                className="nav-search-clear"
                onClick={() => setNavSearch('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            <button type="submit" className="nav-search-btn">
              {t('catalog.searchPlaceholder') ? 'Rechercher' : 'Search'}
            </button>
          </form>
        </div>

        {/* Actions Group with Cart Button */}
        <div className="nav-actions">
          <Link to="/products" className="nav-btn">
            <span>{t('nav.catalog')}</span>
          </Link>

          {/* Cart / Shopping Bag Button */}
          <button
            type="button"
            className="nav-cart-btn"
            onClick={openCart}
            aria-label="View shopping cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className="nav-cart-label">{t('nav.bag')}</span>
            {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* Department Category Navigation Bar */}
      <nav className="navbar-departments">
        <div className="dept-list">
          <Link
            to="/products"
            className={`dept-item ${isProducts && !currentCategory ? 'active' : ''}`}
          >
            {t('nav.allProducts')}
          </Link>
          {CATEGORY_ITEMS.map((item, idx) => (
            <Link
              key={idx}
              to={`/products?category=${encodeURIComponent(item.query)}`}
              className={`dept-item ${currentCategory.toLowerCase() === item.query.toLowerCase() ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href="https://ultimatedz.com/sign-up/f61b215f9d7ee27ff88b8de694fee22e"
            target="_blank"
            rel="noopener noreferrer"
            className="dept-item ultimate-btn"
            title={t('nav.joinUltimate')}
          >
            <span className="ultimate-btn-pulse-dot" />
            <span className="ultimate-btn-icon" aria-hidden="true">✦</span>
            <span className="ultimate-btn-text">{t('nav.joinUltimate')}</span>
            <span className="ultimate-btn-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      </nav>
    </header>
  );
}


