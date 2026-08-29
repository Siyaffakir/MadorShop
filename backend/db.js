// db.js — MySQL connection, schema setup & migrations
require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let poolConfig = {
  decimalNumbers: true,
  waitForConnections: true,
  connectionLimit: process.env.VERCEL ? 5 : 20,
  queueLimit: 0,
};

const shouldUseSSL =
  process.env.MYSQL_SSL === 'true' ||
  process.env.DB_SSL === 'true' ||
  (process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.includes('ssl=') ||
      process.env.DATABASE_URL.includes('sslmode=') ||
      process.env.DATABASE_URL.includes('tidbcloud.com') ||
      process.env.DATABASE_URL.includes('psdb.cloud') ||
      process.env.DATABASE_URL.includes('aivencloud.com') ||
      process.env.DATABASE_URL.includes('neon.tech') ||
      process.env.DATABASE_URL.includes('supabase.co')));

if (process.env.DATABASE_URL) {
  // Parse DATABASE_URL or pass as uri
  try {
    const url = new URL(process.env.DATABASE_URL);
    poolConfig = {
      ...poolConfig,
      host: url.hostname || 'localhost',
      port: parseInt(url.port, 10) || 3306,
      user: decodeURIComponent(url.username || 'root'),
      password: decodeURIComponent(url.password || ''),
      database: url.pathname.replace(/^\//, '') || 'dz_shop',
    };
    if (shouldUseSSL) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  } catch (err) {
    poolConfig.uri = process.env.DATABASE_URL;
    if (shouldUseSSL) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  }
} else {
  poolConfig = {
    ...poolConfig,
    host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'dz_shop',
  };
  if (shouldUseSSL) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = mysql.createPool(poolConfig);

/**
 * Execute a parameterized query against the MySQL pool.
 * @param {string} sql - SQL query text with ? placeholders
 * @param {Array} [params] - Query parameters
 * @returns {Promise<[any, any]>} [rows, fields]
 */
async function query(sql, params) {
  const start = Date.now();
  const res = await pool.query(sql, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('[MySQL SQL]', { sql, params, duration: `${duration}ms` });
  }
  return res;
}

/**
 * Execute a multi-statement transaction with automatic beginTransaction, commit, and rollback.
 * @param {function(import('mysql2/promise').PoolConnection): Promise<any>} callback
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Initialize MySQL tables, indexes, and seed initial data.
 */
async function initDB() {
  console.log('[MySQL] Connecting and initializing schema...');

  // 1. Create base tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(12, 2) NOT NULL,
      buying_price DECIMAL(12, 2) DEFAULT 0,
      category VARCHAR(100) NOT NULL,
      stock INT DEFAULT 0,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_products_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      wilaya VARCHAR(100) NOT NULL,
      commune VARCHAR(100) DEFAULT '',
      address TEXT,
      phone VARCHAR(50) NOT NULL,
      product_id INT NOT NULL DEFAULT 0,
      product_name VARCHAR(255) NOT NULL DEFAULT '',
      items JSON,
      delivery_fee DECIMAL(12, 2) DEFAULT 0,
      total_price DECIMAL(12, 2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Pending',
      delivery_agency_id INT,
      tracking_tag VARCHAR(100) DEFAULT '',
      delivery_type VARCHAR(50) DEFAULT 'home',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_orders_status (status),
      INDEX idx_orders_created_at (created_at),
      INDEX idx_orders_delivery_agency (delivery_agency_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      actor VARCHAR(100),
      ip VARCHAR(50),
      success TINYINT DEFAULT 1,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_logs_event (event_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS delivery_pricing (
      wilaya_code INT PRIMARY KEY,
      wilaya_name VARCHAR(100) NOT NULL,
      home_fee DECIMAL(12, 2) NOT NULL,
      stopdesk_fee DECIMAL(12, 2) NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ad_spend (
      id INT AUTO_INCREMENT PRIMARY KEY,
      start_date VARCHAR(50) NOT NULL,
      end_date VARCHAR(50) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS delivery_agencies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agency_remittances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      agency_id INT NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agency_remittance_orders (
      remittance_id INT NOT NULL,
      order_id INT NOT NULL,
      PRIMARY KEY (remittance_id, order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Seed Multi-category catalog if products table is empty
  const [prodCountRows] = await pool.query('SELECT COUNT(*) AS c FROM products');
  if (prodCountRows[0].c === 0) {
    const madorCatalog = [
      // 1. Complément Alimentaire
      {
        name: 'Omega 3 Premium Sauvage 1000mg (90 Gélules)',
        description: 'Huile de poissons sauvages ultra-pure riche en EPA et DHA. Soutient la santé cardiaque, la mémoire et le bien-être général.',
        price: 2800,
        buying_price: 1500,
        category: 'Complément Alimentaire',
        stock: 45,
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Collagène Marin Hydrolysé + Vitamine C & Zinc (300g)',
        description: 'Poudre de collagène marin haute absorption pour raffermir la peau, fortifier les cheveux et régénérer les articulations.',
        price: 4500,
        buying_price: 2500,
        category: 'Complément Alimentaire',
        stock: 30,
        image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Magnésium Bisglycinate Chélaté + Vitamine B6 (60 Gélules)',
        description: 'Formule anti-stress et anti-fatigue à assimilation maximale sans troubles digestifs. Favorise la relaxation et un sommeil profond.',
        price: 2400,
        buying_price: 1300,
        category: 'Complément Alimentaire',
        stock: 50,
        image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80',
      },
      // 2. Pack Complément Alimentaire
      {
        name: 'Pack Vitalité & Immunité 3-en-1 (Multivitamines + Zinc + Vit C)',
        description: 'Cure complète de 60 jours formulée pour renforcer les défenses immunitaires et recharger vos batteries au quotidien.',
        price: 5900,
        buying_price: 3300,
        category: 'Pack Complément Alimentaire',
        stock: 25,
        image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Pack Silhouette & Détox Minceur (Brûleur + Draineur Bio)',
        description: 'Duo synergique composé d’un brûleur de graisses naturel et d’un draineur végétal purifiant pour affiner la silhouette.',
        price: 6400,
        buying_price: 3600,
        category: 'Pack Complément Alimentaire',
        stock: 20,
        image: 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80',
      },
      // 3. Cosmétique Bio et Naturel
      {
        name: 'Sérum Éclat Botanique Figue de Barbarie Bio (30ml)',
        description: 'Huile pure de pépins de figue de barbarie pressée à froid. Élixir anti-âge d’exception pour un teint radieux et lifté.',
        price: 3800,
        buying_price: 2100,
        category: 'Cosmétique Bio et Naturel',
        stock: 35,
        image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Crème Visage Nourrissante Bio Karité & Aloe Vera (50ml)',
        description: 'Soin hydratant quotidien onctueux certifié bio, apaise les tiraillements et protège les peaux sensibles.',
        price: 2600,
        buying_price: 1400,
        category: 'Cosmétique Bio et Naturel',
        stock: 40,
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
      },
      // 4. Pack Cosmétique
      {
        name: 'Pack Soin Visage Royal Bio (Sérum + Crème + Eau de Rose)',
        description: 'Coffret complet rituel beauté bio comprenant un sérum régénérant, une crème éclat et une lotion à la rose de Damas.',
        price: 6900,
        buying_price: 3800,
        category: 'Pack Cosmétique',
        stock: 18,
        image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Pack Rituel Corps & Hammam Bio (Savon Noir + Gommage + Huile Argan)',
        description: 'Coffret spa traditionnel complet pour exfolier la peau en douceur et la laisser satinée, douce et parfumée.',
        price: 4800,
        buying_price: 2600,
        category: 'Pack Cosmétique',
        stock: 22,
        image: 'https://images.unsplash.com/photo-1608248597359-0098f98ecbe1?auto=format&fit=crop&w=800&q=80',
      },
      // 5. Outils de travail
      {
        name: 'Lampe de Bureau LED Tactile avec Chargeur Sans Fil & Bras Articulé',
        description: 'Éclairage de travail professionnel anti-reflets avec variateur d’intensité 5 modes, port USB et support smartphone induction.',
        price: 5200,
        buying_price: 2900,
        category: 'Outils de travail',
        stock: 28,
        image: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Kit Outils de Précision 115-en-1 avec Tournevis Magnétique',
        description: 'Coffret d’outils professionnel pour réparation d’ordinateurs, smartphones, montres, appareils électroniques et petits électroménagers.',
        price: 2900,
        buying_price: 1500,
        category: 'Outils de travail',
        stock: 40,
        image: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Organisateur de Bureau Ergonomique en Métal & Cuir PU',
        description: 'Station de rangement moderne pour ordinateurs portables, tablettes, stylos, bloc-notes et câbles pour un espace de travail net.',
        price: 3400,
        buying_price: 1800,
        category: 'Outils de travail',
        stock: 30,
        image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80',
      },
      // 6. Make up
      {
        name: 'Palette Ombres à Paupières Nude & Glamour 18 Nuances',
        description: 'Fards soyeux mats et métalliques ultra-pigmentés à tenue 24h. Idéale pour des maquillages naturels ou sophistiqués.',
        price: 3600,
        buying_price: 1900,
        category: 'Make up',
        stock: 35,
        image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Fond de Teint Fluide Fini Velouté 24h (30ml)',
        description: 'Couvrance parfaite et formule légère enrichie en agents hydratants sans effet masque ni brillance.',
        price: 3200,
        buying_price: 1700,
        category: 'Make up',
        stock: 40,
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Set de 12 Pinceaux de Maquillage Professionnels avec Pochette',
        description: 'Pinceaux végans ultra-doux haute précision pour le teint, les yeux et le contouring avec étui de voyage élégant.',
        price: 2800,
        buying_price: 1400,
        category: 'Make up',
        stock: 50,
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80',
      },
      // 7. Parfums
      {
        name: 'Oud Royal & Ambre Impérial Extrait de Parfum (100ml)',
        description: 'Parfum d’exception aux notes nobles de bois de oud cambodgien, d’ambre doré, de vanille bourbon et d’épices orientales.',
        price: 8900,
        buying_price: 4800,
        category: 'Parfums',
        stock: 16,
        image: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Rose Privée & Bergamote Eau de Parfum (50ml)',
        description: 'Sillage floral et frais envoûtant mêlant rose de mai, bergamote d’Italie, jasmin sambac et musc blanc cristallin.',
        price: 6800,
        buying_price: 3600,
        category: 'Parfums',
        stock: 22,
        image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
      },
      // 8. Home
      {
        name: 'Diffuseur d’Huiles Essentielles Ultrasonique Effet Flamme 3D',
        description: 'Humidificateur d’air décoratif silencieux créant une ambiance chaleureuse avec lumière apaisante et arrêt automatique.',
        price: 4400,
        buying_price: 2400,
        category: 'Home',
        stock: 26,
        image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Ensemble de 4 Coussins Déco Velours Côtelé Moderne (45x45cm)',
        description: 'Coussins haut de gamme au tissu ultra-doux avec fermeture invisible, parfaits pour sublimer salon et chambre.',
        price: 3900,
        buying_price: 2100,
        category: 'Home',
        stock: 30,
        image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Organisateur Rotatif 360° Moderne Multi-Niveaux',
        description: 'Rangement rotatif élégant et gain de place en acrylique renforcé pour cosmétiques, épices, salle de bain et salon.',
        price: 2700,
        buying_price: 1400,
        category: 'Home',
        stock: 35,
        image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
      },
    ];

    for (const p of madorCatalog) {
      await pool.query(
        `INSERT INTO products (name, description, price, buying_price, category, stock, image)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [p.name, p.description, p.price, p.buying_price, p.category, p.stock, p.image]
      );
    }
    console.log(`[Mador Shopping] Seeded ${madorCatalog.length} products in MySQL.`);
  }

  // 3. Seed default store admin if no admin accounts exist
  const [adminCountRows] = await pool.query('SELECT COUNT(*) AS c FROM admins');
  if (adminCountRows[0].c === 0) {
    const defaultUser = process.env.ADMIN_DEFAULT_USER || 'admin';
    const defaultPass = process.env.ADMIN_DEFAULT_PASS || 'admin123456';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPass, salt);
    await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [defaultUser, hash]);
    console.log(`[Security] Seeded default administrator account: "${defaultUser}" in MySQL.`);
  }

  // 4. Warn if default admin credentials still active
  try {
    const defaultUser = process.env.ADMIN_DEFAULT_USER || 'admin';
    const defaultPass = process.env.ADMIN_DEFAULT_PASS || 'admin123456';
    const [adminRows] = await pool.query('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)', [defaultUser]);
    if (adminRows.length > 0 && bcrypt.compareSync(defaultPass, adminRows[0].password_hash)) {
      console.warn(
        `[Security WARNING] Admin account "${adminRows[0].username}" is still using the default seed password. ` +
          'Change it immediately via the Admin Studio "Change Password" screen.'
      );
    }
  } catch (err) {
    console.error('[Security Check Error]', err.message);
  }

  // 5. Seed per-wilaya delivery pricing if empty
  const [pricingCountRows] = await pool.query('SELECT COUNT(*) AS c FROM delivery_pricing');
  if (pricingCountRows[0].c === 0) {
    const NORTH_HUB = { home: 500, stopdesk: 300 };
    const NORTH_NEAR = { home: 700, stopdesk: 400 };
    const MAJOR_CITY = { home: 750, stopdesk: 450 };
    const HIGH_PLAINS = { home: 900, stopdesk: 550 };
    const SOUTH = { home: 1100, stopdesk: 700 };
    const FAR_SOUTH = { home: 1600, stopdesk: 1100 };

    const TIER_BY_WILAYA_CODE = {
      16: NORTH_HUB,
      9: NORTH_NEAR, 35: NORTH_NEAR, 42: NORTH_NEAR, 10: NORTH_NEAR, 26: NORTH_NEAR, 44: NORTH_NEAR, 2: NORTH_NEAR, 15: NORTH_NEAR, 6: NORTH_NEAR, 34: NORTH_NEAR,
      31: MAJOR_CITY, 25: MAJOR_CITY, 23: MAJOR_CITY, 19: MAJOR_CITY, 5: MAJOR_CITY, 13: MAJOR_CITY, 27: MAJOR_CITY, 29: MAJOR_CITY, 22: MAJOR_CITY, 21: MAJOR_CITY, 18: MAJOR_CITY, 24: MAJOR_CITY, 41: MAJOR_CITY, 4: MAJOR_CITY, 12: MAJOR_CITY, 48: MAJOR_CITY, 46: MAJOR_CITY, 36: MAJOR_CITY, 43: MAJOR_CITY, 40: MAJOR_CITY,
      3: HIGH_PLAINS, 28: HIGH_PLAINS, 14: HIGH_PLAINS, 20: HIGH_PLAINS, 32: HIGH_PLAINS, 45: HIGH_PLAINS, 38: HIGH_PLAINS, 17: HIGH_PLAINS,
      7: SOUTH, 39: SOUTH, 30: SOUTH, 47: SOUTH, 8: SOUTH, 55: SOUTH, 57: SOUTH, 51: SOUTH,
      1: FAR_SOUTH, 11: FAR_SOUTH, 33: FAR_SOUTH, 37: FAR_SOUTH, 49: FAR_SOUTH, 50: FAR_SOUTH, 52: FAR_SOUTH, 53: FAR_SOUTH, 54: FAR_SOUTH, 56: FAR_SOUTH, 58: FAR_SOUTH,
    };

    const wilayaData = require('./data/Wilaya_Of_Algeria.json');
    for (const w of wilayaData) {
      const code = parseInt(w.code, 10);
      const tier = TIER_BY_WILAYA_CODE[code] || MAJOR_CITY;
      await pool.query(
        `INSERT INTO delivery_pricing (wilaya_code, wilaya_name, home_fee, stopdesk_fee)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE wilaya_name = VALUES(wilaya_name)`,
        [code, w.name, tier.home, tier.stopdesk]
      );
    }
    console.log(`[Delivery] Seeded default delivery pricing for ${wilayaData.length} wilayas in MySQL.`);
  }

  console.log('[MySQL] Database initialization completed successfully.');
}

let initPromise = null;
function ensureDbInitialized() {
  if (!initPromise) {
    initPromise = initDB().catch((err) => {
      console.error('[Database Error] Initialization failed:', err.message);
      initPromise = null; // allow retry
      throw err;
    });
  }
  return initPromise;
}

module.exports = {
  pool,
  query,
  transaction,
  initDB,
  ensureDbInitialized,
};

