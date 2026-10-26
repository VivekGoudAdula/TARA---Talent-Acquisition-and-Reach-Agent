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

Run the full isolation, signup, sample data, and communication test suites:
```bash
cd backend
python -m pytest -v
```

### Verified Test Cases:
1. `test_tenant_isolation`: Standard Phase 1 isolation (Test Bank: 60/30, Other Bank: 15/10, cross-tenant 404, 401 on tampered token).
2. `test_signup_creates_isolated_empty_tenant`: New signup creates a fresh workspace with 0 records; cross-tenant records remain invisible.
3. `test_signup_field_tampering_prevented`: Extra payload fields (`role`, `tenant_id`) cannot escalate privileges or hijack tenant scoping.
4. `test_signup_validation`: Duplicate email returns `409`; passwords under 10 characters return `422`.
5. `test_rate_limiting`: Exceeding 10 requests per minute per IP returns `429 Too Many Requests`.
6. `test_sample_data_loading`: Sample data loads for `SUPER_ADMIN`, returns `403` for `EMPLOYEE`, returns `409` on subsequent calls.
7. `test_communication`: Full Phase 2 test suite covering dispatch, 7 compliance rules, mock Bolna transport, idempotency, monotonic webhooks, out-of-order reconciliation, and provider error handling.

---

## Phase 2: Bolna Voice Agent & Webhook Setup

### 1. Exposing Local Backend with a Tunnel
To allow Bolna to deliver webhook callbacks to your local development environment, expose port 8000 using Cloudflare Tunnel or ngrok:

**Using Cloudflare Tunnel (cloudflared):**
```bash
cloudflared tunnel --url http://localhost:8000
```

**Using ngrok:**
```bash
ngrok http 8000
```

Copy the generated public HTTPS URL (e.g., `https://abc-123.trycloudflare.com`) and update `backend/.env`:
```env
PUBLIC_BASE_URL=https://abc-123.trycloudflare.com
```

### 2. Bolna Agent Webhook Configuration
In your Bolna Dashboard (`https://platform.bolna.ai`):
1. Navigate to your Agent -> **Extractions** / **Webhook** tab.
2. Configure **Webhook URL**:
   ```
   https://<your-public-tunnel-domain>/api/webhooks/bolna
   ```
   (e.g., `https://abc-123.trycloudflare.com/api/webhooks/bolna`)
3. Under **Add Headers**, configure:
   - Header Key: `X-Webhook-Secret`
   - Header Value: `<value of BOLNA_WEBHOOK_SECRET from your backend/.env>`

### 3. Running Guarded Manual Test Calls
Before running a live test call, ensure `TEST_MODE=true` and your verified phone number is set in `TEST_ALLOWLIST` in `backend/.env`.
```bash
cd backend
python scripts/manual_test_call.py
```
This script will authenticate as `employee@testbank.com`, pick the allowlisted lead, trigger `POST /api/communication/send`, and poll `GET /api/communications/{id}` for live outcome updates.

---

## Phase 4: Bolna Agent Prompt Variables Required

For campaign voice configuration to dynamically control the voice agent during outbound calls, the Bolna agent's prompt in the Bolna platform must include these `{{variables}}` inside its **Conversation Flow** / **Agent Prompt**.

### Required Template Variables
- `{{opening_message}}` - The personalized opening greeting and introduction.
- `{{objective}}` - The specific campaign conversation goal.
- `{{system_prompt_addendum}}` - Additional tone and compliance instructions.
- `{{questions_to_collect}}` - Formatted structured fields for the agent to collect.
- `{{success_condition}}` - Criteria defining successful conversation completion.
- `{{fallback_behaviour}}` - What the agent should do if objections or hurdles arise.
- `{{tone}}` - Tone setting (Professional, Friendly, or Formal).
- `{{language}}` - Target language for the conversation.
- `{{product_name}}` - Offered product name.
- `{{bank_name}}` - Lending institution name.

### Ready-to-Paste Block for Bolna Agent's Conversation Flow
```text
Opening: {{opening_message}}. Objective: {{objective}}. Additional instructions: {{system_prompt_addendum}}. Collect these one at a time: {{questions_to_collect}}. Success means: {{success_condition}}. If something goes wrong: {{fallback_behaviour}}. Tone: {{tone}}.
```

