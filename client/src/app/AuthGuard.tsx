import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { ReactNode } from "react";

// A plain "User" (no other elevated role) is confined to My Tasks / Task Analytics — this must
// match AppShell's USER_ALLOWED_PATHS so the sidebar and direct-URL access agree. Blocking here
// (not just hiding the nav link) is what makes the restriction real rather than cosmetic.
const USER_ALLOWED_PATHS = ["/my-tasks", "/task-analytics"];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!accessToken) return <Navigate to="/login" replace />;

  const isAdmin = user?.roles.includes("Admin") ?? false;
  const isPlainUser = !isAdmin && user?.roles.length === 1 && user.roles[0] === "User";
  if (isPlainUser && !USER_ALLOWED_PATHS.includes(location.pathname)) {
    return <Navigate to="/my-tasks" replace />;
  }

  return <>{children}</>;
}
