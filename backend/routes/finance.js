// routes/finance.js — admin-only sponsor/ad spend tracking
// Revenue, COGS and return-delivery-cost are computed client-side from orders the admin
// already loads (see frontend/src/components/AdminFinance.jsx) — ad spend is the one
// figure that has no other source of truth, so it needs real persistence here.
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// GET /api/finance/ad-spend — list all entries [PROTECTED ADMIN ONLY]
router.get('/ad-spend', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM ad_spend ORDER BY start_date DESC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/finance/ad-spend — record a sponsor/ad spend entry [PROTECTED ADMIN ONLY]
router.post('/ad-spend', requireAuth, async (req, res, next) => {
  try {
    const { start_date, end_date, amount, note = '' } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required (YYYY-MM-DD).' });
    }
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: 'start_date must be on or before end_date.' });
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return res.status(400).json({ error: 'amount must be a non-negative number.' });
    }

    const [result] = await db.query(
      'INSERT INTO ad_spend (start_date, end_date, amount, note) VALUES (?, ?, ?, ?)',
      [start_date, end_date, amountNum, String(note || '').trim()]
    );

    const [rows] = await db.query('SELECT * FROM ad_spend WHERE id = ?', [result.insertId]);
    const created = rows[0];
    logAudit(req, {
      event: 'ad_spend.create',
      actor: req.user.username,
      detail: `id=${created.id} amount=${amountNum} range=${start_date}..${end_date}`,
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/finance/ad-spend/:id — remove an entry [PROTECTED ADMIN ONLY]
router.delete('/ad-spend/:id', requireAuth, async (req, res, next) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM ad_spend WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Ad spend entry not found' });

    await db.query('DELETE FROM ad_spend WHERE id = ?', [req.params.id]);
    logAudit(req, { event: 'ad_spend.delete', actor: req.user.username, detail: `id=${existing.id}` });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
