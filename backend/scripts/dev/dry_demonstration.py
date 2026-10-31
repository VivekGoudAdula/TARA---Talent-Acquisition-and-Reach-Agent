"""Dry demonstration through the API with mocked provider."""

import asyncio
import json
import os
import sys
from bson import ObjectId
import httpx

# Ensure backend root is on sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings
from app.core.db import get_db, init_db
from app.main import app
from app.providers.bolna_voice import BolnaVoiceProvider
from app.services.campaign_variables import map_campaign_voice_variables
from app.services.campaigns import run_campaign_dispatch


async def main():
    await init_db()
    # Use accelerated pacing for dry demonstration
    settings.campaign_dispatch_delay_seconds = 0.05
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://localhost:8000") as client:
        # 1. Login
        login_res = await client.post("/api/auth/login", json={
            "email": "employee@testbank.com",
            "password": settings.seed_password,
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        user = login_res.json()["user"]
        tid = user["tenant_id"]

        print("=== STEP 1: AUTHENTICATION ===")
        print(f"Logged in as: {user['email']} (Tenant: {tid})")

        # 2. Get an active product
        db = get_db()
        prod = await db.products.find_one({"tenant_id": tid, "active": True})
        if not prod:
            prod_res = await db.products.insert_one({
                "tenant_id": tid, "name": "Festive Express Loan", "code": "FEL-01",
                "category": "personal_loan", "active": True,
            })
            prod = await db.products.find_one({"_id": prod_res.inserted_id})
        pid = str(prod["_id"])
        print(f"Target Product: {prod['name']} (ID: {pid})")

        # 3. Create Campaign
        create_res = await client.post("/api/campaigns", headers=headers, json={
            "name": "Q4 Festive Personal Loan Outreach",
            "description": "Voice outreach targeting high-propensity leads",
            "product_id": pid,
            "entity_type": "lead",
            "objective": "Engage eligible leads with pre-approved festive loan terms and schedule callback",
        })
        camp = create_res.json()
        cid = camp["id"]
        print("\n=== STEP 2: CAMPAIGN CREATION ===")
        print(f"Campaign ID: {cid}")
        print(f"Status: {camp['status']}")
        print(f"Config Version: {camp['config_version']}")

        # 4. Audience Selection (Filter: HIGH + MEDIUM, Eligible)
        print("\n=== STEP 3: AUDIENCE SELECTION ===")
        aud_res = await client.put(f"/api/campaigns/{cid}/audience", headers=headers, json={
            "mode": "filter",
            "filter": {"bands": ["HIGH", "MEDIUM"], "eligibility": "ELIGIBLE"},
            "include_not_eligible": False,
        })
        print(f"Audience Selection Result: {aud_res.json()}")

        # 5. Voice Configuration
        print("\n=== STEP 4: VOICE CONFIGURATION ===")
        custom_voice_cfg = {
            "language_mode": "recipient",
            "tone": "Professional",
            "opening_message": "Namaste {{customer_name}}, this is {{bank_name}} calling regarding our {{product_name}} with special festive rates. Do you have a moment?",
            "objective": "Present festive pre-approved loan terms and record preferred amount and callback time",
            "system_prompt_addendum": "Speak clearly and empathetically. Do not guarantee credit approvals on the call.",
            "conversation_steps": [
                {"key": "greeting", "text": "Warm greeting and confirm identity"},
                {"key": "intro", "text": "Introduce festive loan special rates"},
                {"key": "product_explanation", "text": "Explain zero processing fees and flexible tenure"},
                {"key": "objection_handling", "text": "Clarify EMI terms and required documents"},
                {"key": "closing", "text": "Confirm callback window and express gratitude"}
            ],
            "questions_to_collect": [
                {"field": "interested_status", "question": "Are you interested in our festive loan terms?", "required": True},
                {"field": "preferred_amount", "question": "What loan amount are you considering?", "required": False},
                {"field": "convenient_callback_time", "question": "What is the best time for our executive to call you?", "required": False}
            ],
            "success_condition": "Recipient confirms interest and specifies callback window or amount",
            "fallback_behaviour": "Politely close call if recipient is occupied",
            "retry_policy": {"max_attempts": 2, "interval_minutes": 60},
            "call_termination": "Thank the customer and disconnect",
        }
        cfg_res = await client.put(f"/api/campaigns/{cid}/config/voice", headers=headers, json=custom_voice_cfg)
        print(f"Voice Config Saved: version {cfg_res.json()['version']}")

        # 6. Preview
        print("\n=== STEP 5: PRE-FLIGHT PREVIEW (NO DISPATCH) ===")
        prev_res = await client.post(f"/api/campaigns/{cid}/preview", headers=headers, json={})
        prev_data = prev_res.json()
        print(f"Rendered Opening Message: \"{prev_data['rendered_opening_message']}\"")
        print("Variables to be sent to voice provider:")
        for k, v in prev_data["user_data_variables"].items():
            print(f"  - {k}: {v}")
        print(f"Validation Report: {prev_data['validation_report']}")

        # 7. Launch
        print("\n=== STEP 6: CAMPAIGN LAUNCH ===")
        # Temporarily provide mock credentials to satisfy launch pre-flight check
        settings.bolna_api_key = "mock_bolna_key"
        settings.bolna_agent_id = "mock_agent_123"

        camp_detail = (await client.get(f"/api/campaigns/{cid}", headers=headers)).json()
        total_rcpt = sum(camp_detail.get("recipient_counts", {}).values())
        if total_rcpt == 0:
            total_rcpt = await db.campaign_recipients.count_documents({"campaign_id": cid})

        launch_res = await client.post(f"/api/campaigns/{cid}/launch", headers=headers, json={
            "confirm": True,
            "expected_recipient_count": total_rcpt,
        })
        print(f"Launch Response ({launch_res.status_code}): {launch_res.json()}")

        # Intercept outbound Bolna calls globally so background task uses mock
        orig_post = httpx.AsyncClient.post
        dispatched_log = []

        async def mock_bolna_post(self, url, **kwargs):
            if "api.bolna.ai" in str(url):
                body = kwargs.get("json") or json.loads(kwargs.get("content", b"{}"))
                dispatched_log.append(body.get("recipient_phone_number"))
                return httpx.Response(200, json={"execution_id": f"dry_exec_{len(dispatched_log)}", "status": "queued"})
            return await orig_post(self, url, **kwargs)

        httpx.AsyncClient.post = mock_bolna_post

        # Run dispatch directly with mock provider
        user_dict = {"tenant_id": tid, "user_id": user["id"], "tenant_name": "Test Bank"}
        await run_campaign_dispatch(db, cid, tid, user_dict, delay_seconds=0.01)
        print(f"Dispatched calls to allowlisted recipients: {len(dispatched_log)}")

        # 9. Progress Metrics
        print("\n=== STEP 8: CAMPAIGN PROGRESS & RECIPIENT STATUSES ===")
        prog_res = await client.get(f"/api/campaigns/{cid}/progress", headers=headers)
        prog_data = prog_res.json()
        print(f"Campaign Status: {prog_data['status']}")
        print(f"Total Recipients: {prog_data['total_recipients']}")
        print("Status Counts:", json.dumps(prog_data["counts_by_status"], indent=2))
        print("Blocked Reasons Breakdown:", json.dumps(prog_data["blocked_reasons_breakdown"], indent=2))


if __name__ == "__main__":
    asyncio.run(main())
