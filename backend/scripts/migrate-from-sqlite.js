// scripts/migrate-from-sqlite.js — Migrate SQLite data.db into PostgreSQL
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { pool, query, initDB } = require('../db');

async function migrate() {
  const sqliteDbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'data.db');
  if (!fs.existsSync(sqliteDbPath)) {
    console.error(`[Migration] SQLite database file not found at: ${sqliteDbPath}`);
    process.exit(1);
  }

  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (err) {
    console.error('[Migration] better-sqlite3 is required to run the migration script.');
    process.exit(1);
  }

  const sqlite = new Database(sqliteDbPath);
  console.log(`[Migration] Connected to SQLite database: ${sqliteDbPath}`);

  // Ensure PostgreSQL schema exists
  await initDB();

  console.log('[Migration] Migrating tables from SQLite to PostgreSQL...');

  // 1. Admins
  const admins = sqlite.prepare('SELECT * FROM admins').all();
  for (const a of admins) {
    await query(
      `INSERT INTO admins (id, username, password_hash, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         username = EXCLUDED.username,
         password_hash = EXCLUDED.password_hash`,
      [a.id, a.username, a.password_hash, a.created_at]
    );
  }
  if (admins.length > 0) {
    await query(`SELECT setval(pg_get_serial_sequence('admins', 'id'), coalesce(max(id), 1)) FROM admins`);
  }
  console.log(`[Migration] Migrated ${admins.length} admins.`);

  // 2. Products
  const products = sqlite.prepare('SELECT * FROM products').all();
  for (const p of products) {
    await query(
      `INSERT INTO products (id, name, description, price, buying_price, category, stock, image, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         price = EXCLUDED.price,
         buying_price = EXCLUDED.buying_price,
         category = EXCLUDED.category,
         stock = EXCLUDED.stock,
         image = EXCLUDED.image`,
      [p.id, p.name, p.description, p.price, p.buying_price || 0, p.category, p.stock, p.image, p.created_at]
    );
  }
  if (products.length > 0) {
    await query(`SELECT setval(pg_get_serial_sequence('products', 'id'), coalesce(max(id), 1)) FROM products`);
  }
  console.log(`[Migration] Migrated ${products.length} products.`);

  // 3. Delivery Pricing
  try {
    const pricing = sqlite.prepare('SELECT * FROM delivery_pricing').all();
    for (const dp of pricing) {
      await query(
        `INSERT INTO delivery_pricing (wilaya_code, wilaya_name, home_fee, stopdesk_fee, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (wilaya_code) DO UPDATE SET
           wilaya_name = EXCLUDED.wilaya_name,
           home_fee = EXCLUDED.home_fee,
           stopdesk_fee = EXCLUDED.stopdesk_fee,
           updated_at = EXCLUDED.updated_at`,
        [dp.wilaya_code, dp.wilaya_name, dp.home_fee, dp.stopdesk_fee, dp.updated_at]
      );
    }
    console.log(`[Migration] Migrated ${pricing.length} delivery pricing rows.`);
  } catch (e) {
    console.warn('[Migration] Delivery pricing table skipped or error:', e.message);
  }

  // 4. Delivery Agencies
  try {
    const agencies = sqlite.prepare('SELECT * FROM delivery_agencies').all();
    for (const ag of agencies) {
      await query(
        `INSERT INTO delivery_agencies (id, name, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [ag.id, ag.name, ag.created_at]
      );
    }
    if (agencies.length > 0) {
      await query(`SELECT setval(pg_get_serial_sequence('delivery_agencies', 'id'), coalesce(max(id), 1)) FROM delivery_agencies`);
    }
    console.log(`[Migration] Migrated ${agencies.length} delivery agencies.`);
  } catch (e) {
    console.warn('[Migration] Delivery agencies table skipped or error:', e.message);
  }

  // 5. Orders
  const orders = sqlite.prepare('SELECT * FROM orders').all();
  for (const o of orders) {
    let itemsJson = '[]';
    if (o.items) {
      try {
        itemsJson = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
      } catch (err) {
        itemsJson = [];
      }
    }
    await query(
      `INSERT INTO orders (
        id, full_name, wilaya, commune, address, phone, product_id, product_name,
        items, delivery_fee, total_price, status, delivery_agency_id, tracking_tag,
        delivery_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        wilaya = EXCLUDED.wilaya,
        commune = EXCLUDED.commune,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        product_id = EXCLUDED.product_id,
        product_name = EXCLUDED.product_name,
        items = EXCLUDED.items,
        delivery_fee = EXCLUDED.delivery_fee,
        total_price = EXCLUDED.total_price,
        status = EXCLUDED.status,
        delivery_agency_id = EXCLUDED.delivery_agency_id,
        tracking_tag = EXCLUDED.tracking_tag,
        delivery_type = EXCLUDED.delivery_type`,
      [
        o.id,
        o.full_name,
        o.wilaya,
        o.commune || '',
        o.address || '',
        o.phone,
        o.product_id || 0,
        o.product_name || '',
        JSON.stringify(itemsJson),
        o.delivery_fee || 0,
        o.total_price || 0,
        o.status || 'Pending',
        o.delivery_agency_id || null,
        o.tracking_tag || '',
        o.delivery_type || 'home',
        o.created_at,
      ]
    );
  }
  if (orders.length > 0) {
    await query(`SELECT setval(pg_get_serial_sequence('orders', 'id'), coalesce(max(id), 1)) FROM orders`);
  }
  console.log(`[Migration] Migrated ${orders.length} orders.`);

  // 6. Agency Remittances
  try {
    const remittances = sqlite.prepare('SELECT * FROM agency_remittances').all();
    for (const r of remittances) {
      await query(
        `INSERT INTO agency_remittances (id, agency_id, amount, note, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           agency_id = EXCLUDED.agency_id,
           amount = EXCLUDED.amount,
           note = EXCLUDED.note`,
        [r.id, r.agency_id, r.amount, r.note || '', r.created_at]
      );
    }
    if (remittances.length > 0) {
      await query(`SELECT setval(pg_get_serial_sequence('agency_remittances', 'id'), coalesce(max(id), 1)) FROM agency_remittances`);
    }
    console.log(`[Migration] Migrated ${remittances.length} agency remittances.`);
  } catch (e) {
    console.warn('[Migration] Remittances table skipped or error:', e.message);
  }

  // 7. Agency Remittance Orders
  try {
    const remOrders = sqlite.prepare('SELECT * FROM agency_remittance_orders').all();
    for (const ro of remOrders) {
      await query(
        `INSERT INTO agency_remittance_orders (remittance_id, order_id)
         VALUES ($1, $2)
         ON CONFLICT (remittance_id, order_id) DO NOTHING`,
        [ro.remittance_id, ro.order_id]
      );
    }
    console.log(`[Migration] Migrated ${remOrders.length} remittance order links.`);
  } catch (e) {
    console.warn('[Migration] Remittance orders links table skipped or error:', e.message);
  }

  // 8. Ad Spend
  try {
    const adSpend = sqlite.prepare('SELECT * FROM ad_spend').all();
    for (const a of adSpend) {
      await query(
        `INSERT INTO ad_spend (id, start_date, end_date, amount, note, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           amount = EXCLUDED.amount,
           note = EXCLUDED.note`,
        [a.id, a.start_date, a.end_date, a.amount, a.note || '', a.created_at]
      );
    }
    if (adSpend.length > 0) {
      await query(`SELECT setval(pg_get_serial_sequence('ad_spend', 'id'), coalesce(max(id), 1)) FROM ad_spend`);
    }
    console.log(`[Migration] Migrated ${adSpend.length} ad spend entries.`);
  } catch (e) {
    console.warn('[Migration] Ad spend table skipped or error:', e.message);
  }

  // 9. Audit Logs
  try {
    const logs = sqlite.prepare('SELECT * FROM audit_logs').all();
    for (const l of logs) {
      await query(
        `INSERT INTO audit_logs (id, event_type, actor, ip, success, detail, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [l.id, l.event_type, l.actor, l.ip, l.success, l.detail || '', l.created_at]
      );
    }
    if (logs.length > 0) {
      await query(`SELECT setval(pg_get_serial_sequence('audit_logs', 'id'), coalesce(max(id), 1)) FROM audit_logs`);
    }
    console.log(`[Migration] Migrated ${logs.length} audit logs.`);
  } catch (e) {
    console.warn('[Migration] Audit logs table skipped or error:', e.message);
  }

  sqlite.close();
  await pool.end();
  console.log('✓ SQLite to PostgreSQL migration finished successfully.');
}

migrate().catch((err) => {
  console.error('[Migration Error]', err);
  process.exit(1);
});
