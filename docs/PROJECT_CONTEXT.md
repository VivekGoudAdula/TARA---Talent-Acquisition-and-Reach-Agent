# PROJECT CONTEXT: TARA

## 0. How we will work
- We build phase by phase. Do NOT jump ahead. After each phase, report: what was built, files changed, how to run it, what was tested, what is still broken.
- Do not claim anything works unless you actually ran it. If you could not test something, say so.
- Ask me before making big architectural decisions that contradict this document.
- No secrets in code. All keys in .env (gitignored), with a committed .env.example.
- Keep files under ~250 lines. No unnecessary folders, abstractions, or microservices. Prefer simple and readable.
- Reuse; never duplicate models or logic.

## 1. What we are building
TARA = Targeted Acquisition & Reach Agent. A voice-first outreach platform for banks/NBFCs in India.
It scores customers and leads for product fit, lets a user build a campaign from the scored audience,
configures how each channel should behave, and then a voice AI agent calls the selected people
in Hindi / Telugu / English. Call outcomes come back and update the recipient status.

Context: submission for Bolna Voice AI Buildathon (Symphony 2026).
- Submission deadline: 31 Oct 2026.
- Shortlist interviews 5-7 Nov. Finale 20 Nov (Bengaluru). Winner gets a YC interview.
- Judges care about: a real working demo, a clear business problem, voice being central, honest evidence.
- Build ONE working vertical slice end to end. Depth beats breadth.

## 2. Architecture
DATA -> SCORING / PRODUCT MATCHING -> CAMPAIGN -> CONFIGURATION -> COMMUNICATION API -> PROVIDER ADAPTER -> BOLNA (voice) -> phone
and: Bolna webhook -> TARA webhook endpoint -> update recipient status + store outcome.

Rules from CEO review:
1. Campaign is an independent module. Contains NO provider logic.
2. Communication API is a separate, reusable service: POST /api/communication/send.
3. Provider abstraction: CommunicationProvider interface -> BolnaVoiceProvider; WhatsAppProvider, SMSProvider, EmailProvider stubs.
4. Products live in DB, managed by admin, tenant-scoped.
5. Scoring NEVER deletes or hides low-score records. Eligibility is a FILTER, not a deletion. Bands: HIGH / MEDIUM / LOW.
6. One lead/customer maps to MANY products.
7. Communication config stored per channel (voice/whatsapp/sms/email), versioned (config_version). Prompts/questions are CONFIG DATA.
8. Multi-tenant: every record has tenant_id. tenant_id comes ONLY from the authenticated JWT, never from request body/query.
9. Compliance enforced at dispatch layer (communication service): consent flag, DND check, calling-hours window (09:00-21:00 IST), frequency cap. Blocked attempts logged.
10. Audit: every communication attempt stores campaign_id, recipient, channel, config_version, timestamp, tenant_id, outcome.

## 3. Voice engine: Bolna
- Agent: "TARA Voice Agent"
- Telephony: Twilio (Trial account, verified numbers only)
- TTS: Sarvam bulbul v3. STT: Deepgram nova-3.
- LLM: custom Groq, Qwen model.
- Languages: Hindi, Telugu, English.
- API: POST https://api.bolna.ai/call { agent_id, recipient_phone_number, from_phone_number, user_data: { ... } }

## 4. Tech stack
- Backend: Python, FastAPI, Pydantic, MongoDB (Motor).
- Frontend: React + Vite + Tailwind. Dark navy theme, STATIC background, cards, subtle borders.
- Auth: JWT login with user_id, tenant_id, role.

## 5. Data model collections
- tenants, users, products, customers, leads, product_matches, campaigns, campaign_configs, campaign_recipients, communications.
