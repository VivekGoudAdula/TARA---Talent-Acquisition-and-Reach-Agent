"""Defensive mapper for Bolna webhook event payloads."""

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
    # TODO(verify-with-docs): Confirm execution ID field names from actual Bolna webhook payload
    for key in ("execution_id", "run_id", "id", "call_id", "agent_execution_id"):
        val = raw_payload.get(key)
        if val:
            mapped["provider_ref"] = str(val)
            known_keys.add(key)
            break

    # 2. Status Mapping
    # TODO(verify-with-docs): Confirm Bolna status values in webhook events
    raw_status = None
    for key in ("status", "call_status", "execution_status", "state"):
        if key in raw_payload:
            raw_status = str(raw_payload[key]).lower().strip()
            known_keys.add(key)
            mapped["provider_status"] = raw_payload[key]
            break

    if raw_status:
        mapped["normalized_status"] = STATUS_MAPPING.get(raw_status)

    # 3. Phone number (fallback matching)
    for key in ("recipient_phone_number", "to_number", "phone_number", "recipient_phone"):
        if key in raw_payload and raw_payload[key]:
            mapped["recipient_phone"] = str(raw_payload[key]).strip()
            known_keys.add(key)
            break

    # 4. Outcome Fields
    outcome: dict[str, Any] = {}

    # Hangup reason
    for key in ("hangup_reason", "disconnect_reason", "call_hangup_reason"):
        if key in raw_payload and raw_payload[key]:
            outcome["hangup_reason"] = str(raw_payload[key])
            known_keys.add(key)
            break

    # Duration
    for key in ("duration", "duration_seconds", "call_duration", "conversation_time"):
        if key in raw_payload and raw_payload[key] is not None:
            try:
                outcome["duration_seconds"] = float(raw_payload[key])
            except (ValueError, TypeError):
                outcome["duration_seconds"] = raw_payload[key]
            known_keys.add(key)
            break

    # Transcript
    for key in ("transcript", "messages", "call_transcript", "conversation_transcript"):
        if key in raw_payload and raw_payload[key] is not None:
            outcome["transcript"] = raw_payload[key]
            known_keys.add(key)
            break

    # Extracted data (e.g. from Sarvam/Groq extractions)
    extractions = None
    for key in ("extracted_data", "extraction_details", "extractions", "data_extracted"):
        if isinstance(raw_payload.get(key), dict):
            extractions = raw_payload[key]
            known_keys.add(key)
            break

    if extractions:
        for ext_key in ("interest_level", "interest", "customer_interest"):
            if ext_key in extractions:
                outcome["interest_level"] = str(extractions[ext_key])
                break
        for ext_key in ("preferred_amount", "loan_amount", "amount"):
            if ext_key in extractions:
                outcome["preferred_amount"] = extractions[ext_key]
                break
        for ext_key in ("preferred_callback_time", "callback_time", "callback"):
            if ext_key in extractions:
                outcome["preferred_callback_time"] = str(extractions[ext_key])
                break
        for ext_key in ("language_used", "language", "detected_language"):
            if ext_key in extractions:
                outcome["language_used"] = str(extractions[ext_key])
                break

    # Cost
    for key in ("cost", "total_cost", "call_cost"):
        if key in raw_payload and raw_payload[key] is not None:
            try:
                outcome["cost"] = float(raw_payload[key])
            except (ValueError, TypeError):
                outcome["cost"] = raw_payload[key]
            known_keys.add(key)
            break

    # Latency
    for key in ("latency", "latencies", "turn_latencies", "llm_latency"):
        if key in raw_payload and raw_payload[key] is not None:
            outcome["latency"] = raw_payload[key]
            known_keys.add(key)
            break

    mapped["outcome"] = outcome

    # Unmapped keys tracking
    unmapped_keys = [k for k in raw_payload.keys() if k not in known_keys]

    return mapped, unmapped_keys
