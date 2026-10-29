import React from "react";
import { ArrowRight, Shield, Sparkles, Languages, Clock } from "lucide-react";
import Button from "../Button";

/**
 * HeroSection Component
 * Displays the main value proposition, primary CTAs, and capability proof strip.
 */
export default function HeroSection() {
  const proofTags = [
    { text: "Explainable product matching", icon: Sparkles },
    { text: "Voice AI in 3 Indian languages", icon: Languages },
    { text: "Consent and calling-hour controls", icon: Clock },
    { text: "Per-bank data isolation", icon: Shield },
  ];

  return (
    <section className="relative isolate overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24">
      {/* Blurred Background Hero Image (Static, zero animation) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 filter blur-[8px] scale-105 opacity-85"
        style={{ backgroundImage: "url('/hero.png')" }}
      />
      {/* Top and Bottom Vignettes for smooth integration into canvas (#f5f5f5) */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-white/80 via-white/40 to-transparent pointer-events-none z-10" />
      <div
        className="absolute bottom-0 inset-x-0 h-44 sm:h-64 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(to top, #f5f5f5 0%, rgba(245, 245, 245, 0.95) 20%, rgba(245, 245, 245, 0.7) 50%, rgba(245, 245, 245, 0.25) 80%, transparent 100%)",
        }}
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        {/* Main Hero Header */}
        <div className="text-center max-w-[880px] mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-card/90 backdrop-blur-sm border border-hairline t-label text-body mb-5 shadow-soft">
            <span className="w-1.5 h-1.5 rounded-full bg-semantic-success" />
            <span>Enterprise customer intelligence for lenders</span>
          </div>

          <h1 className="t-display-mega !font-normal text-ink mb-6 tracking-tight font-serif">
            Turn customer data into
            <span className="block font-bold text-ink">targeted growth</span>
          </h1>

          <p className="t-body-md text-body max-w-[700px] mx-auto mb-8 font-sans leading-relaxed">
            TARA helps lending teams identify high-fit prospects, understand why each one fits, and reach them with a voice AI agent in Hindi, Telugu or English.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button to="/signup" variant="primary" size="md" className="shadow-md text-sm">
              <span>Create workspace</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button to="/login" variant="outline" size="md" className="bg-surface-card/80 backdrop-blur-xs text-sm">
              <span>Sign in</span>
            </Button>
          </div>
        </div>

        {/* Hero Proof Strip (4 factual capability tags, no numbers except language count) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-[980px] mx-auto">
          {proofTags.map((tag, idx) => {
            const Icon = tag.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-card/90 backdrop-blur-sm border border-hairline shadow-soft"
              >
                <div className="w-7 h-7 rounded-lg bg-surface-strong flex items-center justify-center text-ink shrink-0">
                  <Icon className="w-3.5 h-3.5 text-ink" />
                </div>
                <span className="text-xs font-medium text-ink">{tag.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
