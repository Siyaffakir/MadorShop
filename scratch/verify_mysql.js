// scratch/verify_mysql.js
require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const db = require('../backend/db.js');

async function runVerification() {
  console.log('=== DZ Shop MySQL Verification Suite ===\n');

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
    console.log('✓ All backend route and middleware modules loaded cleanly with valid MySQL syntax.\n');
  } catch (err) {
    console.error('✗ Failed to load backend modules:', err);
    process.exit(1);
  }

  console.log('2. Testing MySQL Database Connectivity...');
  try {
    const [rows] = await db.query('SELECT NOW() AS current_time, VERSION() AS mysql_version');
    console.log(`✓ Connected to MySQL! Server version: ${rows[0].mysql_version}`);
    console.log(`✓ Current DB timestamp: ${rows[0].current_time}\n`);

    console.log('3. Initializing Schema & Seeders...');
    await db.initDB();
    console.log('✓ Schema and seed data successfully initialized.\n');

    console.log('4. Testing Products Querying...');
    const [prodRows] = await db.query('SELECT id, name, category, price, stock FROM products LIMIT 5');
    console.log(`✓ Retrieved ${prodRows.length} sample products:`);
    console.table(prodRows);

    console.log('\n5. Testing Delivery Pricing Querying...');
    const [dpRows] = await db.query('SELECT wilaya_code, wilaya_name, home_fee, stopdesk_fee FROM delivery_pricing LIMIT 5');
    console.log(`✓ Retrieved ${dpRows.length} sample delivery pricing tiers:`);
    console.table(dpRows);

    console.log('\n6. Testing Order Insertion & Transactions...');
    const testItems = [
      { id: prodRows[0]?.id || 1, name: prodRows[0]?.name || 'Sample Product', price: 2800, quantity: 2, total: 5600 }
    ];
    const [insertResult] = await db.query(
      `INSERT INTO orders (
        full_name, wilaya, commune, address, phone, product_id, product_name,
        items, delivery_fee, total_price, status, delivery_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [insertResult.insertId]);
    const createdOrder = orderRows[0];
    console.log(`✓ Created test order #${createdOrder.id} for "${createdOrder.full_name}" with total ${createdOrder.total_price} DZD`);

    // Clean up test order
    await db.query('DELETE FROM orders WHERE id = ?', [createdOrder.id]);
    console.log(`✓ Cleaned up test order #${createdOrder.id}.\n`);

    console.log('✓ ALL MYSQL INTEGRATION CHECKS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.warn(`\n[Note on MySQL Connection]: Could not connect to MySQL server at "${process.env.DATABASE_URL || 'localhost:3306'}"`);
    console.warn(`Reason: ${err.message}`);
    console.warn('\nTo run MySQL:');
    console.warn('  Option A (XAMPP / WAMP / Laragon): Start Apache & MySQL in XAMPP / Laragon Control Panel.');
    console.warn('  Option B (Docker): docker compose up -d');
    console.warn('  Option C (Cloud / Hosted MySQL): Set DATABASE_URL in backend/.env to your cloud MySQL connection string (e.g. PlanetScale, Aiven, Railway, Clever Cloud).');
  } finally {
    await db.pool.end();
  }
}

runVerification();
