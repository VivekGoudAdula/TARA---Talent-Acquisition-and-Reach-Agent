import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/Button";

export default function Signup() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await signup(workspaceName, name, email, password);
      navigate("/app/leads");
    } catch (err) {
      setError(err.message || "Failed to create workspace. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans">
      <div className="w-full max-w-5xl bg-surface-card border border-hairline rounded-xl shadow-soft overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left: Signup Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <Link to="/" className="inline-block mb-5">
                <img
                  src="/logo.png"
                  alt="TARA"
                  className="h-12 w-auto object-contain"
                />
              </Link>
              <h1 className="t-display-md text-ink mb-1.5">Create your workspace</h1>
              <p className="t-body-sm text-muted">
                Deploy an isolated tenant for product matching and voice outreach.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-semantic-error/20 flex items-start gap-2.5 t-caption text-semantic-error">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block t-caption text-body-strong mb-1" htmlFor="workspace-input">
                  Workspace / Institution Name
                </label>
                <input
                  id="workspace-input"
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Apex Regional Bank"
                  className="input-base"
                />
              </div>

              <div>
                <label className="block t-caption text-body-strong mb-1" htmlFor="name-input">
                  Your Full Name
                </label>
                <input
                  id="name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="input-base"
                />
              </div>

              <div>
                <label className="block t-caption text-body-strong mb-1" htmlFor="email-input">
                  Work Email
                </label>
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.com"
                  className="input-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block t-caption text-body-strong mb-1" htmlFor="password-input">
                    Password (min 10)
                  </label>
                  <div className="relative">
                    <input
                      id="password-input"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="input-base pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-3 text-muted hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block t-caption text-body-strong mb-1" htmlFor="confirm-password-input">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password-input"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="input-base"
                  />
                </div>
              </div>

              <Button
                id="signup-submit-btn"
                type="submit"
                disabled={submitting}
                variant="primary"
                size="md"
                className="w-full mt-3"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-hairline t-caption text-muted">
            Already have an active workspace?{" "}
            <Link to="/login" className="text-ink t-body-strong underline underline-offset-4 hover:text-body">
              Sign in
            </Link>
          </div>
        </div>

        {/* Right: Static Pastel Gradient Orb Side Panel (Hidden on Mobile) */}
        <div className="hidden md:flex relative isolate overflow-hidden bg-canvas-soft border-l border-hairline p-12 flex-col justify-between">
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
            <div className="w-[300px] h-[300px] rounded-full orb-sky blur-[90px] translate-x-[-50px] translate-y-[-50px]" />
            <div className="w-[280px] h-[280px] rounded-full orb-rose blur-[80px] translate-x-[70px] translate-y-[60px]" />
            <div className="w-[240px] h-[240px] rounded-full orb-mint blur-[70px] translate-x-[-20px] translate-y-[100px]" />
          </div>

          <div className="relative z-10">
            <span className="t-label text-muted-soft block mb-3">
              Independent Tenant
            </span>
            <h2 className="t-display-lg text-ink">
              Encrypted boundaries from day one.
            </h2>
          </div>

          <div className="relative z-10 bg-surface-card/85 backdrop-blur-sm border border-hairline rounded-xl p-5 shadow-soft">
            <p className="t-caption text-body">
              New workspaces initialize clean with empty registries. Load verified sample borrower portfolios whenever you are ready to test matching rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
