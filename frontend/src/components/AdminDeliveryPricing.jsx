import { useState, useEffect } from 'react';
import { getDeliveryPricing, updateDeliveryPricing } from '../api';
import { useLanguage } from '../context/LanguageContext';

export default function AdminDeliveryPricing() {
  const { lang } = useLanguage();
  const [pricing, setPricing] = useState([]);
  const [threshold, setThreshold] = useState(10000);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [savingCode, setSavingCode] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  function load() {
    setLoading(true);
    return getDeliveryPricing()
      .then((data) => {
        setPricing(data.pricing || []);
        setThreshold(data.freeDeliveryThreshold || 10000);
      })
      .catch(() => setStatus({ state: 'error', message: lang === 'ar' ? 'فشل تحميل أسعار التوصيل.' : 'Échec de chargement des tarifs.' }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function draftFor(row) {
    return drafts[row.wilaya_code] || { home_fee: row.home_fee, stopdesk_fee: row.stopdesk_fee };
  }

  // Takes the full row (not just its code) so the untouched field falls back to its real
  // current value instead of an arbitrary default when this is the row's first edit.
  function setDraft(row, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [row.wilaya_code]: { ...draftFor(row), ...prev[row.wilaya_code], [field]: value },
    }));
  }

  async function handleSave(row) {
    const draft = draftFor(row);
    const homeFee = Number(draft.home_fee);
    const stopdeskFee = Number(draft.stopdesk_fee);
    if (!Number.isFinite(homeFee) || homeFee < 0 || !Number.isFinite(stopdeskFee) || stopdeskFee < 0) {
      setStatus({ state: 'error', message: lang === 'ar' ? 'يجب أن تكون الأسعار أرقاماً موجبة.' : 'Les tarifs doivent être des nombres positifs.' });
      return;
    }
    setSavingCode(row.wilaya_code);
    setStatus({ state: 'idle', message: '' });
    try {
      await updateDeliveryPricing(row.wilaya_code, homeFee, stopdeskFee);
      await load();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.wilaya_code];
        return next;
      });
      setStatus({
        state: 'success',
        message: lang === 'ar' ? `تم تحديث أسعار التوصيل لولاية ${row.wilaya_name}.` : `Tarifs mis à jour pour ${row.wilaya_name}.`,
      });
    } catch (err) {
      setStatus({ state: 'error', message: err?.response?.data?.error || (lang === 'ar' ? 'فشل تحديث الأسعار.' : 'Échec de mise à jour.') });
    } finally {
      setSavingCode(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>{lang === 'ar' ? 'جارٍ تحميل أسعار التوصيل...' : 'Chargement des tarifs de livraison...'}</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {lang === 'ar' ? 'أسعار التوصيل حسب الولاية' : 'Tarifs de Livraison par Wilaya'}
        </h3>
        <p style={{ fontSize: '12.5px', color: '#71717a', marginTop: '6px' }}>
          {lang === 'ar'
            ? 'يتم حساب رسوم التوصيل إلى المنزل أو نقطة الاستلام تلقائياً عند تأكيد الطلب. يمكنك تعديل هذه المبالغ حسب اتفاقياتك مع شركات التوصيل.'
            : 'Les frais de livraison à domicile et en point relais sont calculés automatiquement lors du passage de commande. Ajustez ces montants selon vos contrats avec les agences de livraison.'}
        </p>
        {status.message && (
          <p className={`form-msg ${status.state === 'success' ? 'success' : 'error'}`} style={{ marginTop: '8px' }}>
            {status.message}
          </p>
        )}
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>{lang === 'ar' ? 'الرمز' : 'Code'}</th>
              <th>{lang === 'ar' ? 'الولاية' : 'Wilaya'}</th>
              <th>{lang === 'ar' ? 'توصيل للمنزل (دج)' : 'Frais Domicile (DZD)'}</th>
              <th>{lang === 'ar' ? 'نقطة استلام (دج)' : 'Frais Point Relais (DZD)'}</th>
              <th style={{ textAlign: 'right' }}>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((row) => {
              const draft = draftFor(row);
              const dirty = drafts[row.wilaya_code] !== undefined;
              return (
                <tr key={row.wilaya_code}>
                  <td style={{ color: '#71717a' }}>{row.wilaya_code}</td>
                  <td style={{ fontWeight: '700' }}>{row.wilaya_name}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.home_fee}
                      onChange={(e) => setDraft(row, 'home_fee', e.target.value)}
                      style={{ width: '110px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.stopdesk_fee}
                      onChange={(e) => setDraft(row, 'stopdesk_fee', e.target.value)}
                      style={{ width: '110px' }}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="icon-btn"
                      disabled={!dirty || savingCode === row.wilaya_code}
                      onClick={() => handleSave(row)}
                    >
                      {savingCode === row.wilaya_code
                        ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Enregistrement...')
                        : (lang === 'ar' ? 'حفظ' : 'Enregistrer')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

