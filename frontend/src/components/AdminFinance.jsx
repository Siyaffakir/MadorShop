import { useState, useEffect, useMemo } from 'react';
import { getAdSpend, addAdSpend, deleteAdSpend, createRemittance, deleteRemittance } from '../api';
import { REMITTANCE_ELIGIBLE_STATUSES, paidOrderIdSet, orderSubtotal } from '../utils/remittanceStats';
import { useLanguage } from '../context/LanguageContext';

function formatDZD(n) {
  return `${Math.round(n || 0).toLocaleString('en-US')} DZD`;
}

function toDateInputValue(d) {
  return d.toISOString().slice(0, 10);
}

// Orders in these statuses are treated as realized sales for revenue/COGS purposes —
// same convention as the KPI cards on the main dashboard tab, and the same set that
// makes an order eligible to be marked as paid by its delivery agency.
const REVENUE_STATUSES = REMITTANCE_ELIGIBLE_STATUSES;

export default function AdminFinance({ orders, agencies, remittances, onRemittanceChange }) {
  const { lang, dict } = useLanguage();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [endDate, setEndDate] = useState(() => toDateInputValue(new Date()));

  const [adSpend, setAdSpend] = useState([]);
  const [loadingAdSpend, setLoadingAdSpend] = useState(true);
  const [adForm, setAdForm] = useState({ start_date: '', end_date: '', amount: '', note: '' });
  const [adStatus, setAdStatus] = useState({ state: 'idle', message: '' });

  function loadAdSpend() {
    setLoadingAdSpend(true);
    return getAdSpend()
      .then(setAdSpend)
      .catch(() => setAdStatus({ state: 'error', message: lang === 'ar' ? 'فشل تحميل سجل مصاريف الإعلانات.' : 'Échec de chargement des dépenses publicitaires.' }))
      .finally(() => setLoadingAdSpend(false));
  }

  useEffect(() => {
    loadAdSpend();
  }, []);

  const inRange = (dateStr) => dateStr >= startDate && dateStr <= endDate;

  const summary = useMemo(() => {
    let revenue = 0;
    let cogs = 0;
    let returnDeliveryCost = 0;
    let missingCostCount = 0;
    const missingCostNames = new Set();

    (orders || []).forEach((o) => {
      const orderDate = String(o.created_at || '').slice(0, 10);
      if (!inRange(orderDate)) return;

      const items = Array.isArray(o.items) ? o.items : [];

      if (REVENUE_STATUSES.has(o.status)) {
        items.forEach((it) => {
          const qty = it.quantity || 1;
          revenue += (it.price || 0) * qty;
          cogs += (it.buying_price || 0) * qty;
          if (!it.buying_price) {
            missingCostCount += 1;
            missingCostNames.add(it.name);
          }
        });
      } else if (o.status === 'Returned') {
        // Package was shipped but refused/returned — the courier fee for that failed
        // attempt is a cost the merchant absorbs (the client never paid it via COD).
        returnDeliveryCost += o.delivery_fee || 0;
      }
    });

    const adSpendTotal = adSpend.reduce((sum, entry) => {
      const overlaps = entry.start_date <= endDate && entry.end_date >= startDate;
      return overlaps ? sum + entry.amount : sum;
    }, 0);

    const netProfit = revenue - cogs - returnDeliveryCost - adSpendTotal;

    return {
      revenue,
      cogs,
      returnDeliveryCost,
      adSpendTotal,
      netProfit,
      missingCostCount,
      missingCostNames: Array.from(missingCostNames),
    };
  }, [orders, adSpend, startDate, endDate]);

  async function handleAddAdSpend(e) {
    e.preventDefault();
    if (!adForm.start_date || !adForm.end_date || !adForm.amount) {
      setAdStatus({
        state: 'error',
        message: lang === 'ar' ? 'تاريخ البدء والانتهاء والمبلغ حقول مطلوبة.' : 'La date de début, de fin et le montant sont requis.',
      });
      return;
    }
    setAdStatus({ state: 'loading', message: '' });
    try {
      await addAdSpend(adForm.start_date, adForm.end_date, Number(adForm.amount), adForm.note);
      setAdForm({ start_date: '', end_date: '', amount: '', note: '' });
      await loadAdSpend();
      setAdStatus({ state: 'success', message: lang === 'ar' ? 'تمت إضافة مصروف الإعلان بنجاح.' : 'Dépense pub ajoutée.' });
    } catch (err) {
      setAdStatus({ state: 'error', message: err?.response?.data?.error || (lang === 'ar' ? 'فشل إضافة المصروف.' : 'Échec d’ajout.') });
    }
  }

  async function handleDeleteAdSpend(id) {
    const confirmMsg = lang === 'ar' ? 'حذف هذا المصروف الإعلاني؟' : 'Supprimer cette dépense publicitaire ?';
    if (!window.confirm(confirmMsg)) return;
    await deleteAdSpend(id);
    loadAdSpend();
  }

  // --- Order pipeline: coming (Pending) vs confirmed (Confirmed/Shipped/Delivered),
  // and within confirmed, awaiting agency payment vs already paid via the ledger below. ---
  const incomingOrders = (orders || []).filter((o) => o.status === 'Pending');
  const confirmedOrders = (orders || []).filter((o) => REMITTANCE_ELIGIBLE_STATUSES.has(o.status));
  const paidIds = useMemo(() => paidOrderIdSet(remittances), [remittances]);
  const awaitingPayment = confirmedOrders.filter((o) => !paidIds.has(o.id));

  const agencyById = useMemo(() => new Map((agencies || []).map((a) => [a.id, a.name])), [agencies]);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [remitForm, setRemitForm] = useState({ agency_id: '', amount: '', note: '' });
  const [remitStatus, setRemitStatus] = useState({ state: 'idle', message: '' });

  function toggleSelect(orderId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  const selectedSubtotal = awaitingPayment
    .filter((o) => selectedIds.has(o.id))
    .reduce((sum, o) => sum + orderSubtotal(o), 0);

  async function handleCreateRemittance(e) {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setRemitStatus({ state: 'error', message: lang === 'ar' ? 'يرجى تحديد طلبية واحدة على الأقل أدناه.' : 'Sélectionnez au moins une commande ci-dessous.' });
      return;
    }
    if (!remitForm.agency_id) {
      setRemitStatus({ state: 'error', message: lang === 'ar' ? 'يرجى اختيار الوكالة المسددة.' : 'Choisissez l’agence qui a payé.' });
      return;
    }
    const amount = remitForm.amount !== '' ? Number(remitForm.amount) : selectedSubtotal;
    setRemitStatus({ state: 'loading', message: '' });
    try {
      await createRemittance(Number(remitForm.agency_id), Array.from(selectedIds), amount, remitForm.note);
      setSelectedIds(new Set());
      setRemitForm({ agency_id: '', amount: '', note: '' });
      await onRemittanceChange();
      setRemitStatus({ state: 'success', message: lang === 'ar' ? 'تم التسجيل — تم تحديد هذه الطلبات كمدفوعة.' : 'Enregistré — ces commandes sont marquées comme payées.' });
    } catch (err) {
      setRemitStatus({ state: 'error', message: err?.response?.data?.error || (lang === 'ar' ? 'فشل تسجيل الدفعة.' : 'Échec d’enregistrement.') });
    }
  }

  async function handleDeleteRemittance(id) {
    const confirmMsg = lang === 'fr'
      ? 'Annuler cette écriture ? Ses commandes redeviendront en attente de paiement.'
      : 'Undo this ledger entry? Its orders will show as awaiting payment again.';
    if (!window.confirm(confirmMsg)) return;
    await deleteRemittance(id);
    onRemittanceChange();
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {lang === 'ar' ? 'نظرة عامة على المالية' : 'Aperçu Financier'}
        </h3>
        <p style={{ fontSize: '12.5px', color: '#71717a', marginTop: '6px' }}>
          {lang === 'fr'
            ? 'Le chiffre d’affaires et le coût des marchandises comptabilisent les commandes Confirmées / Expédiées / Livrées de la période. Les frais de livraison ne sont déduits en charge que sur les commandes Retournées.'
            : 'Revenue & cost of goods count Confirmed / Shipped / Delivered orders in range. Delivery fee is only counted as a cost for Returned orders — for confirmed/delivered orders the client covers it via COD.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>{lang === 'ar' ? 'من' : 'Du'}</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>{lang === 'ar' ? 'إلى' : 'Au'}</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {summary.missingCostCount > 0 && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            fontSize: '12.5px',
            marginBottom: '16px',
          }}
        >
          ⚠ {summary.missingCostCount} {lang === 'ar' ? 'منتج(ات) مباعة دون تحديد سعر الشراء' : 'article(s) vendu(s) sans prix d’achat défini'}
          {summary.missingCostNames.length > 0 && ` (${summary.missingCostNames.slice(0, 5).join(', ')}${summary.missingCostNames.length > 5 ? ', ...' : ''})`}
          {lang === 'fr'
            ? ' — le bénéfice affiché peut être surestimé. Définissez les prix d’achat dans le Catalogue.'
            : ' — profit below may be overstated. Set buying prices in Manage Catalog for accurate figures going forward.'}
        </div>
      )}

      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-card-title">{lang === 'ar' ? 'إجمالي المداخيل' : 'Chiffre d’Affaires'}</div>
          <div className="stat-card-value" style={{ fontSize: '20px' }}>{formatDZD(summary.revenue)}</div>
          <div className="stat-card-sub">{lang === 'ar' ? 'مؤكدة / مشحونة / مسلّمة' : 'Confirmées / Expédiées / Livrées'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">{lang === 'ar' ? 'تكلفة شراء السلع' : 'Coût d’Achat Marchandises'}</div>
          <div className="stat-card-value" style={{ fontSize: '20px', color: '#b45309' }}>
            −{formatDZD(summary.cogs)}
          </div>
          <div className="stat-card-sub">{lang === 'ar' ? 'سعر الشراء × الكمية المباعة' : 'Prix d’achat × quantité vendue'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">{lang === 'ar' ? 'تكلفة شحن المرتجعات' : 'Frais Retours Absorbés'}</div>
          <div className="stat-card-value" style={{ fontSize: '20px', color: '#b45309' }}>
            −{formatDZD(summary.returnDeliveryCost)}
          </div>
          <div className="stat-card-sub">{lang === 'ar' ? 'رسوم الشحن المدفوعة على الطرود المرتجعة' : 'Frais transporteur sur colis retournés'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">{lang === 'ar' ? 'مصاريف الإعلانات (سبونسور)' : 'Dépenses Publicitaires'}</div>
          <div className="stat-card-value" style={{ fontSize: '20px', color: '#b45309' }}>
            −{formatDZD(summary.adSpendTotal)}
          </div>
          <div className="stat-card-sub">{lang === 'ar' ? 'المصاريف خلال هذه الفترة' : 'Dépenses sur cette période'}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '18px 20px',
          borderRadius: '10px',
          background: summary.netProfit >= 0 ? '#f4fbf6' : '#fef2f2',
          border: `1px solid ${summary.netProfit >= 0 ? '#c7eed5' : '#fecaca'}`,
        }}
      >
        <div style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a' }}>
          {lang === 'ar' ? 'صافي الأرباح' : 'Bénéfice Net'} ({startDate} → {endDate})
        </div>
        <div style={{ fontSize: '28px', fontWeight: '900', color: summary.netProfit >= 0 ? '#1e7a46' : '#b91c1c' }}>
          {formatDZD(summary.netProfit)}
        </div>
      </div>

      {/* Order Pipeline: what's still coming in vs what's already confirmed */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
          {lang === 'ar' ? 'مراحل الطلبات والمستحقات' : 'Tunnel des Commandes'}
        </h3>
        <p style={{ fontSize: '12.5px', color: '#71717a', marginBottom: '12px' }}>
          {lang === 'fr'
            ? 'Les commandes "En attente" ne sont pas encore confirmées. Une fois confirmées/expédiées/livrées, le transporteur détient les espèces jusqu’au versement.'
            : '"Coming" orders haven\'t been confirmed yet — no money involved. Once confirmed/shipped/delivered, the agency is holding the client\'s cash until they remit it to you below.'}
        </p>
        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-card-title">{lang === 'ar' ? 'قيد الانتظار' : 'À Venir (En attente)'}</div>
            <div className="stat-card-value">{incomingOrders.length}</div>
            <div className="stat-card-sub">{lang === 'ar' ? 'طلبات غير مؤكدة — لا توجد تكاليف بعد' : 'Non confirmées — pas d’argent engagé'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">{lang === 'ar' ? 'بانتظار سداد الوكالة' : 'En Attente de Paiement Agence'}</div>
            <div className="stat-card-value" style={{ color: '#b45309' }}>{awaitingPayment.length}</div>
            <div className="stat-card-sub">{formatDZD(awaitingPayment.reduce((s, o) => s + orderSubtotal(o), 0))} {lang === 'ar' ? 'مستحقة لك' : 'qui vous sont dus'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">{lang === 'ar' ? 'المبالغ المحصلة' : 'Paiement Encaissé'}</div>
            <div className="stat-card-value" style={{ color: '#1e7a46' }}>{confirmedOrders.length - awaitingPayment.length}</div>
            <div className="stat-card-sub">{lang === 'ar' ? 'مؤكدة ومسجلة في السجل أدناه' : 'Confirmé par écriture de registre'}</div>
          </div>
        </div>
      </div>

      {/* Awaiting Agency Payment — select orders, then record the agency's payout as one ledger entry */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
          {lang === 'fr' ? 'En Attente de Paiement Agence' : 'Awaiting Agency Payment'} ({awaitingPayment.length})
        </h3>

        {awaitingPayment.length === 0 ? (
          <div className="empty-state">
            {lang === 'ar' ? 'لا توجد مستحقات معلقة — جميع الطلبات المؤكدة مسجلة كمدفوعة.' : 'Rien en attente — chaque commande confirmée a son paiement enregistré.'}
          </div>
        ) : (
          <>
            <div className="table-scroll" style={{ marginBottom: '12px' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}></th>
                    <th>{lang === 'ar' ? 'رقم الطلب' : 'N° Commande'}</th>
                    <th>{lang === 'ar' ? 'العميل' : 'Client'}</th>
                    <th>{lang === 'ar' ? 'الوكالة' : 'Agence'}</th>
                    <th>{lang === 'ar' ? 'الحالة' : 'Statut'}</th>
                    <th>{lang === 'ar' ? 'المبلغ المستحق' : 'Sous-total Dû'}</th>
                  </tr>
                </thead>
                <tbody>
                  {awaitingPayment.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleSelect(o.id)} />
                      </td>
                      <td style={{ fontWeight: '700' }}>#{o.id}</td>
                      <td>{o.full_name}</td>
                      <td>{o.delivery_agency_id ? (agencyById.get(o.delivery_agency_id) || (lang === 'ar' ? 'غير محددة' : 'Inconnue')) : <span style={{ color: '#a1a1aa' }}>— {lang === 'ar' ? 'لا توجد' : 'aucune'} —</span>}</td>
                      <td>{dict?.admin?.status?.[o.status] || o.status}</td>
                      <td style={{ fontWeight: '700' }}>{formatDZD(orderSubtotal(o))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleCreateRemittance} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>{lang === 'ar' ? 'سددتها الوكالة' : 'Payé par l’Agence'}</label>
                <select
                  value={remitForm.agency_id}
                  onChange={(e) => setRemitForm({ ...remitForm, agency_id: e.target.value })}
                  style={{ minWidth: '180px' }}
                >
                  <option value="">{lang === 'ar' ? 'اختر الوكالة...' : 'Sélectionner l’agence...'}</option>
                  {(agencies || []).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>{lang === 'ar' ? 'المبلغ المستلم (دج)' : 'Montant Reçu (DZD)'}</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={remitForm.amount}
                  onChange={(e) => setRemitForm({ ...remitForm, amount: e.target.value })}
                  placeholder={selectedSubtotal ? String(selectedSubtotal) : 'e.g. 24600'}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>{lang === 'ar' ? 'ملاحظة (اختياري)' : 'Note (optionnelle)'}</label>
                <input
                  type="text"
                  value={remitForm.note}
                  onChange={(e) => setRemitForm({ ...remitForm, note: e.target.value })}
                  placeholder="e.g. Weekly payout"
                />
              </div>
              <button type="submit" className="btn btn-green" disabled={remitStatus.state === 'loading'}>
                {remitStatus.state === 'loading'
                  ? (lang === 'ar' ? 'جارٍ التسجيل...' : 'Enregistrement...')
                  : lang === 'fr'
                    ? `Marquer ${selectedIds.size || ''} Commande(s) comme Payée(s)`
                    : `Mark ${selectedIds.size || ''} Order${selectedIds.size === 1 ? '' : 's'} as Paid`}
              </button>
            </form>
            {remitStatus.message && (
              <p className={`form-msg ${remitStatus.state === 'success' ? 'success' : 'error'}`}>{remitStatus.message}</p>
            )}
          </>
        )}
      </div>

      {/* Agency Payment Ledger — the actual proof-of-payment rows */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
          {lang === 'ar' ? 'سجل دفعات وكالات التوصيل' : 'Registre des Paiements Agences'}
        </h3>
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th>{lang === 'fr' ? 'Agence' : 'Agency'}</th>
                <th>{lang === 'ar' ? 'المبلغ' : 'Montant'}</th>
                <th>{lang === 'ar' ? 'الطلبات المشمولة' : 'Commandes Couvertes'}</th>
                <th>{lang === 'ar' ? 'ملاحظة' : 'Note'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {(remittances || []).map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{String(r.created_at).slice(0, 16)}</td>
                  <td style={{ fontWeight: '700' }}>{agencyById.get(r.agency_id) || (lang === 'fr' ? 'Agence inconnue' : 'Unknown agency')}</td>
                  <td style={{ fontWeight: '700', color: '#1e7a46' }}>{formatDZD(r.amount)}</td>
                  <td>{(r.order_ids || []).map((id) => `#${id}`).join(', ')}</td>
                  <td style={{ color: '#71717a' }}>{r.note || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn danger" onClick={() => handleDeleteRemittance(r.id)}>
                      {lang === 'fr' ? 'Annuler' : 'Undo'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!remittances || remittances.length === 0) && (
            <div className="empty-state">
              {lang === 'fr' ? 'Aucun paiement enregistré pour l’instant.' : 'No payments recorded yet — this is your proof-of-payment ledger.'}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
          {lang === 'fr' ? 'Dépenses Publicitaires / Sponsors' : 'Sponsor / Ad Spend Entries'}
        </h3>

        <form onSubmit={handleAddAdSpend} className="admin-form-grid" style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label>{lang === 'fr' ? 'Date de Début' : 'Start Date'}</label>
            <input
              type="date"
              required
              value={adForm.start_date}
              onChange={(e) => setAdForm({ ...adForm, start_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{lang === 'fr' ? 'Date de Fin' : 'End Date'}</label>
            <input
              type="date"
              required
              value={adForm.end_date}
              onChange={(e) => setAdForm({ ...adForm, end_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{lang === 'ar' ? 'المبلغ (دج)' : 'Montant (DZD)'}</label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={adForm.amount}
              onChange={(e) => setAdForm({ ...adForm, amount: e.target.value })}
              placeholder="e.g. 15000"
            />
          </div>
          <div className="form-group full">
            <label>{lang === 'fr' ? 'Note (optionnelle)' : 'Note (optional)'}</label>
            <input
              type="text"
              value={adForm.note}
              onChange={(e) => setAdForm({ ...adForm, note: e.target.value })}
              placeholder="e.g. Facebook Ads campaign - August"
            />
          </div>
          <div className="form-group full" style={{ marginBottom: 0 }}>
            <button type="submit" className="btn btn-green" disabled={adStatus.state === 'loading'}>
              {adStatus.state === 'loading' ? (lang === 'fr' ? 'Enregistrement...' : 'Saving...') : (lang === 'fr' ? 'Ajouter la Dépense' : 'Add Ad Spend Entry')}
            </button>
          </div>
        </form>

        {adStatus.message && (
          <p className={`form-msg ${adStatus.state === 'success' ? 'success' : 'error'}`}>{adStatus.message}</p>
        )}

        {loadingAdSpend ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span>{lang === 'fr' ? 'Chargement des dépenses pub...' : 'Loading ad spend...'}</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{lang === 'fr' ? 'Période' : 'Date Range'}</th>
                  <th>{lang === 'fr' ? 'Montant' : 'Amount'}</th>
                  <th>{lang === 'fr' ? 'Note' : 'Note'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'fr' ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {adSpend.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.start_date} → {entry.end_date}</td>
                    <td style={{ fontWeight: '700' }}>{formatDZD(entry.amount)}</td>
                    <td style={{ color: '#71717a' }}>{entry.note || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="icon-btn danger" onClick={() => handleDeleteAdSpend(entry.id)}>
                        {lang === 'ar' ? 'حذف' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {adSpend.length === 0 && (
              <div className="empty-state">
                {lang === 'fr' ? 'Aucune dépense publicitaire enregistrée.' : 'No ad spend entries recorded yet.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

