"""Defensive mapper for Bolna webhook event payloads."""

from datetime import datetime
import json
from typing import Any

TERMINAL_STATUSES: set[str] = {
    "COMPLETED",
    "NO_ANSWER",
    "BUSY",
    "FAILED",
    "CANCELLED",
    "BLOCKED",
}

STATUS_MAPPING: dict[str, str] = {
    "queued": "QUEUED",
    "initiated": "DISPATCHED",
    "ringing": "DISPATCHED",
    "dispatched": "DISPATCHED",
    "in-progress": "IN_PROGRESS",
    "in_progress": "IN_PROGRESS",
    "active": "IN_PROGRESS",
    "ongoing": "IN_PROGRESS",
    "completed": "COMPLETED",
    "finished": "COMPLETED",
    "done": "COMPLETED",
    "call-disconnected": "COMPLETED",
    "no-answer": "NO_ANSWER",
    "no_answer": "NO_ANSWER",
    "unanswered": "NO_ANSWER",
    "busy": "BUSY",
    "failed": "FAILED",
    "error": "FAILED",
    "cancelled": "CANCELLED",
    "canceled": "CANCELLED",
}


def can_transition(current_status: str | None, new_status: str | None) -> bool:
    """Ensure status transitions are strictly monotonic (never regress from terminal)."""
    if not new_status:
        return False
    if not current_status:
        return True
    if current_status in TERMINAL_STATUSES and new_status not in TERMINAL_STATUSES:
        return False
    return True


def normalize_interest_level(raw_val: Any) -> str:
    """
    Normalise interest_level to interested|callback|not_interested|unknown (lowercase, trimmed).

    Returns:
        - 'Not detected' only when the provider sent no value (None or empty/whitespace).
        - 'interested' | 'callback' | 'not_interested' | 'unknown' for recognized categories.
        - The raw trimmed value if it is not one of the known strings.
    """
    if raw_val is None:
        return "Not detected"

    val_str = str(raw_val).strip()
    if not val_str:
        return "Not detected"

    norm = val_str.lower().replace("-", "_").replace(" ", "_")

    # 1. Exact canonical matches
    if norm in {"interested", "callback", "not_interested", "unknown"}:
        return norm

    # 2. Not interested variants
    if norm in {"no", "declined", "reject", "rejected", "disinterested", "uninterested"} or (
        "not" in norm and "interested" in norm
    ):
        return "not_interested"

    # 3. Interested variants
    if norm in {"yes", "high", "positive", "apply", "wants_loan", "opt_in"} or (
        "interested" in norm and "not" not in norm
    ):
        return "interested"

    # 4. Callback variants
    if norm in {"call_back", "call_later", "callback_requested", "reschedule"} or (
        "callback" in norm or "call back" in val_str.lower()
    ):
        return "callback"

    # 5. Unknown variants
    if norm in {"unclear", "ambiguous", "neutral", "none", "n/a", "not_sure"}:
        return "unknown"

    # 6. Return raw value if not one of the known strings
    return val_str


def extract_duration(raw_payload: dict[str, Any], known_keys: set[str]) -> tuple[float | None, str | None]:
    """
    Extract call duration from provider payload or derive from timestamps.

    Returns:
        (duration_seconds, duration_type) where duration_type is 'provider' or 'derived'.
    """
    # 1. Direct provider duration fields
    # In Bolna payload: 'conversation_duration' is top-level, and 'telephony_data.duration'
    telephony = raw_payload.get("telephony_data") if isinstance(raw_payload.get("telephony_data"), dict) else {}
    if telephony:
        known_keys.add("telephony_data")

    candidates = [
        ("conversation_duration", raw_payload.get("conversation_duration")),
        ("telephony_data.duration", telephony.get("duration")),
        ("duration", raw_payload.get("duration")),
        ("duration_seconds", raw_payload.get("duration_seconds")),
        ("call_duration", raw_payload.get("call_duration")),
        ("conversation_time", raw_payload.get("conversation_time")),
    ]

    for key, val in candidates:
        if val is not None:
            if "." not in key:
                known_keys.add(key)
            try:
                dur_float = float(val)
                if dur_float > 0:
                    return (dur_float, "provider")
            except (ValueError, TypeError):
                continue

    # 2. Derive duration from payload timestamps if direct duration is 0 or absent
    start_str = raw_payload.get("initiated_at") or raw_payload.get("created_at")
    end_str = raw_payload.get("updated_at")

    if start_str and end_str:
        known_keys.update({"initiated_at", "created_at", "updated_at"})
        try:
            start_dt = datetime.fromisoformat(str(start_str))
            end_dt = datetime.fromisoformat(str(end_str))
            diff = (end_dt - start_dt).total_seconds()
            if diff > 0:
                return (round(diff, 1), "derived")
        except Exception:
            pass

    return (None, None)


def extract_extractions(raw_payload: dict[str, Any], known_keys: set[str]) -> dict[str, Any]:
    """
    Extract and standardize structured outcome extractions.
    """
    extracted_block: dict[str, Any] | None = None
    for key in (
        "extracted_data",
        "agent_extraction",
        "custom_extractions",
        "node_extracted_data",
        "extraction_details",
        "extractions",
        "data_extracted",
    ):
        val = raw_payload.get(key)
        if isinstance(val, dict):
            extracted_block = val
            known_keys.add(key)
            break
        elif isinstance(val, str) and val.strip().startswith("{"):
            try:
                parsed = json.loads(val)
                if isinstance(parsed, dict):
                    extracted_block = parsed
                    known_keys.add(key)
                    break
            except Exception:
                pass

    outcome_extractions: dict[str, Any] = {}

    # Interest Level
    raw_interest = None
    if extracted_block:
        for k in ("interest_level", "interest", "customer_interest", "lead_interest", "intent", "interest_status"):
            if k in extracted_block and extracted_block[k] is not None:
                raw_interest = extracted_block[k]
                break

    # If extraction block exists (even empty) or interest was found, normalize interest
    if raw_interest is not None or extracted_block is not None:
        outcome_extractions["interest_level"] = normalize_interest_level(raw_interest)

    # Preferred Amount
    if extracted_block:
        for k in ("preferred_amount", "loan_amount", "amount", "requested_amount", "expected_amount"):
            if k in extracted_block and extracted_block[k] not in (None, ""):
                outcome_extractions["preferred_amount"] = extracted_block[k]
                break

    # Preferred Callback Time
    if extracted_block:
        for k in ("preferred_callback_time", "callback_time", "callback", "call_back_time", "reschedule_time"):
            if k in extracted_block and extracted_block[k] not in (None, ""):
                outcome_extractions["preferred_callback_time"] = str(extracted_block[k]).strip()
                break

    # Language Used
    raw_lang = None
    if extracted_block:
        for k in ("language_used", "language", "detected_language", "user_language"):
            if k in extracted_block and extracted_block[k] not in (None, ""):
                raw_lang = str(extracted_block[k]).strip()
                break

    # Fallback to usage_breakdown.transcriber_language or context_details.recipient_data.language
    if not raw_lang:
        ub = raw_payload.get("usage_breakdown") if isinstance(raw_payload.get("usage_breakdown"), dict) else {}
        if ub:
            known_keys.add("usage_breakdown")
            raw_lang = ub.get("transcriber_language")
    if not raw_lang:
        cd = raw_payload.get("context_details") if isinstance(raw_payload.get("context_details"), dict) else {}
        if cd:
            known_keys.add("context_details")
            rd = cd.get("recipient_data") if isinstance(cd.get("recipient_data"), dict) else {}
            raw_lang = rd.get("language")

    if raw_lang:
        outcome_extractions["language_used"] = str(raw_lang).strip()

    return outcome_extractions


def map_bolna_webhook(raw_payload: dict[str, Any] | Any) -> tuple[dict[str, Any], list[str]]:
    """
    Defensively extract standardized communication outcome from Bolna webhook payload.

    Returns:
        (mapped_data, unmapped_keys)
    """
    if not isinstance(raw_payload, dict):
        return ({}, [])

    known_keys: set[str] = set()
    mapped: dict[str, Any] = {}

    # 1. Execution ID / Provider Ref
    for key in ("execution_id", "run_id", "id", "call_id", "agent_execution_id"):
        val = raw_payload.get(key)
        if val:
            mapped["provider_ref"] = str(val)
            known_keys.add(key)
            break

    # 2. Status Mapping
    raw_status = None
    for key in ("status", "call_status", "execution_status", "state"):
        if key in raw_payload:
            raw_status = str(raw_payload[key]).lower().strip()
            known_keys.add(key)
            mapped["provider_status"] = raw_payload[key]
            break

    if raw_status:
        mapped["normalized_status"] = STATUS_MAPPING.get(raw_status)

    # 3. Recipient Phone (fallback matching)
    for key in ("recipient_phone_number", "to_number", "phone_number", "recipient_phone", "user_number"):
        if key in raw_payload and raw_payload[key]:
            mapped["recipient_phone"] = str(raw_payload[key]).strip()
            known_keys.add(key)
            break

    # Also check inside telephony_data for to_number
    if "recipient_phone" not in mapped and isinstance(raw_payload.get("telephony_data"), dict):
        t_to = raw_payload["telephony_data"].get("to_number")
        if t_to:
            mapped["recipient_phone"] = str(t_to).strip()

    # 4. Outcome Fields
    outcome: dict[str, Any] = {}

    # Termination / Hangup reason
    for key in ("termination_reason", "hangup_reason", "disconnect_reason", "call_hangup_reason"):
        if key in raw_payload and raw_payload[key]:
            outcome["hangup_reason"] = str(raw_payload[key])
            known_keys.add(key)
            break

    # Duration (provider-given or derived)
    dur_seconds, dur_type = extract_duration(raw_payload, known_keys)
    if dur_seconds is not None:
        outcome["duration_seconds"] = dur_seconds
        outcome["duration_source"] = dur_type
        outcome["duration_type"] = dur_type

    # Transcript
    for key in ("transcript", "messages", "call_transcript", "conversation_transcript"):
        if key in raw_payload and raw_payload[key] is not None:
            outcome["transcript"] = raw_payload[key]
            known_keys.add(key)
            break

    # Extractions
    extractions = extract_extractions(raw_payload, known_keys)
    outcome.update(extractions)

    # Cost
    for key in ("total_cost", "cost", "call_cost"):
        if key in raw_payload and raw_payload[key] is not None:
            try:
                outcome["cost"] = float(raw_payload[key])
            except (ValueError, TypeError):
                outcome["cost"] = raw_payload[key]
            known_keys.add(key)
            break

    # Latency
    for key in ("latency_data", "latency", "latencies", "turn_latencies", "llm_latency"):
        if key in raw_payload and raw_payload[key] is not None:
            outcome["latency"] = raw_payload[key]
            known_keys.add(key)
            break

    mapped["outcome"] = outcome

    # Register known Bolna top-level keys so they don't pollute unmapped_keys
    bolna_standard_keys = {
        "agent_id", "batch_id", "scheduled_at", "answered_by_voice_mail",
        "summary", "error_message", "workflow_retries", "rescheduled_at",
        "campaign_id", "smart_status", "agent_number", "retry_config",
        "retry_count", "retry_history", "agent_version_id", "processing_status",
        "post_processing_phases", "billing_settled", "lid_data", "transfer_call_data",
        "agent_context_details", "batch_run_details", "provider", "tool_call_logs",
        "llm_key_source", "cost_breakdown",
    }
    known_keys.update(bolna_standard_keys)

    # Unmapped keys tracking
    unmapped_keys = [k for k in raw_payload.keys() if k not in known_keys]

    return mapped, unmapped_keys
