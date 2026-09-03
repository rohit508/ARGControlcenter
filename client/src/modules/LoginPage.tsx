import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiClientError } from "../services/apiClient";
import { useAuthStore } from "../store/authStore";
import { CurrentUser } from "../types";

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.4 19.4 0 0 1 4.22-5.06M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 8 11 8a19.3 19.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: CurrentUser }>("/auth/login", { email, password });
      setSession(res.accessToken, res.refreshToken, res.user);
      // One-shot flag: AppShell reads this on mount to show the "just logged in" toast, then
      // clears it — so a page refresh (session restored from persisted storage) never re-shows
      // it, only an actual fresh sign-in does.
      sessionStorage.setItem("erp-just-logged-in", "1");
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        {/* Brand panel — hidden on small screens where there's no room for it, form takes the full
            width instead rather than being squeezed alongside it. */}
        <div className="hidden md:flex relative flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white p-10 overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10" aria-hidden />
          <div className="absolute -left-10 bottom-10 w-40 h-40 rounded-full bg-white/10" aria-hidden />
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center font-bold text-lg">
              A
            </div>
            <div className="text-2xl font-bold mt-5">ARG Control center</div>
            <p className="text-sm text-brand-100/90 mt-2 max-w-xs">
              One place to run projects, finance, HR, and operations — sign in with your company account to continue.
            </p>
          </div>
          <div className="relative text-xs text-brand-100/70">© {new Date().getFullYear()} ARG. All rights reserved.</div>
        </div>

        {/* Form panel */}
        <div className="bg-white p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-7 md:hidden text-center">
            <div className="text-xl font-semibold text-brand-600">ARG Control center</div>
          </div>
          <div className="mb-7">
            <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to continue</p>
          </div>

          {error && (
            <div className="mb-4 text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-email" className="block text-sm mb-1.5 text-slate-600 font-medium">
              Email
            </label>
            <div className="relative mb-4">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <MailIcon />
              </span>
              <input
                id="login-email"
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <label htmlFor="login-password" className="block text-sm mb-1.5 text-slate-600 font-medium">
              Password
            </label>
            <div className="relative mb-6">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <LockIcon />
              </span>
              <input
                id="login-password"
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z" />
                </svg>
              )}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
