import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { ReactNode } from "react";

// A plain "User" (no other elevated role) is confined to My Tasks / Task Analytics — this must
// match AppShell's USER_ALLOWED_PATHS so the sidebar and direct-URL access agree. Blocking here
// (not just hiding the nav link) is what makes the restriction real rather than cosmetic.
// "/my-tasks" also covers its ticket-detail child route ("/my-tasks/:assignmentId").
const USER_ALLOWED_PATHS = ["/my-tasks", "/task-analytics"];
// DepartmentHead (without Admin) gets the same restriction plus "/my-team" — must match
// AppShell's USER_ALLOWED_PATHS for this role combination.
const DEPARTMENT_HEAD_ALLOWED_PATHS = ["/my-team", "/my-tasks", "/task-analytics"];

function isAllowedPath(pathname: string, allowedPaths: string[]): boolean {
  return allowedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Admin-only screens — blocked here (not just PermissionGuard) so a role that is neither Admin
// nor plain "User" (e.g. Finance) can't reach them by typing the URL directly.
const ADMIN_ONLY_PATHS = ["/admin/configuration", "/employees", "/admin/rbac", "/employee-tasks"];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!accessToken) return <Navigate to="/login" replace />;

  const isAdmin = user?.roles.includes("Admin") ?? false;
  const isPlainUser = !isAdmin && user?.roles.length === 1 && user.roles[0] === "User";
  const isDepartmentHeadOnly = !isAdmin && (user?.roles.includes("DepartmentHead") ?? false);
  const isRestrictedNavUser = isPlainUser || isDepartmentHeadOnly;
  const restrictedAllowedPaths = isDepartmentHeadOnly ? DEPARTMENT_HEAD_ALLOWED_PATHS : USER_ALLOWED_PATHS;

  if (isRestrictedNavUser && !isAllowedPath(location.pathname, restrictedAllowedPaths)) {
    return <Navigate to="/task-analytics" replace />;
  }

  if (!isAdmin && ADMIN_ONLY_PATHS.includes(location.pathname)) {
    return <Navigate to={isRestrictedNavUser ? "/task-analytics" : "/"} replace />;
  }

  // Admin lands on Task Analytics after login — the dashboard root is not part of Admin's
  // primary nav group, so redirect off it instead of rendering the old landing page.
  if (isAdmin && location.pathname === "/") {
    return <Navigate to="/task-analytics" replace />;
  }

  return <>{children}</>;
}
