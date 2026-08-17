import { ReactNode } from "react";
import { useAuthStore } from "../store/authStore";

// Role-based screen guard for admin-only pages that don't have a module/action permission grant
// (e.g. Configuration). AuthGuard also blocks these paths at the route-group level; this is the
// inner check so the page itself never renders for a non-Admin who slips through.
export default function AdminOnly({ children }: { children: ReactNode }) {
  const isAdmin = useAuthStore((s) => s.user?.roles.includes("Admin") ?? false);
  if (!isAdmin) {
    return (
      <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-12 text-center">
        You don't have access to this screen. Ask an administrator for access.
      </div>
    );
  }
  return <>{children}</>;
}
