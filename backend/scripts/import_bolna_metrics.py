"""Optional utility to import latency and cost metrics from Bolna Call History CSV export.

Usage:
    python scripts/import_bolna_metrics.py path/to/bolna_call_history.csv [tenant_id]

Expected CSV columns:
    - execution_id (or call_id / id / provider_ref): Matches communication.provider_ref
    - cost (or total_cost / call_cost): Float USD/INR
    - latency (or latency_ms / response_time_ms): Float milliseconds
    - duration (or duration_seconds / call_duration): Optional Float seconds

Rules:
    - Matches communications strictly by provider_ref.
    - If tenant_id is provided, updates are scoped to that tenant.
    - Updates only outcome.latency and outcome.cost without overwriting existing status.
"""

import asyncio
import csv
from datetime import datetime, timezone
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import get_db, init_db


async def import_bolna_csv(csv_path: str, target_tenant_id: str | None = None) -> None:
    if not os.path.exists(csv_path):
        print(f"Error: File not found at '{csv_path}'")
        return

    await init_db()
    db = get_db()
    now_utc = datetime.now(timezone.utc)

    matched, updated = 0, 0
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Find execution id
            exec_id = (
                row.get("execution_id") or row.get("call_id") or row.get("id") or row.get("provider_ref") or ""
            ).strip()
            if not exec_id:
                continue

            query = {"provider_ref": exec_id}
            if target_tenant_id:
                query["tenant_id"] = target_tenant_id

            comm = await db.communications.find_one(query)
            if not comm:
                continue

            matched += 1
            out = dict(comm.get("outcome") or {})

            # Cost
            for ck in ("cost", "total_cost", "call_cost"):
                if row.get(ck) is not None and row[ck].strip() != "":
                    try:
                        out["cost"] = float(row[ck].strip().replace("$", "").replace("₹", ""))
                        break
                    except ValueError:
                        pass

            # Latency
            for lk in ("latency", "latency_ms", "response_time_ms", "turn_latency"):
                if row.get(lk) is not None and row[lk].strip() != "":
                    try:
                        out["latency"] = float(row[lk].strip())
                        break
                    except ValueError:
                        pass

            # Duration
            for dk in ("duration", "duration_seconds", "call_duration"):
                if row.get(dk) is not None and row[dk].strip() != "":
                    try:
                        out["duration_seconds"] = float(row[dk].strip())
                        break
                    except ValueError:
                        pass

            await db.communications.update_one(
                {"_id": comm["_id"]},
                {"$set": {"outcome": out, "updated_at": now_utc}},
            )
            updated += 1

    print(f"Import complete: {matched} records matched, {updated} records updated.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    file_arg = sys.argv[1]
    tid_arg = sys.argv[2] if len(sys.argv) > 2 else None
    asyncio.run(import_bolna_csv(file_arg, tid_arg))
