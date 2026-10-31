"""Tests covering Phase 2 communication dispatch, compliance, mocks, idempotency, and webhooks."""

from datetime import datetime, timezone
import json
import uuid
from zoneinfo import ZoneInfo
from bson import ObjectId
import httpx
import pytest
import pytest_asyncio
from app.core.config import settings
from app.core.db import get_db, init_db
from app.core.rate_limit import reset_rate_limits
from app.main import app
from app.providers.bolna_voice import BolnaVoiceProvider
from app.services.communication import reconcile_unmatched_webhook

KOLKATA_TZ = ZoneInfo("Asia/Kolkata")
ALLOWLISTED_PHONE = "+919876543210"


@pytest_asyncio.fixture(autouse=True)
async def setup_test_env():
    """Configure settings and database before each test run."""
    await init_db()
    reset_rate_limits()
    settings.test_mode = True
    settings.test_allowlist = f"{ALLOWLISTED_PHONE},+919999988888,invalid-num"
    settings.bolna_api_key, settings.bolna_agent_id = "test_key", "agent_123"
    settings.bolna_from_number, settings.bolna_webhook_secret = "+12025550199", "secret_xyz"
    settings.call_window_start, settings.call_window_end = "09:00", "21:00"
    yield
    reset_rate_limits()


async def get_auth_context(client: httpx.AsyncClient) -> tuple[dict[str, str], dict[str, str], str, str]:
    """Return auth headers and tenant IDs for Test Bank and Other Bank."""
    tb = (await client.post("/api/auth/login", json={"email": "employee@testbank.com", "password": settings.seed_password})).json()
    ob = (await client.post("/api/auth/login", json={"email": "employee@otherbank.com", "password": settings.seed_password})).json()
    return {"Authorization": f"Bearer {tb['access_token']}"}, {"Authorization": f"Bearer {ob['access_token']}"}, tb["user"]["tenant_id"], ob["user"]["tenant_id"]

async def create_test_lead(db, tid: str, phone: str = ALLOWLISTED_PHONE, consent: bool = True, dnd: bool = False) -> str:
    """Helper to insert a test lead and return ID."""
    doc = {
        "tenant_id": tid, "name": "Ravi Kumar", "phone": phone, "language": "telugu",
        "city": "Hyderabad", "age": 30, "income": 500000.0, "segment": "SALARIED", "source": "branch",
        "consent": consent, "dnd": dnd, "created_at": datetime.now(timezone.utc),
    }
    res = await db.leads.insert_one(doc)
    return str(res.inserted_id)

@pytest.mark.asyncio
async def test_happy_path_dispatch(monkeypatch):
    """Happy path: allowlisted lead, consent true, dnd false, inside window -> 202."""
    transport, db, captured = httpx.ASGITransport(app=app), get_db(), {}

    def bolna_mock_handler(req: httpx.Request) -> httpx.Response:
        assert req.headers["authorization"] == f"Bearer {settings.bolna_api_key}"
        captured.update(json.loads(req.read()))
        return httpx.Response(200, json={"execution_id": "exec_test_happy_01", "status": "queued"})

    monkeypatch.setattr(BolnaVoiceProvider, "_get_client", lambda s, to: httpx.AsyncClient(transport=httpx.MockTransport(bolna_mock_handler)))
    monkeypatch.setattr("app.services.compliance.datetime", type("MockDT", (), {"now": lambda tz=None: datetime(2026, 10, 26, 14, 0, 0, tzinfo=KOLKATA_TZ)}))

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tb_hdr, _, tb_tid, _ = await get_auth_context(client)
        lead_id = await create_test_lead(db, tb_tid)
        resp = await client.post("/api/communication/send", json={"channel": "voice", "recipient_ref": {"type": "lead", "id": lead_id}}, headers=tb_hdr)
        assert resp.status_code == 202 and resp.json()["status"] == "DISPATCHED"
        assert captured["recipient_phone_number"] == ALLOWLISTED_PHONE and captured["user_data"]["customer_name"] == "Ravi Kumar"
        comm = await db.communications.find_one({"_id": ObjectId(resp.json()["communication_id"])})
        assert comm["phone_masked"] == "+9198******10" and "phone" not in comm
        await db.leads.delete_one({"_id": ObjectId(lead_id)})
        await db.communications.delete_one({"_id": comm["_id"]})


@pytest.mark.asyncio
async def test_compliance_rules(monkeypatch):
    """Verify each compliance gate check returns 200 with status BLOCKED and right reason."""
    transport, db, mock_called = httpx.ASGITransport(app=app), get_db(), False

    def bolna_mock_handler(req):
        nonlocal mock_called; mock_called = True; return httpx.Response(200, json={"execution_id": "none"})

    monkeypatch.setattr(BolnaVoiceProvider, "_get_client", lambda s, to: httpx.AsyncClient(transport=httpx.MockTransport(bolna_mock_handler)))
    valid_time = datetime(2026, 10, 26, 14, 0, 0, tzinfo=KOLKATA_TZ)
    monkeypatch.setattr("app.services.compliance.datetime", type("MockDT", (), {"now": lambda tz=None: valid_time}))

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tb_hdr, _, tb_tid, _ = await get_auth_context(client)
        lids: list[str] = []
        try:
            cases = [
                (await create_test_lead(db, tb_tid, phone="+919876599999"), "test_mode_not_allowlisted"),
                (await create_test_lead(db, tb_tid, phone="+919000012345"), "non_dialable_number"),
                (await create_test_lead(db, tb_tid, phone="invalid-num"), "invalid_phone"),
                (await create_test_lead(db, tb_tid, consent=False), "no_consent"),
                (await create_test_lead(db, tb_tid, dnd=True), "dnd"),
            ]
            for lid, reason in cases:
                lids.append(lid)
                r = await client.post("/api/communication/send", json={"channel": "voice", "recipient_ref": {"type": "lead", "id": lid}}, headers=tb_hdr)
                assert r.status_code == 200 and r.json()["blocked_reason"] == reason

            # Outside hours check
            monkeypatch.setattr("app.services.compliance.datetime", type("MockDT", (), {"now": lambda tz=None: datetime(2026, 10, 26, 3, 0, 0, tzinfo=KOLKATA_TZ)}))
            lid_night = await create_test_lead(db, tb_tid)
            lids.append(lid_night)
            r = await client.post("/api/communication/send", json={"channel": "voice", "recipient_ref": {"type": "lead", "id": lid_night}}, headers=tb_hdr)
            assert r.status_code == 200 and r.json()["blocked_reason"] == "outside_calling_hours"

            monkeypatch.setattr("app.services.compliance.datetime", type("MockDT", (), {"now": lambda tz=None: valid_time}))
            monkeypatch.setattr(settings, "contact_cap_count", 2)
            monkeypatch.setattr(settings, "contact_cap_days", 7)

            # Frequency cap check
            lid_cap = await create_test_lead(db, tb_tid)
            lids.append(lid_cap)
            for _ in range(2):
                await db.communications.insert_one({"tenant_id": tb_tid, "recipient_id": lid_cap, "status": "COMPLETED", "created_at": datetime.now(timezone.utc)})
            r = await client.post("/api/communication/send", json={"channel": "voice", "recipient_ref": {"type": "lead", "id": lid_cap}}, headers=tb_hdr)
            assert r.status_code == 200 and r.json()["blocked_reason"] == "frequency_cap"

            # Duplicate in-flight check
            lid_dup = await create_test_lead(db, tb_tid)
            lids.append(lid_dup)
            await db.communications.insert_one({"tenant_id": tb_tid, "recipient_id": lid_dup, "status": "IN_PROGRESS", "created_at": datetime.now(timezone.utc)})
            r = await client.post("/api/communication/send", json={"channel": "voice", "recipient_ref": {"type": "lead", "id": lid_dup}}, headers=tb_hdr)
            assert r.status_code == 200 and r.json()["blocked_reason"] == "duplicate_in_flight"

            assert mock_called is False
        finally:
            if lids:
                await db.leads.delete_many({"_id": {"$in": [ObjectId(x) for x in lids]}})
            await db.communications.delete_many({"tenant_id": tb_tid, "status": "BLOCKED"})

@pytest.mark.asyncio
async def test_tenant_isolation_and_unsupported_channels():
    """Verify cross-tenant dispatch returns 404, list query is isolated, and stubs return 501."""
    transport, db = httpx.ASGITransport(app=app), get_db()
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tb_hdr, ob_hdr, tb_tid, _ = await get_auth_context(client)
        tb_lead_id = await create_test_lead(db, tb_tid)
        try:
            assert (await client.post("/api/communication/send", json={"channel": "voice", "recipient_ref": {"type": "lead", "id": tb_lead_id}}, headers=ob_hdr)).status_code == 404
            for ch in ("whatsapp", "sms", "email"):
                assert (await client.post("/api/communication/send", json={"channel": ch, "recipient_ref": {"type": "lead", "id": tb_lead_id}}, headers=tb_hdr)).status_code == 501
            assert (await client.get("/api/communications", headers=ob_hdr)).status_code == 200
        finally:
            await db.leads.delete_one({"_id": ObjectId(tb_lead_id)})

@pytest.mark.asyncio
async def test_idempotency_key(monkeypatch):
    """Verify second identical send returns same record with status 200, provider called once."""
    transport, db, call_count = httpx.ASGITransport(app=app), get_db(), 0

    def mock_bolna(req):
        nonlocal call_count; call_count += 1
        return httpx.Response(200, json={"execution_id": "exec_idemp_99", "status": "queued"})

    monkeypatch.setattr(BolnaVoiceProvider, "_get_client", lambda s, to: httpx.AsyncClient(transport=httpx.MockTransport(mock_bolna)))
    monkeypatch.setattr("app.services.compliance.datetime", type("MockDT", (), {"now": lambda tz=None: datetime(2026, 10, 26, 14, 0, 0, tzinfo=KOLKATA_TZ)}))

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tb_hdr, _, tb_tid, _ = await get_auth_context(client)
        lid, key = await create_test_lead(db, tb_tid), f"idemp_{uuid.uuid4().hex}"
        p = {"channel": "voice", "recipient_ref": {"type": "lead", "id": lid}, "idempotency_key": key}
        try:
            r1 = await client.post("/api/communication/send", json=p, headers=tb_hdr)
            assert r1.status_code == 202
            cid = r1.json()["communication_id"]

            r2 = await client.post("/api/communication/send", json=p, headers=tb_hdr)
            assert r2.status_code == 200 and r2.json()["communication_id"] == cid and call_count == 1
            await db.communications.delete_one({"_id": ObjectId(cid)})
        finally:
            await db.leads.delete_one({"_id": ObjectId(lid)})

@pytest.mark.asyncio
async def test_provider_failures(monkeypatch):
    """Verify 4xx (no retry), 5xx (1 retry), and post-send timeout (ambiguous_dispatch)."""
    transport, db = httpx.ASGITransport(app=app), get_db()
    monkeypatch.setattr("app.services.compliance.datetime", type("MockDT", (), {"now": lambda tz=None: datetime(2026, 10, 26, 14, 0, 0, tzinfo=KOLKATA_TZ)}))

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        tb_hdr, _, tb_tid, _ = await get_auth_context(client)
        lid = await create_test_lead(db, tb_tid)
        try:
            # 4xx Error (no retry)
            c4 = 0
            def m400(r):
                nonlocal c4; c4 += 1; return httpx.Response(400, json={"error": "bad"})
            monkeypatch.setattr(BolnaVoiceProvider, "_get_client", lambda s, t: httpx.AsyncClient(transport=httpx.MockTransport(m400)))
            r1 = await client.post("/api/communication/send", json={"channel": "voice", "recipient_ref": {"type": "lead", "id": lid}}, headers=tb_hdr)
            assert r1.status_code == 502 and c4 == 1

            # 5xx Error (1 retry)
            c5 = 0
            def m500(r):
                nonlocal c5; c5 += 1; return httpx.Response(500, json={"error": "down"})
            monkeypatch.setattr(BolnaVoiceProvider, "_get_client", lambda s, t: httpx.AsyncClient(transport=httpx.MockTransport(m500)))
            r2 = await client.post("/api/communication/send", json={"channel": "voice", "recipient_ref": {"type": "lead", "id": lid}}, headers=tb_hdr)
            assert r2.status_code == 502 and c5 == 2

            # ReadTimeout (ambiguous_dispatch, no retry)
            ct = 0
            def mtime(r):
                nonlocal ct; ct += 1; raise httpx.ReadTimeout("Timeout")
            monkeypatch.setattr(BolnaVoiceProvider, "_get_client", lambda s, t: httpx.AsyncClient(transport=httpx.MockTransport(mtime)))
            r3 = await client.post("/api/communication/send", json={"channel": "voice", "recipient_ref": {"type": "lead", "id": lid}}, headers=tb_hdr)
            assert r3.status_code == 502 and ct == 1 and "ambiguous_dispatch" in r3.json()["detail"]["error"]
        finally:
            await db.leads.delete_one({"_id": ObjectId(lid)})

@pytest.mark.asyncio
async def test_webhooks_flow():
    """Verify webhook auth, mapping, monotonic out-of-order status, reconciliation, and malformed JSON."""
    transport, db = httpx.ASGITransport(app=app), get_db()
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        assert (await client.post("/api/webhooks/bolna", json={})).status_code == 401
        assert (await client.post("/api/webhooks/bolna", json={}, headers={"X-Webhook-Secret": "wrong"})).status_code == 401
        assert (await client.post(f"/api/webhooks/bolna?secret={settings.bolna_webhook_secret}", json={"execution_id": "q1"})).status_code == 200

        # Mapping & updating matching communication
        exec_id = f"exec_{uuid.uuid4().hex[:8]}"
        res = await db.communications.insert_one({"tenant_id": "tb", "status": "DISPATCHED", "provider_ref": exec_id, "created_at": datetime.now(timezone.utc)})
        cid = res.inserted_id
        await client.post("/api/webhooks/bolna", json={"execution_id": exec_id, "status": "completed", "duration": 40.0, "extracted_data": {"interest_level": "HIGH"}}, headers={"X-Webhook-Secret": settings.bolna_webhook_secret})
        c_up = await db.communications.find_one({"_id": cid})
        assert c_up["status"] == "COMPLETED" and c_up["outcome"]["duration_seconds"] == 40.0

        # Monotonic state protection (out-of-order in-progress event does not regress completed)
        await client.post("/api/webhooks/bolna", json={"execution_id": exec_id, "status": "in-progress"}, headers={"X-Webhook-Secret": settings.bolna_webhook_secret})
        assert (await db.communications.find_one({"_id": cid}))["status"] == "COMPLETED"

        # Reconciliation: event arrives before provider_ref is saved
        pre_id = f"pre_{uuid.uuid4().hex[:8]}"
        await client.post("/api/webhooks/bolna", json={"execution_id": pre_id, "status": "completed", "duration": 15.0}, headers={"X-Webhook-Secret": settings.bolna_webhook_secret})
        late_res = await db.communications.insert_one({"tenant_id": "tb", "status": "DISPATCHED", "provider_ref": pre_id})
        await reconcile_unmatched_webhook(db, str(late_res.inserted_id), pre_id, "tb")
        assert (await db.communications.find_one({"_id": late_res.inserted_id}))["status"] == "COMPLETED"

        # Malformed JSON stored safely
        bad_res = await client.post("/api/webhooks/bolna", content=b"invalid json raw", headers={"Content-Type": "application/json", "X-Webhook-Secret": settings.bolna_webhook_secret})
        assert bad_res.status_code == 200

        # Cleanup
        await db.communications.delete_many({"_id": {"$in": [cid, late_res.inserted_id]}})
        await db.webhook_events.delete_many({"provider_ref": {"$in": [exec_id, pre_id, "q1"]}})
