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
// Items here are active for Admin; every other nav item is rendered visible-but-disabled (gray,
// unclickable) for Admin rather than hidden, so the full app surface stays discoverable.
const ADMIN_PRIMARY_PATHS = [
  "/employee-tasks",
  "/my-tasks",
  "/task-analytics",
  "/admin/configuration",
  "/employees",
  "/admin/rbac",
  "/hr-dashboard",
  "/finance",
  "http://192.168.18.200:91/login",
];

interface NavItem {
  to: string;
  label: string;
  roles?: string[];
  // Opens in a new tab instead of routing internally — for links to systems outside this app
  // (e.g. a separate HR tool's own login page). Kept as its own field rather than overloading
  // "to" so the role/active-link logic below doesn't need to special-case external targets.
  externalUrl?: string;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
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
    items: [{ to: "/finance", label: "Finance Dashboard", roles: ["Finance"] }],
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
      // Not a route in this app — opens the separate HR system's own login page in a new tab.
      // "to" still needs a unique value (used as the React key and for role/active-state checks
      // elsewhere), so it reuses the external URL there too; externalUrl is what the render logic
      // below actually checks to decide between <NavLink> and a plain <a target="_blank">.
      { to: "http://192.168.18.200:91/login", label: "Set Up", roles: ["HR", "CEO", "Admin"], externalUrl: "http://192.168.18.200:91/login" },
      { to: "/leave-requests", label: "Leave Requests", roles: ["HR"] },
    ],
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
        className={`${collapsed ? "w-16" : "w-60"} shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-150 flex flex-col`}
      >
        <div className="h-14 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <span className="font-semibold text-brand-600 dark:text-brand-100 truncate">{collapsed ? "A" : "ARG Control center"}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map((group) => {
            // Plain Users (and DepartmentHead-without-Admin) only ever see their allowed links —
            // everything else stays hidden, not grayed, since admin section names shouldn't be
            // visible to them at all.
            const items = isRestrictedNavUser
              ? group.items.filter((item) => USER_ALLOWED_PATHS.includes(item.to))
              : group.items;
            if (items.length === 0) return null;
            const groupDisabled =
              isAdmin && items.every((item) => !ADMIN_PRIMARY_PATHS.includes(item.to));
            return (
              <div key={group.label} className="mb-3">
                {!collapsed && (
                  <div
                    className={`px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide ${
                      groupDisabled ? "text-slate-300 dark:text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {group.label}
                    {groupDisabled && <span className="ml-1 font-normal normal-case text-slate-300 dark:text-slate-700">(Coming Soon)</span>}
                  </div>
                )}
                {items.map((item) => {
                  const allowed = isAdmin
                    ? ADMIN_PRIMARY_PATHS.includes(item.to)
                    : !item.roles || item.roles.some((r) => user?.roles.includes(r));

                  if (!allowed) {
                    return (
                      <span
                        key={item.to}
                        aria-disabled="true"
                        title="Not available for your role"
                        className="flex items-center gap-2 px-4 py-2 text-sm rounded-md mx-2 text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed pointer-events-none select-none"
                      >
                        {collapsed ? item.label.slice(0, 1) : item.label}
                        {/* Whole-group case already shows "(Coming Soon)" once on the group
                            heading above — only repeat it here for a mixed group (some items
                            active, this one not), so the tag isn't shown twice for the same item. */}
                        {!collapsed && !groupDisabled && <span className="text-[10px] font-normal text-slate-400 dark:text-slate-600">(Coming Soon)</span>}
                      </span>
                    );
                  }

                  if (item.externalUrl) {
                    return (
                      <a
                        key={item.to}
                        href={item.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Opens ${item.externalUrl} in a new tab`}
                        className="flex items-center gap-2 px-4 py-2 text-sm rounded-md mx-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {collapsed ? item.label.slice(0, 1) : item.label}
                        {!collapsed && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 shrink-0">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <path d="M15 3h6v6" />
                            <path d="M10 14 21 3" />
                          </svg>
                        )}
                      </a>
                    );
                  }

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-4 py-2 text-sm rounded-md mx-2 ${
                          isActive
                            ? "bg-brand-600 text-white"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`
                      }
                    >
                      {collapsed ? item.label.slice(0, 1) : item.label}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <button
          onClick={toggleSidebar}
          className="m-2 rounded-md border border-slate-200 dark:border-slate-800 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {collapsed ? "▶" : "◀ Collapse"}
        </button>
        {(!online || pending > 0) && !collapsed && (
          <div className="mx-2 mb-2 px-2 py-1.5 rounded-md bg-warning-100 text-warning-500 text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning-500 inline-block" />
            {!online ? "Offline — changes queued locally" : `${pending} change${pending === 1 ? "" : "s"} syncing…`}
          </div>
        )}
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
