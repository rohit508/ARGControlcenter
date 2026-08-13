import { ReactNode } from "react";
import { usePermissions } from "../hooks/usePermissions";

interface Props {
  module: string;
  action: string;
  children: ReactNode;
}

// Real, enforced screen-level RBAC — unlike AppShell's nav-link filtering (cosmetic only), this
// blocks the route itself for a user who navigates there directly without the underlying grant.
export default function PermissionGuard({ module, action, children }: Props) {
  const { can } = usePermissions();
  if (!can(module, action)) {
    return (
      <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-12 text-center">
        You don't have access to this screen. Ask an administrator to grant '{action}' on '{module}'.
      </div>
    );
  }
  return <>{children}</>;
}
