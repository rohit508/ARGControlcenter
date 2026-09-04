import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { useEffect, useState } from "react";
import { isOnline, syncNow } from "../services/offlineApi";
import { pendingCount } from "../services/syncEngine";
import NotificationBell from "../components/ui/NotificationBell";
import Toast from "../components/ui/Toast";
import { useEmployeeTaskStats, useEmployeeTasks } from "../modules/employee-tasks/useEmployeeTasks";
import { roleDisplayLabelsFor } from "../utils/roleLabels";

// Admin's primary workflow group — must render first, in this exact order, per product spec.
// Only items in this list render in the sidebar for Admin; anything else defined in NAV_GROUPS
// below stays reachable by route/permission but is not shown as a nav link.
const ADMIN_PRIMARY_PATHS = [
  "/employee-tasks",
  "/my-tasks",
  "/task-analytics",
  "/admin/configuration",
  "/employees",
  "/admin/rbac",
  "/hr-dashboard",
  "/finance",
  "/shipment-dashboard",
];

const NAV_GROUPS: { label: string; items: { to: string; label: string; roles?: string[] }[] }[] = [
  {
    label: "Employee Tasks",
    items: [
      { to: "/employee-tasks", label: "Task Board", roles: ["Admin"] },
      { to: "/my-team", label: "My Teams", roles: ["DepartmentHead"] },
      { to: "/my-tasks", label: "My Tasks" },
      { to: "/task-analytics", label: "Task Analytics" },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/admin/configuration", label: "Configuration", roles: ["Admin"] },
      { to: "/employees", label: "Employees", roles: ["Admin"] },
      { to: "/admin/rbac", label: "Roles & Permissions", roles: ["Admin"] },
    ],
  },
  { label: "Overview", items: [{ to: "/", label: "Executive Dashboard" }] },
  {
    label: "Project Management",
    items: [
      { to: "/projects", label: "Projects" },
      { to: "/tasks", label: "Tasks" },
      { to: "/resources", label: "Resources" },
      { to: "/risks", label: "Risks" },
      { to: "/issues", label: "Issues" },
      { to: "/budget-entries", label: "Budget Tracker", roles: ["Finance", "ProjectManager"] },
      { to: "/change-requests", label: "Change Log" },
      { to: "/milestones", label: "Milestones" },
      { to: "/meetings", label: "Meeting Log" },
      { to: "/action-items", label: "Action Tracker" },
      { to: "/lessons-learned", label: "Lessons Learned" },
    ],
  },
  {
    label: "CRM",
    items: [
      { to: "/leads", label: "Leads" },
      { to: "/customers", label: "Customers" },
      { to: "/opportunities", label: "Opportunities" },
    ],
  },
  {
    label: "Finance",
    items: [{ to: "/finance", label: "Freight And Finance", roles: ["Finance"] }],
  },
  {
    label: "Procurement",
    items: [
      { to: "/vendors", label: "Vendors", roles: ["Procurement", "Finance"] },
      { to: "/purchase-orders", label: "Purchase Orders", roles: ["Procurement", "Finance"] },
    ],
  },
  {
    label: "HR",
    items: [
      { to: "/hr-dashboard", label: "HR Dashboard", roles: ["HR", "CEO", "Admin"] },
      { to: "/leave-requests", label: "Leave Requests", roles: ["HR"] },
    ],
  },
  {
    label: "Shipment",
    items: [{ to: "/shipment-dashboard", label: "Shipment Dashboard" }],
  },
  {
    label: "Operations",
    items: [
      { to: "/inventory", label: "Inventory" },
      { to: "/manufacturing", label: "Manufacturing" },
      { to: "/assets", label: "Asset Register" },
      { to: "/helpdesk", label: "Help Desk" },
    ],
  },
  {
    label: "Executive",
    items: [{ to: "/analytics", label: "Analytics & Forecasts", roles: ["CEO", "ProjectManager", "Finance"] }],
  },
  { label: "Personal", items: [{ to: "/approvals", label: "My Approvals" }] },
];

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const isLocalCredentialSession = user?.id === 0;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const [online, setOnline] = useState(isOnline());
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const refreshPending = () => pendingCount().then(setPending);
    refreshPending();
    const onOnline = () => {
      setOnline(true);
      syncNow().then(refreshPending);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const interval = setInterval(refreshPending, 5000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, []);

  function logout() {
    clear();
    navigate("/login");
  }

  // Fires once right after a fresh sign-in (LoginPage sets this flag), never on a plain page
  // refresh where the session was just restored from persisted storage. Waits for task stats to
  // actually load before showing the toast, so the count in it is never a stale/zero flash.
  const [loginToastPending, setLoginToastPending] = useState(false);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const { data: taskStatsRes } = useEmployeeTaskStats(undefined, undefined, !isLocalCredentialSession);
  // Mounted here (not just on the pages that display the list) so /employee-tasks fires
  // immediately after sign-in too, same as the stats call above — regardless of which page the
  // user lands on post-login. React Query dedupes this against the same query key already
  // in flight on whichever page also calls useEmployeeTasks(), so it's not a duplicate request.
  useEmployeeTasks(undefined, undefined, undefined, !isLocalCredentialSession);
  useEffect(() => {
    if (sessionStorage.getItem("erp-just-logged-in") === "1") {
      sessionStorage.removeItem("erp-just-logged-in");
      setLoginToastPending(true);
    }
  }, []);
  useEffect(() => {
    if (loginToastPending && (taskStatsRes || isLocalCredentialSession)) {
      setLoginToastPending(false);
      setShowLoginToast(true);
    }
  }, [isLocalCredentialSession, loginToastPending, taskStatsRes]);
  const stats = taskStatsRes?.data;
  const assignedCount = stats ? stats.statusCounts.Pending + stats.statusCounts["In Progress"] : 0;

  // A plain "User" (no other elevated role) is restricted to My Tasks / Task Analytics only —
  // everything else in the app (Projects, CRM, Finance, etc.) requires at least one non-"User"
  // role. Admin always sees everything.
  const isAdmin = user?.roles.includes("Admin") ?? false;
  const isPlainUser = !isAdmin && user?.roles.length === 1 && user.roles[0] === "User";
  // DepartmentHead (without Admin) gets the exact same restricted view as a plain User, plus
  // "My Teams" — not the full normal-user nav (Projects/CRM/Finance/etc.) and not Admin's
  // grayed-out "Coming Soon" treatment either. Admin+DepartmentHead still renders as Admin above.
  const isDepartmentHeadOnly = !isAdmin && (user?.roles.includes("DepartmentHead") ?? false);
  const isRestrictedNavUser = isPlainUser || isDepartmentHeadOnly;
  const USER_ALLOWED_PATHS = isDepartmentHeadOnly ? ["/my-team", "/my-tasks", "/task-analytics"] : ["/my-tasks", "/task-analytics"];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <aside
        className={`${collapsed ? "w-16" : "w-64"} shrink-0 bg-white dark:bg-slate-900 transition-all duration-200 flex flex-col shadow-[1px_0_0_0_rgba(15,23,42,0.06)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.06)]`}
      >
        <div className="h-16 flex items-center gap-2.5 px-4 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            A
          </div>
          {!collapsed && <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">ARG Control center</span>}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {NAV_GROUPS.map((group) => {
            // Plain Users (and DepartmentHead-without-Admin) only ever see their allowed links —
            // everything else stays hidden, not grayed, since admin section names shouldn't be
            // visible to them at all.
            const items = isRestrictedNavUser
              ? group.items.filter((item) => USER_ALLOWED_PATHS.includes(item.to))
              : group.items;
            if (items.length === 0) return null;
            // Disabled ("Coming Soon") items are hidden from the sidebar rather than shown grayed
            // out — still fully defined in NAV_GROUPS/routes below, just not rendered here, so
            // nothing is deleted, only not displayed while unavailable.
            const visibleItems = items.filter((item) =>
              isAdmin ? ADMIN_PRIMARY_PATHS.includes(item.to) : !item.roles || item.roles.some((r) => user?.roles.includes(r))
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label}>
                {!collapsed && (
                  <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{group.label}</div>
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/"}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-xl transition-all duration-150 ${
                            isActive
                              ? "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-100 font-medium ring-1 ring-brand-100 dark:ring-brand-500/20"
                              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-200"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${isActive ? "bg-brand-500" : "bg-transparent"}`} aria-hidden />
                            <span className="truncate">{collapsed ? item.label.slice(0, 1) : item.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="p-3 space-y-2 shrink-0">
          {(!online || pending > 0) && !collapsed && (
            <div className="px-2.5 py-1.5 rounded-lg bg-warning-100 dark:bg-warning-500/15 text-warning-500 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-warning-500 inline-block shrink-0" />
              <span className="truncate">{!online ? "Offline — changes queued locally" : `${pending} change${pending === 1 ? "" : "s"} syncing…`}</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="w-full rounded-lg py-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {collapsed ? "▶" : "◀  Collapse"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4">
          <div className="text-sm text-slate-500">Global search…</div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button onClick={toggleTheme} className="text-sm px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <div className="text-sm text-right">
              <div className="font-medium">{user?.email}</div>
              <div className="text-xs text-slate-400">{roleDisplayLabelsFor(user?.roles ?? [], user?.email)}</div>
            </div>
            <button onClick={logout} className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <Toast
        open={showLoginToast}
        onClose={() => setShowLoginToast(false)}
        icon="👋"
        title={`Welcome back, ${user?.employeeName || user?.email || "there"}`}
        message={
          assignedCount > 0
            ? `You have ${assignedCount} task${assignedCount === 1 ? "" : "s"} assigned to you.`
            : "You have no pending tasks right now."
        }
      />
    </div>
  );
}
