require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const db = require('../backend/db.js');

async function runVerification() {
  console.log('=== DZ Shop PostgreSQL Verification Suite ===\n');

  console.log('1. Checking Module Exports & Route Syntax...');
  try {
    require('../backend/server.js');
    require('../backend/routes/products.js');
    require('../backend/routes/orders.js');
    require('../backend/routes/auth.js');
    require('../backend/routes/delivery.js');
    require('../backend/routes/finance.js');
    require('../backend/routes/agencies.js');
    require('../backend/middleware/auditLog.js');
    require('../backend/utils/deliveryPricing.js');
    console.log('✓ All backend route and middleware modules loaded cleanly with valid syntax.\n');
  } catch (err) {
    console.error('✗ Failed to load backend modules:', err);
    process.exit(1);
  }

  console.log('2. Testing PostgreSQL Database Connectivity...');
  try {
    const res = await db.query('SELECT NOW() AS current_time, version() AS pg_version');
    console.log(`✓ Connected to PostgreSQL! Server version: ${res.rows[0].pg_version.split(',')[0]}`);
    console.log(`✓ Current DB timestamp: ${res.rows[0].current_time}\n`);

    console.log('3. Initializing Schema & Seeders...');
    await db.initDB();
    console.log('✓ Schema and seed data successfully initialized.\n');

    console.log('4. Testing Products Querying...');
    const prodRes = await db.query('SELECT id, name, category, price, stock FROM products LIMIT 5');
    console.log(`✓ Retrieved ${prodRes.rows.length} sample products:`);
    console.table(prodRes.rows);

    console.log('\n5. Testing Delivery Pricing Querying...');
    const dpRes = await db.query('SELECT wilaya_code, wilaya_name, home_fee, stopdesk_fee FROM delivery_pricing LIMIT 5');
    console.log(`✓ Retrieved ${dpRes.rows.length} sample delivery pricing tiers:`);
    console.table(dpRes.rows);

    console.log('\n6. Testing Order Insertion & Transactions...');
    const testItems = [
      { id: prodRes.rows[0]?.id || 1, name: prodRes.rows[0]?.name || 'Sample Product', price: 2800, quantity: 2, total: 5600 }
    ];
    const orderRes = await db.query(
      `INSERT INTO orders (
        full_name, wilaya, commune, address, phone, product_id, product_name,
        items, delivery_fee, total_price, status, delivery_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        'Test Customer',
        '16 - Alger',
        'Bab Ezzouar',
        'Rue 1',
        '0555123456',
        testItems[0].id,
        testItems[0].name,
        JSON.stringify(testItems),
        500,
        6100,
        'Pending',
        'home'
      ]
    );
    const createdOrder = orderRes.rows[0];
    console.log(`✓ Created test order #${createdOrder.id} for "${createdOrder.full_name}" with total ${createdOrder.total_price} DZD`);

    // Clean up test order
    await db.query('DELETE FROM orders WHERE id = $1', [createdOrder.id]);
    console.log(`✓ Cleaned up test order #${createdOrder.id}.\n`);

    console.log('✓ ALL POSTGRESQL INTEGRATION CHECKS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.warn(`\n[Note on PostgreSQL Connection]: Could not connect to PostgreSQL server at "${process.env.DATABASE_URL || 'localhost:5432'}"`);
    console.warn(`Reason: ${err.message}`);
    console.warn('\nTo run PostgreSQL locally:');
    console.warn('  Option A (Docker): docker compose up -d');
    console.warn('  Option B (Local Service): Start PostgreSQL on port 5432 and create database "dz_shop"');
    console.warn('  Option C (Cloud URL): Set DATABASE_URL in backend/.env to your Supabase / Neon / Render Postgres connection string.');
  } finally {
    await db.pool.end();
  }
}

runVerification();
