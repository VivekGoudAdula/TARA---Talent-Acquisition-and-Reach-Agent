# TARA — Targeted Acquisition & Reach Agent

> Voice-first outreach platform for Indian banks & NBFCs, powered by Bolna Voice AI.

---

## Architecture & Routes

| Path | Access | Description |
|---|---|---|
| `/` | Public | Editorial landing page explaining workflow, governance, and status |
| `/login` | Public | Split-layout authentication with show/hide password toggle |
| `/signup` | Public | Self-serve workspace creation (initializes clean with 0 records) |
| `/app` | Protected | Redirects to `/app/leads` |
| `/app/leads` | Protected | Tenant-isolated lead registry with search, filters, and detail drawer |
| `/app/customers` | Protected | Internal banking customer portfolio with health scores & repayment behavior |
| `/app/products` | Protected | Tenant financial products catalog with eligibility criteria |

---

## Environment Setup

### 1. Backend Configuration
Copy `.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Key configuration in `backend/.env`:
```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=tara
SECRET_KEY=your-32-char-random-jwt-secret-key
JWT_EXPIRE_MINUTES=480
SEED_PASSWORD=ChangeMe123!
```

### 2. Frontend Configuration
Copy `.env.example` to `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```
Key configuration in `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api
# Set to true to show quick one-click demo login buttons on /login (default: false)
VITE_SHOW_DEMO_LOGINS=false
```

---

## Running the Application

### 1. Install & Seed Backend
```bash
cd backend
python -m pip install -r requirements.txt

# Run idempotent database seeder
python scripts/seed.py

# Optional: wipe and reseed cleanly
python scripts/seed.py --reset
```

### 2. Start Backend API Server
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000/api`
- Health Check: `http://localhost:8000/api/health`
- Interactive API Docs: `http://localhost:8000/docs`

### 3. Start Frontend UI
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173`

---

## Self-Serve Workspace Signup & Sample Data

1. Visit `http://localhost:5173/signup` to register a new workspace.
2. New workspaces initialize completely empty (0 leads, 0 customers, 0 products).
3. If logged in as `SUPER_ADMIN`, click the **"Load sample data"** button on the empty state of Leads, Customers, or Products to populate verified test records (3 products, 40 leads, 20 customers).
4. Subsequent calls to sample-data return `409 Conflict` (idempotent protection).

---

## Pre-seeded Credentials (for Testing Multi-Tenancy)

| Tenant | Role | Email | Password | Dataset Scoped |
|---|---|---|---|---|
| **Test Bank** | `SUPER_ADMIN` | `admin@testbank.com` | `ChangeMe123!` | 60 Leads, 30 Customers, 3 Products |
| **Test Bank** | `EMPLOYEE` | `employee@testbank.com` | `ChangeMe123!` | 60 Leads, 30 Customers, 3 Products |
| **Other Bank** | `EMPLOYEE` | `employee@otherbank.com` | `ChangeMe123!` | 15 Leads, 10 Customers, 2 Products |

---

## Running Automated Tests

Run the full isolation, signup, and sample data test suite:
```bash
cd backend
python -m pytest tests/test_tenant_isolation.py -v
```

### Verified Test Cases:
1. `test_tenant_isolation`: Standard Phase 1 isolation (Test Bank: 60/30, Other Bank: 15/10, cross-tenant 404, 401 on tampered token).
2. `test_signup_creates_isolated_empty_tenant`: New signup creates a fresh workspace with 0 records; cross-tenant records remain invisible.
3. `test_signup_field_tampering_prevented`: Extra payload fields (`role`, `tenant_id`) cannot escalate privileges or hijack tenant scoping.
4. `test_signup_validation`: Duplicate email returns `409`; passwords under 10 characters return `422`.
5. `test_rate_limiting`: Exceeding 10 requests per minute per IP returns `429 Too Many Requests`.
6. `test_sample_data_loading`: Sample data loads for `SUPER_ADMIN`, returns `403` for `EMPLOYEE`, returns `409` on subsequent calls.
