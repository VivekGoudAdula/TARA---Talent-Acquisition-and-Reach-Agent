import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, ArrowRight, Building2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/Button";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const showDemoLogins = import.meta.env.VITE_SHOW_DEMO_LOGINS === "true";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/app/leads");
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans">
      <div className="w-full max-w-5xl bg-surface-card border border-hairline rounded-xl shadow-soft overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left: Login Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-between">
          <div>
            <div className="mb-8">
              <Link to="/" className="inline-block mb-6">
                <img
                  src="/logo.png"
                  alt="TARA"
                  className="h-12 w-auto object-contain"
                />
              </Link>
              <h1 className="t-display-md text-ink mb-2">Sign in to your workspace</h1>
              <p className="t-body-sm text-muted">
                Enter your institutional credentials to access borrower registries.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-md bg-red-50 border border-semantic-error/20 flex items-start gap-2.5 t-caption text-semantic-error">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block t-caption text-body-strong mb-1.5" htmlFor="email-input">
                  Work email
                </label>
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@bank.com"
                  className="input-base"
                />
              </div>

              <div>
                <label className="block t-caption text-body-strong mb-1.5" htmlFor="password-input">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="input-base pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted hover:text-ink"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                id="login-submit-btn"
                type="submit"
                disabled={submitting}
                variant="primary"
                size="md"
                className="w-full mt-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Optional Demo Logins Panel */}
            {showDemoLogins && (
              <div className="mt-8 pt-6 border-t border-hairline">
                <span className="block t-label text-muted-soft mb-2.5">
                  Demo Workspace Logins
                </span>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("employee@testbank.com", "ChangeMe123!")}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-strong border border-hairline flex items-center justify-between t-caption text-body transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-muted" />
                      <span className="t-body-strong text-ink">Test Bank</span>
                      <span className="text-muted">(employee)</span>
                    </div>
                    <span className="text-muted t-caption">60 leads</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("employee@otherbank.com", "ChangeMe123!")}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-strong border border-hairline flex items-center justify-between t-caption text-body transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-muted" />
                      <span className="t-body-strong text-ink">Other Bank</span>
                      <span className="text-muted">(employee)</span>
                    </div>
                    <span className="text-muted t-caption">15 leads</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-hairline t-caption text-muted">
            Don't have a workspace?{" "}
            <Link to="/signup" className="text-ink t-body-strong underline underline-offset-4 hover:text-body">
              Create workspace
            </Link>
          </div>
        </div>

        {/* Right: Static Pastel Gradient Orb Side Panel (Hidden on Mobile) */}
        <div className="hidden md:flex relative isolate overflow-hidden bg-canvas-soft border-l border-hairline p-12 flex-col justify-between">
          {/* Static Pastel Orbs (Radial gradients, blurred, zero animation) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
            <div className="w-[280px] h-[280px] rounded-full orb-mint blur-[80px] translate-x-[-40px] translate-y-[-50px]" />
            <div className="w-[300px] h-[300px] rounded-full orb-lavender blur-[90px] translate-x-[60px] translate-y-[60px]" />
            <div className="w-[240px] h-[240px] rounded-full orb-peach blur-[70px] translate-x-[-30px] translate-y-[100px]" />
          </div>

          <div className="relative z-10">
            <span className="t-label text-muted-soft block mb-3">
              Vernacular Outreach
            </span>
            <h2 className="t-display-lg text-ink">
              Audience matching meets conversational AI.
            </h2>
          </div>

          <div className="relative z-10 bg-surface-card/85 backdrop-blur-sm border border-hairline rounded-xl p-5 shadow-soft">
            <p className="t-caption text-body">
              "TARA bridges CRM data with automated phone dialogue, executing compliant outreach across regional Indian languages."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
