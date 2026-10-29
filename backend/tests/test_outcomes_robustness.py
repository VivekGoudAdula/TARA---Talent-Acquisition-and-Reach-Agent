"""Tests verifying outcomes data robustness with real Bolna webhook payload structures."""

from datetime import datetime, timezone
import json
import os
import sys
import uuid

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
import pytest
import pytest_asyncio
from app.core.config import settings
from app.core.db import get_db, init_db
from app.core.rate_limit import reset_rate_limits
from app.main import app
from app.providers.bolna_webhook_mapper import (
    extract_duration,
    map_bolna_webhook,
    normalize_interest_level,
)
from app.services.outcomes import get_outcomes_summary
from scripts.reapply_webhook_events import reapply_webhook_events_for_tenant

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "bolna_real_payload_fixture.json")


def load_fixture() -> dict:
    """Load sample payload matching real Bolna webhook structure with fake data."""
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    """Ensure tests run against tara_test database and clean up strictly what is created."""
    await init_db(settings.mongo_db_name_test)
    reset_rate_limits()
    settings.bolna_webhook_secret = "test_webhook_secret_key"
    yield
    reset_rate_limits()


def test_real_payload_full_mapping():
    """Verify that a real Bolna payload structure correctly maps all outcome fields."""
    payload = load_fixture()
    mapped, unmapped = map_bolna_webhook(payload)

    assert mapped["provider_ref"] == "mock-bolna-real-exec-001"
    assert mapped["normalized_status"] == "COMPLETED"
    assert mapped["recipient_phone"] == "+919876543210"

    outcome = mapped["outcome"]
    # Duration directly from conversation_duration
    assert outcome["duration_seconds"] == 91.0
    assert outcome["duration_source"] == "provider"
    assert outcome["duration_type"] == "provider"

    # Extractions
    assert outcome["interest_level"] == "interested"
    assert outcome["preferred_amount"] == 100000
    assert outcome["preferred_callback_time"] == "Tomorrow 3 PM"
    assert outcome["language_used"] == "Hindi"

    # Cost & Hangup
    assert outcome["cost"] == 4.0
    assert outcome["hangup_reason"] == "unknown"
    assert "transcript" in outcome and len(outcome["transcript"]) > 0


def test_duration_derived_when_missing():
    """When provider duration is 0 or missing, duration is derived from timestamps."""
    payload = load_fixture()
    payload["conversation_duration"] = 0.0
    payload["telephony_data"]["duration"] = 0.0
    payload["initiated_at"] = "2026-10-29T10:05:00.000000"
    payload["updated_at"] = "2026-10-29T10:06:30.000000"

    mapped, _ = map_bolna_webhook(payload)
    outcome = mapped["outcome"]

    # 90.0 seconds derived from 10:06:30 - 10:05:00
    assert outcome["duration_seconds"] == 90.0
    assert outcome["duration_source"] == "derived"
    assert outcome["duration_type"] == "derived"


def test_duration_derived_from_created_at_fallback():
    """When initiated_at is absent, fallback to created_at for derived duration."""
    payload = load_fixture()
    payload["conversation_duration"] = None
    payload["telephony_data"]["duration"] = None
    del payload["initiated_at"]
    payload["created_at"] = "2026-10-29T10:05:00.000000+00:00"
    payload["updated_at"] = "2026-10-29T10:07:05.000000+00:00"

    mapped, _ = map_bolna_webhook(payload)
    outcome = mapped["outcome"]

    # 125.0 seconds derived from 10:07:05 - 10:05:00
    assert outcome["duration_seconds"] == 125.0
    assert outcome["duration_type"] == "derived"


@pytest.mark.parametrize(
    "raw_input,expected",
    [
        (None, "Not detected"),
        ("", "Not detected"),
        ("   ", "Not detected"),
        ("INTERESTED", "interested"),
        ("Interested", "interested"),
        ("yes", "interested"),
        ("High", "interested"),
        ("Callback", "callback"),
        ("call-back", "callback"),
        ("Call Back Requested", "callback"),
        ("Not Interested", "not_interested"),
        ("not_interested", "not_interested"),
        ("declined", "not_interested"),
        ("No", "not_interested"),
        ("unknown", "unknown"),
        ("Ambiguous", "unknown"),
        ("Looking for ₹2,00,000 personal loan", "Looking for ₹2,00,000 personal loan"),
        ("Needs spouse confirmation", "Needs spouse confirmation"),
    ],
)
def test_interest_level_normalization(raw_input, expected):
    """Verify normalization and raw value retention when not in known classes."""
    assert normalize_interest_level(raw_input) == expected


def test_empty_extraction_block_falls_back():
    """When extracted_data is empty (as in first completed call), show 'Not detected' and fallback lang."""
    payload = load_fixture()
    payload["extracted_data"] = {}

    mapped, _ = map_bolna_webhook(payload)
    outcome = mapped["outcome"]

    # When provider sent an empty extraction block, interest_level is 'Not detected'
    assert outcome["interest_level"] == "Not detected"
    assert outcome.get("preferred_amount") is None
    # Falls back to usage_breakdown.transcriber_language ('hi')
    assert outcome["language_used"] == "hi"


@pytest.mark.asyncio
async def test_webhook_endpoint_e2e_robustness():
    """Verify endpoint /api/webhooks/bolna with real payload updates DB correctly on tara_test."""
    db = get_db()
    test_ref = f"exec_robust_{uuid.uuid4().hex[:8]}"

    # Seed communication in tara_test
    ins_res = await db.communications.insert_one({
        "tenant_id": "test_tenant",
        "status": "DISPATCHED",
        "provider_ref": test_ref,
        "phone_masked": "+9198******10",
        "created_at": datetime.now(timezone.utc),
        "dispatched_at": datetime.now(timezone.utc),
    })
    comm_id = ins_res.inserted_id

    try:
        payload = load_fixture()
        payload["id"] = test_ref

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            resp = await client.post(
                "/api/webhooks/bolna",
                json=payload,
                headers={"X-Webhook-Secret": settings.bolna_webhook_secret},
            )
            assert resp.status_code == 200
            assert resp.json() == {"ok": True}

        # Check DB update
        updated = await db.communications.find_one({"_id": comm_id})
        assert updated is not None
        assert updated["status"] == "COMPLETED"
        assert updated["completed_at"] is not None

        outcome = updated.get("outcome", {})
        assert outcome.get("duration_seconds") == 91.0
        assert outcome.get("duration_type") == "provider"
        assert outcome.get("interest_level") == "interested"
        assert outcome.get("preferred_amount") == 100000
        assert outcome.get("language_used") == "Hindi"

    finally:
        # Strictly clean up tara_test
        await db.communications.delete_one({"_id": comm_id})
        await db.webhook_events.delete_many({"provider_ref": test_ref})
        await db.audit_log.delete_many({"entity_id": str(comm_id)})


@pytest.mark.asyncio
async def test_webhook_delivery_dispatched_and_missing():
    """Verify webhook delivery line: X of Y dispatched calls reached terminal status (Y excludes blocked)."""
    db = get_db()
    test_tid = f"tid_wh_{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc)

    # 2 Blocked (not dispatched)
    # 1 Dispatched (in-flight, not terminal)
    # 1 No-answer (terminal)
    # 1 Failed (terminal)
    # 2 Completed (terminal)
    docs = [
        {"tenant_id": test_tid, "status": "BLOCKED", "blocked_reason": "outside_hours", "created_at": now},
        {"tenant_id": test_tid, "status": "BLOCKED", "blocked_reason": "dnd", "created_at": now},
        {"tenant_id": test_tid, "status": "DISPATCHED", "created_at": now},
        {"tenant_id": test_tid, "status": "NO_ANSWER", "created_at": now},
        {"tenant_id": test_tid, "status": "FAILED", "created_at": now},
        {"tenant_id": test_tid, "status": "COMPLETED", "outcome": {"duration_seconds": 45.0}, "created_at": now},
        {"tenant_id": test_tid, "status": "COMPLETED", "outcome": {"duration_seconds": 60.0}, "created_at": now},
    ]

    ins = await db.communications.insert_many(docs)
    created_ids = ins.inserted_ids

    try:
        summary = await get_outcomes_summary(db=db, tenant_id=test_tid)

        # Total attempted = 7, blocked = 2, dispatched (not blocked) = 5
        assert summary.attempted == 7
        assert summary.blocked == 2
        assert summary.dispatched == 5

        # Dispatched reaching terminal status = 1 no_answer + 1 failed + 2 completed = 4
        # (Blocked calls are NOT included in terminal dispatched calls)
        assert summary.webhook_delivery.communications_with_terminal_status == 4

        # Missing terminal webhook = dispatched (5) - terminal (4) = 1 (the in-flight dispatched call)
        assert summary.webhook_delivery.missing_terminal == 1

        # Connected strictly requires COMPLETED and duration > 0 (2 calls)
        assert summary.connected == 2

    finally:
        await db.communications.delete_many({"_id": {"$in": created_ids}})


@pytest.mark.asyncio
async def test_outcome_counts_other_and_unknown():
    """Verify raw/unexpected interest values count as other, while Not detected/unknown count as unknown."""
    db = get_db()
    test_tid = f"tid_oc_{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc)

    docs = [
        # Normal interested
        {"tenant_id": test_tid, "status": "COMPLETED", "outcome": {"duration_seconds": 20.0, "interest_level": "interested"}, "created_at": now},
        # Normal callback
        {"tenant_id": test_tid, "status": "COMPLETED", "outcome": {"duration_seconds": 25.0, "interest_level": "callback"}, "created_at": now},
        # Normal not_interested
        {"tenant_id": test_tid, "status": "COMPLETED", "outcome": {"duration_seconds": 15.0, "interest_level": "not_interested"}, "created_at": now},
        # Unexpected / raw value -> count under other (Other / Ambiguous)
        {"tenant_id": test_tid, "status": "COMPLETED", "outcome": {"duration_seconds": 35.0, "interest_level": "Looking for ₹2,00,000 personal loan"}, "created_at": now},
        # Not detected -> count under unknown (Unknown / No extraction)
        {"tenant_id": test_tid, "status": "COMPLETED", "outcome": {"duration_seconds": 10.0, "interest_level": "Not detected"}, "created_at": now},
        # None -> count under unknown
        {"tenant_id": test_tid, "status": "COMPLETED", "outcome": {"duration_seconds": 12.0}, "created_at": now},
        # Completed with duration 0.0 -> not counted in connected!
        {"tenant_id": test_tid, "status": "COMPLETED", "outcome": {"duration_seconds": 0.0, "interest_level": "interested"}, "created_at": now},
    ]

    ins = await db.communications.insert_many(docs)
    created_ids = ins.inserted_ids

    try:
        summary = await get_outcomes_summary(db=db, tenant_id=test_tid)

        assert summary.outcome_counts.interested == 2
        assert summary.outcome_counts.callback == 1
        assert summary.outcome_counts.not_interested == 1
        assert summary.outcome_counts.other == 1
        assert summary.outcome_counts.unknown == 2

        # Connected requires COMPLETED and duration > 0 (6 of 7 completed calls have dur > 0)
        assert summary.connected == 6
        assert summary.completed == 7

    finally:
        await db.communications.delete_many({"_id": {"$in": created_ids}})


@pytest.mark.asyncio
async def test_reapply_webhook_events_script():
    """Verify scripts/reapply_webhook_events.py dry-run by default and only updates missing fields on --apply."""
    db = get_db()
    test_tid = f"tid_reapply_{uuid.uuid4().hex[:6]}"
    test_ref = f"exec_reapply_{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc)

    # Insert a communication missing duration and extractions
    comm_res = await db.communications.insert_one({
        "tenant_id": test_tid,
        "status": "COMPLETED",
        "provider_ref": test_ref,
        "created_at": now,
        "outcome": {
            "interest_level": "Not detected",
            "duration_seconds": None,
        },
        "preserved_field": "do_not_touch_me",
    })
    comm_id = comm_res.inserted_id

    # Insert corresponding stored webhook event with real Bolna structure (anonymized)
    fixture_payload = load_fixture()
    fixture_payload["id"] = test_ref
    fixture_payload["conversation_duration"] = 91.0
    fixture_payload["extracted_data"] = {
        "interest_level": "Interested",
        "preferred_amount": 100000,
        "preferred_callback_time": "Tomorrow 3 PM",
        "language_used": "Hindi",
    }

    wh_res = await db.webhook_events.insert_one({
        "tenant_id": test_tid,
        "provider_ref": test_ref,
        "matched_communication_id": str(comm_id),
        "received_at": now,
        "raw": fixture_payload,
    })
    wh_id = wh_res.inserted_id

    try:
        # Step 1: DRY RUN (apply=False)
        dry_stats = await reapply_webhook_events_for_tenant(
            tenant_id=test_tid,
            apply=False,
            db_name=settings.mongo_db_name_test,
        )
        assert dry_stats["candidates_count"] == 1
        assert dry_stats["applied_count"] == 0

        # Verify communication is NOT modified in DB during dry-run
        comm_after_dry = await db.communications.find_one({"_id": comm_id})
        assert comm_after_dry["outcome"]["duration_seconds"] is None
        assert comm_after_dry["outcome"]["interest_level"] == "Not detected"

        # Step 2: APPLY (apply=True in tara_test)
        apply_stats = await reapply_webhook_events_for_tenant(
            tenant_id=test_tid,
            apply=True,
            db_name=settings.mongo_db_name_test,
        )
        assert apply_stats["candidates_count"] == 1
        assert apply_stats["applied_count"] == 1

        # Verify communication is updated in DB
        comm_after_apply = await db.communications.find_one({"_id": comm_id})
        outcome = comm_after_apply.get("outcome", {})
        assert outcome.get("duration_seconds") == 91.0
        assert outcome.get("duration_source") == "provider"
        assert outcome.get("interest_level") == "interested"
        assert outcome.get("preferred_amount") == 100000
        assert outcome.get("preferred_callback_time") == "Tomorrow 3 PM"
        assert outcome.get("language_used") == "Hindi"

        # Verify preserved field was NEVER touched
        assert comm_after_apply.get("preserved_field") == "do_not_touch_me"

    finally:
        await db.communications.delete_one({"_id": comm_id})
        await db.webhook_events.delete_one({"_id": wh_id})
