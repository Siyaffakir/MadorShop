# DZ Shop — React E-commerce (Algeria)

A modern, luxury e-commerce platform (Elegancia Cosmetics & Care) with multi-category catalog, cash on delivery across 58 Algerian Wilayas, and a hardened, JWT-authenticated Admin Studio. Prices in DZD.

## Stack
- **Frontend:** React 18 + Vite + React Router + Context API
- **Backend:** Node.js + Express + Helmet + JWT + bcryptjs + express-rate-limit
- **Database:** MySQL (via `mysql2/promise`) with connection pooling, native transactions, and auto-seeding
- **Security:** JWT Auth, bcrypt password hashing, path traversal defenses, brute-force rate limiters, HTTP security headers
- **Images:** Securely validated uploads stored in `backend/uploads/` with traversal-shielded delivery

---

## Security Architecture & Controls

1. **JSON Web Token (JWT) Authentication (`/api/auth`)**:
   - `POST /api/auth/login`: Verifies admin credentials against bcrypt hashed passwords in MySQL; returns signed JWT token.
   - `GET /api/auth/me`: Authenticated endpoint to verify session validity.
   - `POST /api/auth/change-password`: Authenticated admin password update endpoint.
   - All management endpoints (`GET/PATCH/DELETE /api/orders`, `POST/PUT/DELETE /api/products`) strictly require `Authorization: Bearer <token>`.
   - Customer actions (`GET /api/products`, `POST /api/orders` checkout) remain public for shoppers.

2. **Path Traversal & Static Upload Defense (`middleware/pathSecurity.js`)**:
   - Boundary checks ensure all requested paths resolve strictly within `backend/uploads/`.
   - Rejects directory traversal tokens (`../`, `..\`, `%2e%2e`), null bytes (`%00`), and hidden dotfiles.
   - Strict whitelist verification of file extensions (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`).
   - Sets `X-Content-Type-Options: nosniff` and CSP headers to block MIME sniffing and script execution.

3. **Brute Force & DoS Rate Limiting (`express-rate-limit`)**:
   - 10 attempts per 15 minutes on `/api/auth/login`.
   - 500 requests per 15 minutes across general API endpoints.

4. **HTTP Security Headers (`helmet`)**:
   - Protects against clickjacking, MIME sniffing, and cross-site scripting.

---

## Local Development

### 1. Database (MySQL)

You can run MySQL using **XAMPP / Laragon / WAMP**, **Docker**, or any **cloud MySQL service**:

- **Option A (XAMPP / Laragon / WAMP)**:
  1. Start MySQL from the XAMPP / Laragon control panel.
  2. Create a database named `dz_shop` in phpMyAdmin (`http://localhost/phpmyadmin`).
  3. Set `DATABASE_URL=mysql://root:@localhost:3306/dz_shop` in `backend/.env`.

- **Option B (Docker)**:
  ```bash
  docker compose up -d
  ```

- **Option C (Cloud / Hosted MySQL)**:
  Set `DATABASE_URL` in `backend/.env` to your cloud MySQL connection string (e.g. Aiven, Railway, PlanetScale, Clever Cloud).

### 2. Backend
```bash
cd backend
cp .env.example .env      # adjust DATABASE_URL / CLIENT_ORIGIN / JWT_SECRET if needed
npm install
npm run dev                # runs on http://localhost:5000
```

> **Default Admin Account:**
> - Username: `admin`
> - Password: `admin123456`
> - *(Configurable via `ADMIN_DEFAULT_USER` and `ADMIN_DEFAULT_PASS` in `backend/.env`)*

### 3. Frontend
```bash
cd frontend
cp .env.example .env      # adjust VITE_API_URL / VITE_ADMIN_PATH
npm install
npm run dev               # runs on http://localhost:5173
```

Visit:
- `/` — Home (hero banner, departments, curated catalog)
- `/products` — Full catalog with search, category filtering & sorting
- `/product/:id` — Product detail with rapid single-item checkout or shopping bag
- `/dz-admin-secure-portal-2026` (or custom `VITE_ADMIN_PATH`) — Secret JWT Authenticated Admin Studio (hidden from public UI)

---

## Environment Variables

### `backend/.env`
| Var | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `CLIENT_ORIGIN` | Allowed CORS origin(s), comma-separated |
| `DATABASE_URL` | MySQL connection string (`mysql://root:password@localhost:3306/dz_shop`) |
| `JWT_SECRET` | Secret key used for signing and verifying JWT tokens |
| `JWT_EXPIRES_IN` | Token duration (default `24h`) |
| `ADMIN_DEFAULT_USER` | Initial admin username if table is empty (default `admin`) |
| `ADMIN_DEFAULT_PASS` | Initial admin password (default `admin123456`) |

### `frontend/.env`
| Var | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of backend API (e.g. `http://localhost:5000/api`) |
| `VITE_UPLOADS_URL` | Base URL for product images (e.g. `http://localhost:5000/uploads`) |
| `VITE_ADMIN_PATH` | Admin dashboard route slug (e.g. `admin-dashboard-x7k`) |
