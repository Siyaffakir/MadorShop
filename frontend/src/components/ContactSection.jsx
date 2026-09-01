import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function ContactSection() {
  const { t, lang } = useLanguage();
  const [copiedField, setCopiedField] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    subject: '',
    message: '',
  });

  const OWNER_PHONE = '+213 561 66 28 74';
  const OWNER_PHONE_RAW = '213561662874';
  const OWNER_EMAIL = 'khatibazem@gmail.com';

  function handleCopy(text, fieldName) {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  }

  function handleSendWhatsApp(e) {
    e.preventDefault();
    const text = `Bonjour Mador Shopping,\n\nNom: ${form.name || 'Client'}\nTéléphone: ${form.phone || 'Non précisé'}\nSujet: ${form.subject || 'Renseignement Général'}\n\nMessage:\n${form.message || 'Bonjour, je souhaite contacter la direction de Mador Shopping.'}`;
    window.open(`https://wa.me/${OWNER_PHONE_RAW}?text=${encodeURIComponent(text)}`, '_blank');
  }

  function handleSendEmail(e) {
    e.preventDefault();
    const subject = encodeURIComponent(`[Mador Shopping Contact] ${form.subject || 'Demande d\'information'}`);
    const body = encodeURIComponent(`Nom: ${form.name || 'Client'}\nTéléphone: ${form.phone || 'Non précisé'}\n\nMessage:\n${form.message || 'Bonjour, je souhaite contacter Mador Shopping.'}`);
    window.location.href = `mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <section id="contact" className="contact-section">
      <div className="container">
        {/* Section Header */}
        <div className="section-header contact-header">
          <div>
            <div className="contact-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{lang === 'fr' ? '✦ CONTACT & SUPPORT DIRECT' : '✦ CONTACT & DIRECT SUPPORT'}</span>
            </div>
            <h2 className="section-title">
              {t('contact.title') || 'Contactez'} <span>{t('contact.titleHighlight') || 'La Direction & Support'}</span>
            </h2>
            <p className="section-sub">
              {t('contact.sub') || 'Une question sur un article, une commande ou un partenariat ? Contactez directement notre équipe et le propriétaire.'}
            </p>
          </div>
        </div>

        {/* Contact Cards Grid */}
        <div className="contact-grid">
          {/* Card 1: Owner & Direct Call */}
          <div className="contact-card primary-highlight">
            <div className="contact-card-icon-wrap icon-phone">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="contact-card-content">
              <span className="contact-card-tag">{lang === 'fr' ? 'Direction & Propriétaire' : 'Owner & Direct Call'}</span>
              <h3 className="contact-card-title">{lang === 'fr' ? 'Téléphone Direct' : 'Direct Phone'}</h3>
              <p className="contact-card-value">{OWNER_PHONE}</p>
              <p className="contact-card-desc">
                {lang === 'fr' ? 'Disponible 7j/7 de 09h00 à 21h00 pour vos questions et urgences.' : 'Available 7d/7 from 09:00 to 21:00 for questions & support.'}
              </p>
              <div className="contact-card-actions">
                <a href={`tel:${OWNER_PHONE.replace(/\s+/g, '')}`} className="btn btn-green btn-contact">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {lang === 'fr' ? 'Appeler' : 'Call Now'}
                </a>
                <button
                  type="button"
                  className="btn btn-contact-outline"
                  onClick={() => handleCopy(OWNER_PHONE, 'phone')}
                >
                  {copiedField === 'phone' ? (lang === 'fr' ? '✓ Copié' : '✓ Copied') : (lang === 'fr' ? 'Copier' : 'Copy')}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Official Email */}
          <div className="contact-card">
            <div className="contact-card-icon-wrap icon-email">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="contact-card-content">
              <span className="contact-card-tag">{lang === 'fr' ? 'Service Client & Pro' : 'Official Support'}</span>
              <h3 className="contact-card-title">{lang === 'fr' ? 'Email Officiel' : 'Official Email'}</h3>
              <p className="contact-card-value">{OWNER_EMAIL}</p>
              <p className="contact-card-desc">
                {lang === 'fr' ? 'Pour vos demandes écrites, facturation et partenariats professionnels.' : 'For written inquiries, invoicing and partnership requests.'}
              </p>
              <div className="contact-card-actions">
                <a href={`mailto:${OWNER_EMAIL}`} className="btn btn-green btn-contact">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {lang === 'fr' ? 'Écrire un Email' : 'Send Email'}
                </a>
                <button
                  type="button"
                  className="btn btn-contact-outline"
                  onClick={() => handleCopy(OWNER_EMAIL, 'email')}
                >
                  {copiedField === 'email' ? (lang === 'fr' ? '✓ Copié' : '✓ Copied') : (lang === 'fr' ? 'Copier' : 'Copy')}
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Instant WhatsApp */}
          <div className="contact-card whatsapp-highlight">
            <div className="contact-card-icon-wrap icon-whatsapp">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.79 14.18c-.24.68-1.4 1.26-1.92 1.34-.5.08-1.14.12-3.32-.78-2.62-1.08-4.3-3.77-4.43-3.94-.13-.17-1.06-1.41-1.06-2.69s.67-1.91.91-2.17c.24-.26.53-.33.71-.33.18 0 .35 0 .5.01.16.01.37-.06.58.44.21.5.73 1.77.79 1.9.06.13.1.28.02.44-.08.17-.12.28-.24.42-.12.14-.26.31-.37.42-.12.12-.25.26-.11.5.14.24.63 1.04 1.35 1.68.93.83 1.71 1.09 1.95 1.21.24.12.38.1.53-.06.14-.17.61-.71.77-.95.16-.24.33-.2.55-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.58-.18 1.26z"/>
              </svg>
            </div>
            <div className="contact-card-content">
              <span className="contact-card-tag">{lang === 'fr' ? 'Messagerie Instantanée' : 'Instant Chat'}</span>
              <h3 className="contact-card-title">{lang === 'fr' ? 'WhatsApp Direct' : 'Direct WhatsApp'}</h3>
              <p className="contact-card-value">{OWNER_PHONE}</p>
              <p className="contact-card-desc">
                {lang === 'fr' ? 'Discussion rapide avec le responsable pour photos de produits et suivi.' : 'Instant chat with the owner for product photos & fast tracking.'}
              </p>
              <div className="contact-card-actions">
                <a
                  href={`https://wa.me/${OWNER_PHONE_RAW}?text=${encodeURIComponent('Bonjour Mador Shopping, je souhaite des renseignements.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-contact"
                >
                  {lang === 'fr' ? 'Ouvrir WhatsApp' : 'Open WhatsApp'}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Quick Contact Box */}
        <div className="contact-form-container">
          <div className="contact-form-header">
            <h3>{lang === 'fr' ? 'Envoyez un Message Rapide' : 'Send a Quick Message'}</h3>
            <p>
              {lang === 'fr'
                ? 'Remplissez ce formulaire pour envoyer directement votre message par WhatsApp ou Email à la direction.'
                : 'Fill out this quick form to send your message directly via WhatsApp or Email to store management.'}
            </p>
          </div>

          <form className="contact-quick-form" onSubmit={(e) => e.preventDefault()}>
            <div className="contact-form-row">
              <div className="form-group">
                <label>{lang === 'fr' ? 'Votre Nom & Prénom' : 'Your Full Name'}</label>
                <input
                  type="text"
                  placeholder={lang === 'fr' ? 'Ex: Mohamed Amine' : 'e.g. John Doe'}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{lang === 'fr' ? 'Téléphone (Algérie)' : 'Phone Number'}</label>
                <input
                  type="tel"
                  placeholder="05 / 06 / 07 ..."
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>{lang === 'fr' ? 'Objet de votre demande' : 'Subject'}</label>
              <input
                type="text"
                placeholder={lang === 'fr' ? 'Ex: Renseignement produit, commande, disponibilité...' : 'e.g. Product inquiry, order question...'}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>{lang === 'fr' ? 'Votre Message' : 'Your Message'}</label>
              <textarea
                rows="3"
                placeholder={lang === 'fr' ? 'Écrivez votre message ici...' : 'Type your message here...'}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>

            <div className="contact-form-buttons">
              <button
                type="button"
                className="btn btn-whatsapp-submit"
                onClick={handleSendWhatsApp}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.79 14.18c-.24.68-1.4 1.26-1.92 1.34-.5.08-1.14.12-3.32-.78-2.62-1.08-4.3-3.77-4.43-3.94-.13-.17-1.06-1.41-1.06-2.69s.67-1.91.91-2.17c.24-.26.53-.33.71-.33.18 0 .35 0 .5.01.16.01.37-.06.58.44.21.5.73 1.77.79 1.9.06.13.1.28.02.44-.08.17-.12.28-.24.42-.12.14-.26.31-.37.42-.12.12-.25.26-.11.5.14.24.63 1.04 1.35 1.68.93.83 1.71 1.09 1.95 1.21.24.12.38.1.53-.06.14-.17.61-.71.77-.95.16-.24.33-.2.55-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.58-.18 1.26z"/>
                </svg>
                {lang === 'fr' ? 'Envoyer via WhatsApp' : 'Send via WhatsApp'}
              </button>

              <button
                type="button"
                className="btn btn-email-submit"
                onClick={handleSendEmail}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {lang === 'fr' ? 'Envoyer par Email' : 'Send via Email'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
