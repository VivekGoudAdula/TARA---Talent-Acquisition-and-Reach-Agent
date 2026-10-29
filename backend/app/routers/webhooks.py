"""Webhooks router for receiving and handling Bolna voice event callbacks."""

from datetime import datetime, timezone
import hmac
import json
import logging
from typing import Any
from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException, Query, Request, Response, status
from app.core.config import settings
from app.core.db import get_db
from app.core.security import mask_phone
from app.providers.bolna_webhook_mapper import can_transition, map_bolna_webhook

logger = logging.getLogger("tara.webhooks")
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def verify_webhook_secret(header_secret: str | None, query_secret: str | None) -> None:
    """Verify shared webhook secret constant-time via X-Webhook-Secret header or fallback query param."""
    configured_secret = settings.bolna_webhook_secret
    if not configured_secret:
        logger.error("BOLNA_WEBHOOK_SECRET is not configured on the server")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook secret not configured",
        )

    provided = header_secret or query_secret
    if not provided:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook authentication secret required",
        )

    if not hmac.compare_digest(provided, configured_secret):
        logger.warning("Invalid webhook secret provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook secret",
        )


@router.post("/bolna")
async def handle_bolna_webhook(
    request: Request,
    x_webhook_secret: str | None = Header(None, alias="X-Webhook-Secret"),
    secret: str | None = Query(None, description="Fallback secret query parameter (header preferred)"),
) -> dict[str, bool]:
    """
    Public webhook receiver for Bolna voice execution status updates.

    Always stores raw payload into webhook_events. Updates matching communication record.
    """
    # 1. Verify Authentication
    verify_webhook_secret(x_webhook_secret, secret)

    # 2. Extract payload safely (even if malformed)
    body_bytes = await request.body()
    try:
        raw_payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
    except Exception as exc:
        logger.warning("Webhook received invalid JSON: %s", exc)
        raw_payload = {"raw_text": body_bytes.decode("utf-8", errors="replace")}

    # 3. Map Payload
    mapped_data, unmapped_keys = map_bolna_webhook(raw_payload)
    provider_ref = mapped_data.get("provider_ref")

    now_utc = datetime.now(timezone.utc)
    db = get_db()

    # 4. Search for matching communication record
    matching_comm = None
    if provider_ref:
        matching_comm = await db.communications.find_one({"provider_ref": provider_ref})
    elif mapped_data.get("recipient_phone"):
        # Fallback matching (LAST resort): only match if exactly one in-flight communication has this phone
        masked = mask_phone(mapped_data["recipient_phone"])
        recent_matches = await db.communications.find({
            "phone_masked": masked,
            "status": {"$in": ["DISPATCHED", "IN_PROGRESS"]},
        }).to_list(length=3)
        if len(recent_matches) == 1:
            matching_comm = recent_matches[0]
            logger.info("Matched communication by fallback phone lookup: %s", matching_comm["_id"])

    matched_comm_id = str(matching_comm["_id"]) if matching_comm else None

    # 5. ALWAYS persist raw event untouched in webhook_events collection
    event_doc = {
        "received_at": now_utc,
        "provider": "bolna",
        "provider_ref": provider_ref,
        "raw": raw_payload,
        "matched_communication_id": matched_comm_id,
    }
    await db.webhook_events.insert_one(event_doc)

    if not matching_comm:
        logger.info("Stored unmatched Bolna webhook event (provider_ref: %s)", provider_ref)
        return {"ok": True}

    # 6. Apply mapped updates respecting monotonic state transitions
    current_status = matching_comm.get("status")
    new_status = mapped_data.get("normalized_status")

    update_fields: dict[str, Any] = {"updated_at": now_utc}
    if new_status and can_transition(current_status, new_status):
        update_fields["status"] = new_status
        if new_status == "COMPLETED":
            update_fields["completed_at"] = now_utc

    if mapped_data.get("provider_status"):
        update_fields["provider_status"] = mapped_data["provider_status"]

    # Merge or set outcome fields
    if mapped_data.get("outcome"):
        existing_outcome = matching_comm.get("outcome") or {}
        new_outcome = mapped_data["outcome"]
        merged_outcome = {**existing_outcome, **{k: v for k, v in new_outcome.items() if v is not None}}

        # If call duration is missing from provider, compute derived duration from event timestamps
        if not merged_outcome.get("duration_seconds"):
            start_dt = matching_comm.get("dispatched_at") or matching_comm.get("created_at")
            if start_dt and isinstance(start_dt, datetime):
                if start_dt.tzinfo is None:
                    start_dt = start_dt.replace(tzinfo=timezone.utc)
                diff = (now_utc - start_dt).total_seconds()
                if diff > 0:
                    merged_outcome["duration_seconds"] = round(diff, 1)
                    merged_outcome["duration_source"] = "derived"
                    merged_outcome["duration_type"] = "derived"

        update_fields["outcome"] = merged_outcome

    await db.communications.update_one({"_id": matching_comm["_id"]}, {"$set": update_fields})

    # 7. Write audit log entry
    await db.audit_log.insert_one({
        "tenant_id": matching_comm["tenant_id"],
        "actor_user_id": "bolna_webhook",
        "action": "webhook_applied",
        "entity_type": "communication",
        "entity_id": matched_comm_id,
        "detail": {
            "status_from": current_status,
            "status_to": update_fields.get("status", current_status),
            "unmapped_keys": unmapped_keys,
        },
        "at": now_utc,
    })

    return {"ok": True}
