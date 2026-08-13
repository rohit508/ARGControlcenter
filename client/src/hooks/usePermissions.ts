import { useAuthStore } from "../store/authStore";

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  function can(module: string, action: string): boolean {
    if (!user) return false;
    if (user.roles.includes("Admin")) return true;
    return user.permissions.some((p) => p.module === module && p.actions.includes(action));
  }

  return { can };
}
