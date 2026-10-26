import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";

export default function Landing() {
  const faqs = [
    {
      q: "What is TARA?",
      a: "TARA (Targeted Acquisition & Reach Agent) is a voice-first outreach platform built for Indian banks and NBFCs to match borrower fit and automate vernacular phone outreach.",
    },
    {
      q: "Which languages are supported today?",
      a: "Outreach calls run in Hindi, Telugu, and English with dynamic language switching powered by the Bolna voice AI engine.",
    },
    {
      q: "How is regulatory compliance enforced?",
      a: "All outbound calls pass through an independent compliance layer that checks verified consent, national DND registry, 09:00–21:00 IST calling hours, and contact frequency caps before dispatch.",
    },
    {
      q: "Does TARA autonomously decide credit eligibility?",
      a: "No. The system scores affinity and fit against institution policy gates. Credit approval remains strictly governed by the bank's underwriting policy.",
    },
    {
      q: "What voice infrastructure powers TARA?",
      a: "Calls are orchestrated via the Bolna voice agent utilizing Sarvam TTS, Deepgram STT, and Groq-hosted LLMs routed over carrier telephony.",
    },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans selection:bg-ink selection:text-white">
      {/* 1. Top Navigation */}
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-hairline h-16">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="TARA"
              className="h-10 w-auto object-contain"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="t-nav text-body hover:text-ink transition-colors">
              How it works
            </a>
            <a href="#why-different" className="t-nav text-body hover:text-ink transition-colors">
              Why TARA
            </a>
            <a href="#compliance" className="t-nav text-body hover:text-ink transition-colors">
              Compliance
            </a>
            <a href="#faq" className="t-nav text-body hover:text-ink transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button to="/login" variant="outline" size="sm">
              Sign in
            </Button>
            <Button to="/signup" variant="primary" size="sm">
              Create workspace
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section with Static Pastel Gradient Orbs */}
      <section className="relative isolate overflow-hidden py-16 lg:py-24 border-b border-hairline">
        {/* Static Pastel Orbs (Radial gradients, blur filter, zero animation) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
          <div className="w-[320px] h-[320px] rounded-full orb-mint blur-[90px] translate-x-[-140px] translate-y-[-40px]" />
          <div className="w-[360px] h-[360px] rounded-full orb-lavender blur-[100px] translate-x-[120px] translate-y-[-60px]" />
          <div className="w-[280px] h-[280px] rounded-full orb-peach blur-[80px] translate-x-[40px] translate-y-[60px]" />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-card border border-hairline t-label text-body mb-8 shadow-soft">
            <span className="w-1.5 h-1.5 rounded-full bg-semantic-success" />
            <span>Voice-first outreach for Indian BFSI</span>
          </div>

          <h1 className="t-display-mega text-ink max-w-[900px] mx-auto mb-6">
            Reach the right customer, in their own language.
          </h1>

          <p className="t-body-md text-body max-w-[680px] mx-auto mb-10">
            TARA scores customers and leads for product fit, then a voice AI agent calls the right people in Hindi, Telugu or English.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button to="/signup" variant="primary" size="md" className="w-full sm:w-auto">
              <span>Create workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button to="/login" variant="outline" size="md" className="w-full sm:w-auto">
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* 3. How it Works (4 cards) */}
      <section id="how-it-works" className="py-16 lg:py-24 border-b border-hairline">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="mb-12">
            <span className="t-label text-muted-soft block mb-3">Workflow</span>
            <h2 className="t-display-lg text-ink">How TARA works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              { step: "01", title: "Score and match", desc: "Borrower records are evaluated against catalog policy rules without discarding lower propensity bands." },
              { step: "02", title: "Build a campaign", desc: "Construct outreach audiences through explicit fit thresholds, language filters, and eligibility segments." },
              { step: "03", title: "Configure channel", desc: "Version voice prompts, opening lines, information to collect, and retry schedules as structured config." },
              { step: "04", title: "Call and learn", desc: "Voice AI executes vernacular calls, capturing call duration, customer intent, and callback commitments." },
            ].map((item, idx) => (
              <Card key={idx} hoverable className="flex flex-col">
                <span className="t-label text-muted block mb-3">{item.step}</span>
                <h3 className="t-title-sm text-ink mb-2">{item.title}</h3>
                <p className="t-body-sm text-body">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Why it is different (3 cards) */}
      <section id="why-different" className="py-16 lg:py-24 border-b border-hairline">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="mb-12">
            <span className="t-label text-muted-soft block mb-3">Architecture</span>
            <h2 className="t-display-lg text-ink">Why TARA is different</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <Card hoverable className="flex flex-col">
              <h3 className="t-title-sm text-ink mb-2">Multi-product fit ranking</h3>
              <p className="t-body-sm text-body">
                One lead can match many products simultaneously. Lower scores are never deleted; eligibility acts as a filter, preserving the entire audience for cross-sell.
              </p>
            </Card>
            <Card hoverable className="flex flex-col">
              <h3 className="t-title-sm text-ink mb-2">Centralized compliance dispatch</h3>
              <p className="t-body-sm text-body">
                Compliance checks occur at the communication layer, enforcing consent flags, national DND status, 09:00–21:00 IST windows, and frequency caps before calling.
              </p>
            </Card>
            <Card hoverable className="flex flex-col">
              <h3 className="t-title-sm text-ink mb-2">Provider-agnostic API</h3>
              <p className="t-body-sm text-body">
                Campaigns remain independent of telephony vendors. Voice is active today via Bolna, while WhatsApp, SMS, and Email follow the identical API structure.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. Built for Regulated Banking */}
      <section id="compliance" className="py-16 lg:py-24 border-b border-hairline">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="bg-surface-card border border-hairline rounded-xl p-8 lg:p-12 shadow-soft">
            <div className="max-w-[720px]">
              <span className="t-label text-muted-soft block mb-3">Governance</span>
              <h2 className="t-display-lg text-ink mb-4">Built for regulated banking</h2>
              <p className="t-body-md text-body mb-8">
                Strict multi-tenant cryptographic isolation ensures institutional datasets never overlap. Every communication attempt creates a tamper-proof audit trail, with explainable rules governing offer ranking rather than opaque black boxes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2.5 t-body-strong text-ink">
                  <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
                  <span>JWT-bound tenant isolation</span>
                </div>
                <div className="flex items-center gap-2.5 t-body-strong text-ink">
                  <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
                  <span>Full audit trail per attempt</span>
                </div>
                <div className="flex items-center gap-2.5 t-body-strong text-ink">
                  <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
                  <span>Transparent scoring reason codes</span>
                </div>
                <div className="flex items-center gap-2.5 t-body-strong text-ink">
                  <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
                  <span>Policy gates control credit limits</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Status Band */}
      <section className="py-6 bg-surface-strong border-b border-hairline text-center px-6">
        <p className="t-caption text-body">
          <span className="inline-block w-2 h-2 rounded-full bg-semantic-success mr-2" />
          Voice outreach is live. WhatsApp, SMS and Email are on the roadmap.
        </p>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="py-16 lg:py-24 border-b border-hairline">
        <div className="max-w-[900px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="t-label text-muted-soft block mb-3">Answers</span>
            <h2 className="t-display-lg text-ink">Frequently asked questions</h2>
          </div>

          <div className="divide-y divide-hairline">
            {faqs.map((faq, idx) => (
              <div key={idx} className="py-6">
                <h3 className="t-title-sm text-ink mb-2">{faq.q}</h3>
                <p className="t-body-sm text-body">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CTA Band */}
      <section className="py-16 lg:py-24 text-center border-b border-hairline">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="max-w-[700px] mx-auto">
            <h2 className="t-display-lg text-ink mb-4">
              Evaluate voice-first borrower reach
            </h2>
            <p className="t-body-md text-body mb-8">
              Set up an isolated workspace in seconds to test lead matching and vernacular call capabilities.
            </p>
            <Button to="/signup" variant="primary" size="md">
              <span>Create workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="py-12">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between t-caption text-muted gap-4">
          <div>
            <span>Built by Ultrion Tech · 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hover:text-ink transition-colors">How it works</a>
            <a href="#why-different" className="hover:text-ink transition-colors">Why TARA</a>
            <a href="#compliance" className="hover:text-ink transition-colors">Compliance</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
