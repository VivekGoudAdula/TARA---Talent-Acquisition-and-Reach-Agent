"""One-off script to re-run mapper over stored webhook events for a tenant.

Updates ONLY communications missing duration or extractions.
Dry-run by default; requires --apply to persist changes.
Never touches any other communication fields.
"""

import argparse
import asyncio
from datetime import datetime, timezone
import os
import sys
from typing import Any

# Ensure backend root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.providers.bolna_webhook_mapper import map_bolna_webhook


def is_missing_duration(outcome: dict[str, Any]) -> bool:
    """Check if communication outcome is missing duration."""
    dur = outcome.get("duration_seconds")
    return dur is None or dur == 0


def is_missing_extraction(outcome: dict[str, Any]) -> bool:
    """Check if communication outcome is missing interest_level or extraction fields."""
    interest = outcome.get("interest_level")
    return interest is None or str(interest).strip() in ("", "Not detected")


def calculate_derived_duration(
    wh_events: list[dict[str, Any]], comm: dict[str, Any]
) -> tuple[float | None, str | None]:
    """Derive duration from first and last event timestamps."""
    first_ts = None
    last_ts = None

    if wh_events:
        first_ts = wh_events[0].get("received_at")
        last_ts = wh_events[-1].get("received_at")

    if not first_ts:
        first_ts = comm.get("dispatched_at") or comm.get("created_at")
    if not last_ts:
        last_ts = comm.get("completed_at")

    if isinstance(first_ts, datetime) and isinstance(last_ts, datetime):
        if first_ts.tzinfo is None:
            first_ts = first_ts.replace(tzinfo=timezone.utc)
        if last_ts.tzinfo is None:
            last_ts = last_ts.replace(tzinfo=timezone.utc)
        diff = (last_ts - first_ts).total_seconds()
        if diff > 0:
            return (round(diff, 1), "derived")

    return (None, None)


def determine_comm_updates(
    comm: dict[str, Any], wh_events: list[dict[str, Any]]
) -> dict[str, Any]:
    """Inspect stored webhook events and build minimal update fields for missing outcome data."""
    if not wh_events:
        return {}

    existing_outcome = comm.get("outcome") or {}
    needs_dur = is_missing_duration(existing_outcome)
    needs_ext = is_missing_extraction(existing_outcome)

    if not needs_dur and not needs_ext:
        return {}

    # Prefer completed event, otherwise newest event
    selected_ev = wh_events[-1]
    for ev in reversed(wh_events):
        raw_st = str(ev.get("raw", {}).get("status", "")).lower()
        if raw_st in ("completed", "done", "finished"):
            selected_ev = ev
            break

    raw_payload = selected_ev.get("raw", {})
    mapped, _ = map_bolna_webhook(raw_payload)
    mapped_outcome = mapped.get("outcome", {})

    update_fields: dict[str, Any] = {}

    # 1. Duration update if missing
    if needs_dur:
        dur = mapped_outcome.get("duration_seconds")
        dur_src = mapped_outcome.get("duration_source", "provider")
        if not dur or dur <= 0:
            dur, dur_src = calculate_derived_duration(wh_events, comm)

        if dur and dur > 0:
            update_fields["outcome.duration_seconds"] = dur
            update_fields["outcome.duration_source"] = dur_src
            update_fields["outcome.duration_type"] = dur_src

    # 2. Extraction updates if missing
    if needs_ext:
        for field in ("interest_level", "preferred_amount", "preferred_callback_time", "language_used"):
            current_val = existing_outcome.get(field)
            new_val = mapped_outcome.get(field)
            if (current_val is None or str(current_val).strip() in ("", "Not detected")) and new_val not in (None, "", "Not detected"):
                update_fields[f"outcome.{field}"] = new_val

    return update_fields


async def reapply_webhook_events_for_tenant(
    tenant_id: str,
    apply: bool = False,
    db_name: str | None = None,
) -> dict[str, Any]:
    """Scan stored webhook events and re-map missing outcomes for a given tenant."""
    target_db_name = db_name or settings.mongo_db_name
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[target_db_name]

    print("==================================================")
    print("REAPPLY WEBHOOK EVENTS: OUTCOMES ROBUSTNESS")
    print(f"Target Database : {target_db_name}")
    print(f"Tenant ID       : {tenant_id}")
    print(f"Execution Mode  : {'APPLY (Database writes enabled)' if apply else 'DRY RUN (Pass --apply to write)'}")
    print("==================================================")

    cursor = db.communications.find({"tenant_id": tenant_id})
    comms = await cursor.to_list(length=10000)

    total_scanned = len(comms)
    missing_dur_count = 0
    missing_ext_count = 0
    candidates: list[tuple[dict[str, Any], dict[str, Any]]] = []

    for comm in comms:
        outcome = comm.get("outcome") or {}
        has_missing_dur = is_missing_duration(outcome)
        has_missing_ext = is_missing_extraction(outcome)

        if has_missing_dur:
            missing_dur_count += 1
        if has_missing_ext:
            missing_ext_count += 1

        if not has_missing_dur and not has_missing_ext:
            continue

        comm_id_str = str(comm["_id"])
        provider_ref = comm.get("provider_ref")

        wh_query: dict[str, Any] = {"matched_communication_id": comm_id_str}
        if provider_ref:
            wh_query = {"$or": [{"matched_communication_id": comm_id_str}, {"provider_ref": provider_ref}]}

        wh_cursor = db.webhook_events.find(wh_query).sort("received_at", 1)
        wh_events = await wh_cursor.to_list(length=100)

        updates = determine_comm_updates(comm, wh_events)
        if updates:
            candidates.append((comm, updates))

    # Print summary counts first
    print("\n--- Summary Counts ---")
    print(f"Total communications scanned : {total_scanned}")
    print(f"Missing duration             : {missing_dur_count}")
    print(f"Missing extraction           : {missing_ext_count}")
    print(f"Candidates with updates      : {len(candidates)}")

    for i, (comm, up_fields) in enumerate(candidates, 1):
        print(f"  [{i}] Comm ID: {comm['_id']} (ref: {comm.get('provider_ref')})")
        for k, v in up_fields.items():
            print(f"       + {k} = {v}")

    # Write only if --apply is passed
    applied_count = 0
    if apply:
        print("\n--- Applying Updates to Database ---")
        for comm, up_fields in candidates:
            res = await db.communications.update_one(
                {"_id": comm["_id"]},
                {"$set": up_fields},
            )
            if res.modified_count > 0:
                applied_count += 1
        print(f"[APPLIED] Successfully updated {applied_count} communication record(s).")
    else:
        print("\n[DRY RUN] No database writes were performed. Pass --apply to persist changes.")

    client.close()
    return {
        "total_scanned": total_scanned,
        "missing_duration": missing_dur_count,
        "missing_extraction": missing_ext_count,
        "candidates_count": len(candidates),
        "applied_count": applied_count,
    }


def main() -> None:
    """CLI entry point for reapply script."""
    parser = argparse.ArgumentParser(description="Re-run webhook mapper over stored webhook events for a tenant.")
    parser.add_argument("--tenant-id", required=True, help="Tenant ID to process")
    parser.add_argument("--apply", action="store_true", default=False, help="Commit updates to MongoDB (dry-run by default)")
    parser.add_argument("--db-name", default=None, help="MongoDB database name override")

    args = parser.parse_args()
    asyncio.run(reapply_webhook_events_for_tenant(
        tenant_id=args.tenant_id,
        apply=args.apply,
        db_name=args.db_name,
    ))


if __name__ == "__main__":
    main()

