import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronDown, HelpCircle, Layers, ShieldCheck, Radio } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      num: "01",
      category: "Overview",
      q: "What is TARA?",
      a: "TARA (Targeted Acquisition & Reach Agent) is an institutional voice-first outreach platform built specifically for Indian banks, SFBs, and NBFCs to match borrower fit and automate compliant, vernacular phone outreach at scale.",
    },
    {
      num: "02",
      category: "Vernacular Voice",
      q: "Which languages are supported today?",
      a: "Outreach calls run in Hindi, Telugu, and Indian English with fluid, mid-conversation language switching powered by Bolna voice AI, Sarvam TTS models, and Deepgram STT.",
    },
    {
      num: "03",
      category: "Compliance & DND",
      q: "How is regulatory compliance enforced?",
      a: "All outbound calls pass through an independent, pre-dial compliance gateway that checks verified customer consent flags, cross-references national DND registries, enforces 09:00–21:00 IST calling hours, and applies institutional frequency caps before dispatch.",
    },
    {
      num: "04",
      category: "Underwriting",
      q: "Does TARA autonomously decide credit eligibility?",
      a: "No. TARA scores affinity and matches borrower profiles against catalog policy rules. Credit approval and limit sanctioning remain strictly governed by the bank's underwriting policy.",
    },
    {
      num: "05",
      category: "Telephony & Stack",
      q: "What voice infrastructure powers TARA?",
      a: "Calls are orchestrated via the Bolna voice agent utilizing Sarvam TTS, Deepgram STT, and ultra-low-latency Groq-hosted LLMs routed through enterprise telephony carrier SIP trunks.",
    },
    {
      num: "06",
      category: "Data Isolation",
      q: "How is institutional multi-tenant isolation guaranteed?",
      a: "Strict JWT-bound cryptographic boundaries ensure datasets, scoring models, and call transcripts never cross tenant perimeters. Each financial institution maintains an isolated workspace with tamper-proof audit trails.",
    },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans selection:bg-ink selection:text-white">
      {/* 1. Top Navigation - Transparent floating navbar */}
      <header className="absolute top-0 inset-x-0 z-40 bg-transparent h-20">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="TARA"
              className="h-10 w-auto object-contain"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="t-nav text-ink/80 hover:text-ink transition-colors font-medium">
              How it works
            </a>
            <a href="#why-different" className="t-nav text-ink/80 hover:text-ink transition-colors font-medium">
              Why TARA
            </a>
            <a href="#compliance" className="t-nav text-ink/80 hover:text-ink transition-colors font-medium">
              Compliance
            </a>
            <a href="#faq" className="t-nav text-ink/80 hover:text-ink transition-colors font-medium">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button to="/login" variant="outline" size="sm" className="bg-surface-card/60 backdrop-blur-xs hover:bg-surface-card">
              Sign in
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section - Fullscreen Responsive with Blurred hero.png background and smooth fade to Section 2 */}
      <section className="relative isolate overflow-hidden min-h-screen flex flex-col justify-center items-center pt-20 pb-16">
        {/* Blurred Background Hero Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 filter blur-[6px] scale-105"
          style={{ backgroundImage: "url('/hero.png')" }}
        />
        {/* Subtle compact top vignette for navbar clarity */}
        <div className="absolute top-0 inset-x-0 h-14 sm:h-18 lg:h-24 bg-gradient-to-b from-white/70 via-white/30 to-transparent pointer-events-none z-0" />
        {/* Smooth bottom fade into section 2 (compact edge feather) */}
        <div className="absolute bottom-0 inset-x-0 h-14 sm:h-18 lg:h-24 bg-gradient-to-t from-canvas via-canvas/70 to-transparent pointer-events-none z-0" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 text-center my-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-card/90 backdrop-blur-sm border border-hairline t-label text-body mb-8 shadow-soft">
            <span className="w-1.5 h-1.5 rounded-full bg-semantic-success" />
            <span>Voice-first outreach for Indian BFSI</span>
          </div>

          <h1 className="t-display-mega !font-medium text-ink max-w-[920px] mx-auto mb-6">
            Reach the right customer, in their own language.
          </h1>

          <p className="t-body-md text-body max-w-[680px] mx-auto mb-10">
            TARA scores customers and leads for product fit, then a voice AI agent calls the right people in Hindi, Telugu or English.
          </p>

          <div className="flex items-center justify-center">
            <Button to="/signup" variant="primary" size="md" className="shadow-md">
              <span>Create workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* 3. How it Works (4 cards) - No bottom border to allow smooth transition to Why TARA */}
      <section id="how-it-works" className="py-16 lg:py-24">
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

      {/* 4. Why it is different (3 cards) - Pure whytara.png background */}
      <section
        id="why-different"
        className="relative isolate overflow-hidden min-h-screen flex flex-col justify-center py-20 lg:py-28"
      >
        {/* Background Graphic whytara.png - as it is */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
          style={{ backgroundImage: "url('/whytara.png')" }}
        />

        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10 w-full my-auto -translate-y-6 lg:-translate-y-10">
          <div className="mb-10 lg:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/45 backdrop-blur-md border border-white/60 text-xs font-semibold text-ink mb-3 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
              <span>Architecture</span>
            </div>
            <h2 className="t-display-lg text-ink font-serif tracking-tight">Why TARA is different</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {/* Card 1: Multi-product fit ranking */}
            <div className="flex flex-col justify-between rounded-2xl bg-white/45 backdrop-blur-xl backdrop-saturate-[180%] border border-white/60 p-7 sm:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_12px_36px_rgba(0,0,0,0.06)] hover:bg-white/60 hover:border-white/80 hover:-translate-y-1.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_20px_48px_rgba(0,0,0,0.09)] transition-all duration-300 ease-out group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/65 backdrop-blur-md border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center text-ink mb-5 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5 text-ink" />
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink mb-3 tracking-tight">
                  Multi-product fit ranking
                </h3>
                <p className="t-body-sm text-body leading-relaxed">
                  One lead can match many products simultaneously. Lower scores are never deleted; eligibility acts as a filter, preserving the entire audience for cross-sell.
                </p>
              </div>
            </div>

            {/* Card 2: Centralized compliance dispatch */}
            <div className="flex flex-col justify-between rounded-2xl bg-white/45 backdrop-blur-xl backdrop-saturate-[180%] border border-white/60 p-7 sm:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_12px_36px_rgba(0,0,0,0.06)] hover:bg-white/60 hover:border-white/80 hover:-translate-y-1.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_20px_48px_rgba(0,0,0,0.09)] transition-all duration-300 ease-out group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/65 backdrop-blur-md border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center text-ink mb-5 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5 text-ink" />
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink mb-3 tracking-tight">
                  Centralized compliance dispatch
                </h3>
                <p className="t-body-sm text-body leading-relaxed">
                  Compliance checks occur at the communication layer, enforcing consent flags, national DND status, 09:00–21:00 IST windows, and frequency caps before calling.
                </p>
              </div>
            </div>

            {/* Card 3: Provider-agnostic API */}
            <div className="flex flex-col justify-between rounded-2xl bg-white/45 backdrop-blur-xl backdrop-saturate-[180%] border border-white/60 p-7 sm:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_12px_36px_rgba(0,0,0,0.06)] hover:bg-white/60 hover:border-white/80 hover:-translate-y-1.5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_20px_48px_rgba(0,0,0,0.09)] transition-all duration-300 ease-out group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/65 backdrop-blur-md border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center text-ink mb-5 group-hover:scale-105 transition-transform">
                  <Radio className="w-5 h-5 text-ink" />
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink mb-3 tracking-tight">
                  Provider-agnostic API
                </h3>
                <p className="t-body-sm text-body leading-relaxed">
                  Campaigns remain independent of telephony vendors. Voice is active today via Bolna, while WhatsApp, SMS, and Email follow the identical API structure.
                </p>
              </div>
            </div>
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

      {/* 7. FAQ - Brand New Split Layout with Interactive Accordion & Support Card */}
      <section id="faq" className="py-20 lg:py-28 relative">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.45fr] gap-12 lg:gap-16 items-start">
            
            {/* Left: Sticky Overview & Support Card */}
            <div className="lg:sticky lg:top-28 space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-card border border-hairline t-label text-body mb-4 shadow-soft">
                  <HelpCircle className="w-3.5 h-3.5 text-ink" />
                  <span>Answers & Clarity</span>
                </div>
                <h2 className="t-display-lg text-ink font-serif mb-4">
                  Frequently asked questions
                </h2>
                <p className="t-body-md text-body leading-relaxed">
                  Everything you need to know about TARA's multi-product propensity matching, compliance dispatch barriers, and vernacular voice AI pipelines.
                </p>
              </div>

              {/* Persona Support Card */}
              <div className="p-6 rounded-2xl bg-surface-card border border-hairline shadow-soft relative overflow-hidden">
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-hairline/80 bg-surface-strong shrink-0 shadow-xs">
                    <img src="/person.png" alt="TARA AI Persona" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="t-body-strong text-ink">Have custom requirements?</h4>
                    <p className="t-caption text-muted">Institutional Onboarding</p>
                  </div>
                </div>
                <p className="t-body-sm text-body mb-5 leading-relaxed">
                  Need customized underwriting rule calibration, dedicated SIP carrier routing, or on-premise catalog connectors?
                </p>
                <Button to="/signup" variant="primary" size="sm" className="w-full justify-center">
                  <span>Start institutional sandbox</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Right: Interactive Modern Accordion */}
            <div className="space-y-3.5">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      isOpen
                        ? "bg-surface-card border-ink/20 shadow-soft ring-1 ring-ink/5"
                        : "bg-surface-card/75 hover:bg-surface-card border-hairline hover:border-hairline-strong"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-4 cursor-pointer select-none group"
                      aria-expanded={isOpen}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="font-mono text-xs font-semibold text-muted tracking-wider">
                            {faq.num}
                          </span>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-strong border border-hairline text-body">
                            {faq.category}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-serif font-semibold text-ink leading-snug group-hover:text-ink/80 transition-colors">
                          {faq.q}
                        </h3>
                      </div>

                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 mt-1 ${
                          isOpen
                            ? "bg-ink text-white border-ink rotate-180"
                            : "bg-surface-strong text-muted border-hairline group-hover:border-hairline-strong"
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base text-body leading-relaxed border-t border-hairline/60">
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </section>

      {/* 8. Bottom CTA & Footer with footer.png background */}
      <div className="relative isolate overflow-hidden">
        {/* Background Footer Graphic with subtle blur */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 filter blur-[2px] scale-102 opacity-95"
          style={{ backgroundImage: "url('/footer.png')" }}
        />
        {/* Top vignette for seamless fade transition from FAQ into footer area - zero border lines */}
        <div className="absolute top-0 inset-x-0 h-24 sm:h-32 lg:h-44 bg-gradient-to-b from-canvas via-canvas/70 to-transparent pointer-events-none z-0" />
        {/* Bottom vignette to smoothly fade lowest edge */}
        <div className="absolute bottom-0 inset-x-0 h-16 sm:h-24 bg-gradient-to-t from-canvas/80 to-transparent pointer-events-none z-0" />

        {/* CTA Band - no separation lines, smooth fade */}
        <section className="relative z-10 py-24 lg:py-36 text-center">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
            <div className="max-w-[700px] mx-auto">
              <h2 className="t-display-lg !font-normal text-ink mb-4">
                Evaluate voice-first borrower reach
              </h2>
              <p className="t-body-md text-ink/90 font-medium mb-8">
                Set up an isolated workspace in seconds to test lead matching and vernacular call capabilities.
              </p>
              <Button to="/signup" variant="primary" size="md" className="shadow-md">
                <span>Create workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
