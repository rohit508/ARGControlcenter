import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiClientError } from "../services/apiClient";
import { useAuthStore } from "../store/authStore";
import { CurrentUser } from "../types";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@erp.local");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="text-xl font-semibold text-brand-600">ARG Control center</div>
          <div className="text-sm text-slate-400 mt-1">Sign in to continue</div>
        </div>
        {error && <div className="mb-4 text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2">{error}</div>}
        <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Email</label>
        <input
          className="w-full mb-4 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Password</label>
        <input
          className="w-full mb-6 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-md py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <div className="text-xs text-slate-400 mt-4 text-center"></div>
      </form>
    </div>
  );
}
