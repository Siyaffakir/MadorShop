// routes/agencies.js — delivery agencies & COD remittance ledger [ADMIN ONLY]
//
// Agencies collect cash-on-delivery from customers and remit it to the merchant later,
// in batches, not per order. A remittance row is the real ledger entry — "Agency X paid
// me Y DZD for these orders on this date" — so the admin has proof, not just a computed
// total. An order not yet covered by any remittance is still owed by its agency.
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

const REMITTANCE_ELIGIBLE_STATUSES = new Set(['Confirmed', 'Shipped', 'Delivered']);

// GET /api/agencies — list delivery agencies
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM delivery_agencies ORDER BY name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/agencies — add a delivery agency
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Agency name is required.' });

    try {
      const [result] = await db.query('INSERT INTO delivery_agencies (name) VALUES (?)', [name]);
      const [createdRows] = await db.query('SELECT * FROM delivery_agencies WHERE id = ?', [result.insertId]);
      const created = createdRows[0];
      logAudit(req, { event: 'agency.create', actor: req.user.username, detail: `id=${created.id} name="${name}"` });
      res.status(201).json(created);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || String(err.message).includes('Duplicate entry')) {
        return res.status(400).json({ error: 'An agency with this name already exists.' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/agencies/:id — remove an agency (blocked if orders still reference it)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM delivery_agencies WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Agency not found' });

    const [inUseRows] = await db.query('SELECT COUNT(*) AS c FROM orders WHERE delivery_agency_id = ?', [req.params.id]);
    const inUse = inUseRows[0].c;
    if (inUse > 0) {
      return res.status(400).json({
        error: `Cannot delete "${existing.name}" — ${inUse} order(s) are still assigned to it. Reassign them first.`,
      });
    }

    await db.query('DELETE FROM delivery_agencies WHERE id = ?', [req.params.id]);
    logAudit(req, { event: 'agency.delete', actor: req.user.username, detail: `id=${existing.id} name="${existing.name}"` });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/agencies/remittances — full ledger, each entry with the order ids it covers
router.get('/remittances', requireAuth, async (req, res, next) => {
  try {
    const [remittances] = await db.query('SELECT * FROM agency_remittances ORDER BY created_at DESC');
    const [orderLinks] = await db.query('SELECT remittance_id, order_id FROM agency_remittance_orders');

    const ordersByRemittance = new Map();
    orderLinks.forEach((link) => {
      if (!ordersByRemittance.has(link.remittance_id)) ordersByRemittance.set(link.remittance_id, []);
      ordersByRemittance.get(link.remittance_id).push(link.order_id);
    });

    res.json(remittances.map((r) => ({ ...r, order_ids: ordersByRemittance.get(r.id) || [] })));
  } catch (err) {
    next(err);
  }
});

// POST /api/agencies/remittances — bulk "agency paid me for these orders" ledger entry
router.post('/remittances', requireAuth, async (req, res, next) => {
  try {
    const { agency_id, order_ids, amount, note = '' } = req.body;

    const [agencyRows] = agency_id ? await db.query('SELECT * FROM delivery_agencies WHERE id = ?', [agency_id]) : [[]];
    const agency = agencyRows[0];
    if (!agency) return res.status(400).json({ error: 'A valid agency_id is required.' });

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ error: 'order_ids must be a non-empty array.' });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return res.status(400).json({ error: 'amount must be a non-negative number.' });
    }

    // Validate every order: must exist, be remittance-eligible, and not already covered
    const [coveredRows] = await db.query('SELECT order_id FROM agency_remittance_orders');
    const alreadyCovered = new Set(coveredRows.map((r) => r.order_id));

    for (const orderId of order_ids) {
      const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      const order = orderRows[0];
      if (!order) return res.status(404).json({ error: `Order #${orderId} not found` });
      if (!REMITTANCE_ELIGIBLE_STATUSES.has(order.status)) {
        return res.status(400).json({
          error: `Order #${orderId} is "${order.status}" — only Confirmed, Shipped or Delivered orders can be marked as paid.`,
        });
      }
      if (alreadyCovered.has(Number(orderId))) {
        return res.status(400).json({ error: `Order #${orderId} is already covered by another remittance entry.` });
      }
    }

    const created = await db.transaction(async (conn) => {
      const [insertRes] = await conn.query(
        'INSERT INTO agency_remittances (agency_id, amount, note) VALUES (?, ?, ?)',
        [agency_id, amountNum, String(note || '').trim()]
      );
      const remittanceId = insertRes.insertId;

      for (const orderId of order_ids) {
        await conn.query('INSERT INTO agency_remittance_orders (remittance_id, order_id) VALUES (?, ?)', [
          remittanceId,
          orderId,
        ]);
      }

      const [remRows] = await conn.query('SELECT * FROM agency_remittances WHERE id = ?', [remittanceId]);
      return remRows[0];
    });

    logAudit(req, {
      event: 'agency_remittance.create',
      actor: req.user.username,
      detail: `id=${created.id} agency="${agency.name}" amount=${amountNum} orders=${order_ids.join(',')}`,
    });

    res.status(201).json({ ...created, order_ids });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/agencies/remittances/:id — undo a ledger entry (orders become unpaid again)
router.delete('/remittances/:id', requireAuth, async (req, res, next) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM agency_remittances WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Remittance entry not found' });

    await db.transaction(async (conn) => {
      await conn.query('DELETE FROM agency_remittance_orders WHERE remittance_id = ?', [req.params.id]);
      await conn.query('DELETE FROM agency_remittances WHERE id = ?', [req.params.id]);
    });

    logAudit(req, { event: 'agency_remittance.delete', actor: req.user.username, detail: `id=${existing.id}` });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
