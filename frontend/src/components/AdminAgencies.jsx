import { useState } from 'react';
import { addAgency, deleteAgency } from '../api';
import { computeAgencyStats } from '../utils/remittanceStats';
import { useLanguage } from '../context/LanguageContext';

function formatDZD(n) {
  return `${Math.round(n || 0).toLocaleString('en-US')} DZD`;
}

export default function AdminAgencies({ orders, agencies, remittances, onChange }) {
  const { lang } = useLanguage();
  const [name, setName] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const stats = computeAgencyStats(orders, agencies, remittances);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await addAgency(name.trim());
      setName('');
      await onChange();
      setStatus({ state: 'success', message: lang === 'ar' ? 'تمت إضافة الوكالة بنجاح.' : 'Agence ajoutée.' });
    } catch (err) {
      setStatus({ state: 'error', message: err?.response?.data?.error || (lang === 'ar' ? 'فشل إضافة الوكالة.' : 'Échec d’ajout.') });
    }
  }

  async function handleDelete(agency) {
    const confirmMsg = lang === 'ar' ? `هل أنت متأكد من حذف "${agency.name}"؟` : `Supprimer "${agency.name}" ?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteAgency(agency.id);
      await onChange();
    } catch (err) {
      alert(err?.response?.data?.error || (lang === 'ar' ? 'فشل حذف الوكالة.' : 'Échec de suppression.'));
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {lang === 'ar' ? 'شركات ووكالات التوصيل' : 'Sociétés & Agences de Livraison'}
        </h3>
        <p style={{ fontSize: '12.5px', color: '#71717a', marginTop: '6px' }}>
          {lang === 'ar'
            ? 'أضف شركات التوصيل التي تتعامل معها (ياليدين، زد آر، إلخ). قم بتعيين الطلبيات لكل وكالة من تفاصيل الطلب وتابع الحسابات في تبويب المالية.'
            : 'Ajoutez les prestataires de livraison (Yalidine, ZR Express, etc.). Assignez les commandes dans le détail commande et suivez les règlements dans l’onglet Finance.'}
        </p>
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={lang === 'ar' ? 'مثال: ياليدين، زد آر إكسبريس، ناقل خاص...' : 'ex: Yalidine, ZR Express, Transporteur Privé...'}
          style={{ flex: '1 1 260px', padding: '10px 14px', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '13px' }}
        />
        <button type="submit" className="btn btn-green" disabled={status.state === 'loading'}>
          {status.state === 'loading' ? (lang === 'ar' ? 'جارٍ الإضافة...' : 'Ajout...') : (lang === 'ar' ? 'إضافة الوكالة' : 'Ajouter l’Agence')}
        </button>
      </form>
      {status.message && (
        <p className={`form-msg ${status.state === 'success' ? 'success' : 'error'}`}>{status.message}</p>
      )}

      <div className="table-scroll" style={{ marginTop: '16px' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{lang === 'ar' ? 'الوكالة' : 'Agence'}</th>
              <th>{lang === 'ar' ? 'الطلبات المدارة' : 'Commandes Gérées'}</th>
              <th>{lang === 'ar' ? 'المرتجعة' : 'Retournées'}</th>
              <th>{lang === 'ar' ? 'بانتظار التحصيل' : 'En Attente de Paiement'}</th>
              <th>{lang === 'ar' ? 'المحصل' : 'Encaissé'}</th>
              <th>{lang === 'ar' ? 'تكلفة المرتجعات' : 'Coût Retours'}</th>
              <th>{lang === 'ar' ? 'الصافي المستلم' : 'Net Reçu'}</th>
              <th style={{ textAlign: 'right' }}>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.agency.id}>
                <td style={{ fontWeight: '700' }}>{s.agency.name}</td>
                <td>{s.ordersHandled}</td>
                <td>
                  {s.returnedCount > 0 ? (
                    <span style={{ color: '#b91c1c', fontWeight: '700' }}>
                      ⚠ {s.returnedCount} ({(s.returnRate * 100).toFixed(0)}%)
                    </span>
                  ) : (
                    '0'
                  )}
                </td>
                <td>
                  {s.pendingCount > 0 ? (
                    <span style={{ color: '#b45309', fontWeight: '700' }}>
                      {formatDZD(s.pendingAmount)} ({s.pendingCount})
                    </span>
                  ) : (
                    <span style={{ color: '#71717a' }}>0 DZD</span>
                  )}
                </td>
                <td style={{ fontWeight: '700', color: '#1e7a46' }}>{formatDZD(s.receivedAmount)}</td>
                <td style={{ color: s.returnCost > 0 ? '#b91c1c' : '#71717a' }}>
                  {s.returnCost > 0 ? `−${formatDZD(s.returnCost)}` : '0 DZD'}
                </td>
                <td style={{ fontWeight: '800' }}>{formatDZD(s.netReceived)}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="icon-btn danger" onClick={() => handleDelete(s.agency)}>
                    {lang === 'ar' ? 'حذف' : 'Supprimer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {stats.length === 0 && (
          <div className="empty-state">
            {lang === 'ar' ? 'لم يتم تكوين أي وكالة توصيل بعد.' : 'Aucune agence de livraison configurée.'}
          </div>
        )}
      </div>
    </div>
  );
}

