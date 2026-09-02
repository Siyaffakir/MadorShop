// components/AdminChangePasswordModal.jsx — Change Admin Password Modal
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function AdminChangePasswordModal({ isOpen, onClose }) {
  const { changePassword } = useAuth();
  const { lang } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ loading: false, error: '', success: '' });

    if (newPassword !== confirmPassword) {
      setStatus({
        loading: false,
        error: lang === 'ar' ? 'كلمات المرور الجديدة غير متطابقة.' : 'Les nouveaux mots de passe ne correspondent pas.',
        success: '',
      });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({
        loading: false,
        error: lang === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Le mot de passe doit comporter au moins 6 caractères.',
        success: '',
      });
      return;
    }

    setStatus({ loading: true, error: '', success: '' });
    try {
      await changePassword(currentPassword, newPassword);
      setStatus({
        loading: false,
        error: '',
        success: lang === 'ar'
          ? 'تم تحديث كلمة المرور بنجاح! سيطلب منك إدخالها عند تسجيل الدخول القادم.'
          : 'Mot de passe mis à jour avec succès !',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setStatus({ loading: false, error: '', success: '' });
      }, 1500);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || (lang === 'ar' ? 'فشل تحديث كلمة المرور.' : 'Échec de mise à jour du mot de passe.');
      setStatus({ loading: false, error: msg, success: '' });
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '28px 24px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
            {lang === 'ar' ? 'تعديل كلمة مرور المشرف' : 'Modifier le Mot de Passe Admin'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#71717a',
              padding: '4px',
              lineHeight: 1,
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {status.error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {status.error}
          </div>
        )}

        {status.success && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
              fontWeight: '600',
            }}
          >
            {status.success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#3f3f46',
                marginBottom: '4px',
              }}
            >
              {lang === 'ar' ? 'كلمة المرور الحالية' : 'Mot de Passe Actuel'}
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={lang === 'ar' ? 'أدخل كلمة المرور الحالية' : 'Saisir le mot de passe actuel'}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13.5px',
                borderRadius: '6px',
                border: '1px solid #d4d4d8',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#3f3f46',
                marginBottom: '4px',
              }}
            >
              {lang === 'ar' ? 'كلمة المرور الجديدة (6 أحرف كحد أدنى)' : 'Nouveau Mot de Passe (min 6 car.)'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={lang === 'ar' ? 'أدخل كلمة مرور قوية' : 'Nouveau mot de passe fort'}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13.5px',
                borderRadius: '6px',
                border: '1px solid #d4d4d8',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#3f3f46',
                marginBottom: '4px',
              }}
            >
              {lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirmer le Nouveau Mot de Passe'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={lang === 'ar' ? 'أعد إدخال كلمة المرور الجديدة' : 'Confirmez le nouveau mot de passe'}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13.5px',
                borderRadius: '6px',
                border: '1px solid #d4d4d8',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              type="submit"
              disabled={status.loading}
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: '6px',
                background: '#09090b',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '13.5px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {status.loading
                ? (lang === 'ar' ? 'جارٍ التحديث...' : 'Mise à jour...')
                : (lang === 'ar' ? 'تحديث كلمة المرور' : 'Mettre à Jour le Mot de Passe')}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 16px',
                borderRadius: '6px',
                background: '#f4f4f5',
                color: '#18181b',
                fontWeight: '600',
                fontSize: '13.5px',
                border: '1px solid #e4e4e7',
                cursor: 'pointer',
              }}
            >
              {lang === 'ar' ? 'إلغاء' : 'Annuler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

