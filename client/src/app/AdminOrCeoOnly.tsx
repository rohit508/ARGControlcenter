import { ReactNode } from "react";
import { useAuthStore } from "../store/authStore";

// Same pattern as AdminOnly, but also lets CEO through — used for screens like Deleted Tasks
// history where the CEO role (distinct from Admin, see seed.ts) should also have visibility.
export default function AdminOrCeoOnly({ children }: { children: ReactNode }) {
  const isAllowed = useAuthStore((s) => {
    const roles = s.user?.roles ?? [];
    return roles.includes("Admin") || roles.includes("CEO");
  });
  if (!isAllowed) {
    return (
      <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-12 text-center">
        You don't have access to this screen. Ask an administrator for access.
      </div>
    );
  }
  return <>{children}</>;
}
