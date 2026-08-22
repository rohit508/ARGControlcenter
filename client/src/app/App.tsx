import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import AppShell from "./AppShell";
import AuthGuard from "./AuthGuard";
import PermissionGuard from "./PermissionGuard";
import AdminOnly from "./AdminOnly";
import AdminOrCeoOnly from "./AdminOrCeoOnly";
import LoginPage from "../modules/LoginPage";
import HealthBadge from "../components/data-table/HealthBadge";

// Route-level code splitting: each module page ships as its own chunk, loaded on navigation
// instead of all up-front. This is the direct fix for the bundle-size warning flagged after the
// last build (739KB single chunk) — addressed before piling on more modules, not after.
const DashboardPage = lazy(() => import("../modules/dashboard/DashboardPage"));
const ProjectsListPage = lazy(() => import("../modules/projects/ProjectsListPage"));
const ProjectDetailPage = lazy(() => import("../modules/projects/ProjectDetailPage"));
const ChangeRequestsPage = lazy(() => import("../modules/change-requests/ChangeRequestsPage"));
const ApprovalsPage = lazy(() => import("../modules/ApprovalsPage"));
const SimpleListPage = lazy(() => import("../modules/SimpleListPage"));
const ResourcesPage = lazy(() => import("../modules/resources/ResourcesPage"));
const AdminConfigPage = lazy(() => import("../modules/admin/AdminConfigPage"));
const ActionItemsPage = lazy(() => import("../modules/action-items/ActionItemsPage"));
const FinancePage = lazy(() => import("../modules/finance/FinancePage"));
const PurchaseOrdersPage = lazy(() => import("../modules/procurement/PurchaseOrdersPage"));
const InventoryPage = lazy(() => import("../modules/inventory/InventoryPage"));
const ManufacturingPage = lazy(() => import("../modules/manufacturing/ManufacturingPage"));
const AssetsPage = lazy(() => import("../modules/assets/AssetsPage"));
const HelpDeskPage = lazy(() => import("../modules/helpdesk/HelpDeskPage"));
const AnalyticsPage = lazy(() => import("../modules/analytics/AnalyticsPage"));
const EmployeeTasksBoardPage = lazy(() => import("../modules/employee-tasks/EmployeeTasksBoardPage"));
const DeletedTasksPage = lazy(() => import("../modules/employee-tasks/DeletedTasksPage"));
const DepartmentTeamsPage = lazy(() => import("../modules/employee-tasks/DepartmentTeamsPage"));
const MyTeamPage = lazy(() => import("../modules/employee-tasks/MyTeamPage"));
const MyTasksPage = lazy(() => import("../modules/employee-tasks/MyTasksPage"));
const TicketDetailPage = lazy(() => import("../modules/employee-tasks/TicketDetailPage"));
const TaskAnalyticsPage = lazy(() => import("../modules/dashboard/TaskAnalyticsPage"));
const EmployeesPage = lazy(() => import("../modules/employees/EmployeesPage"));
const RbacAdminPage = lazy(() => import("../modules/admin/RbacAdminPage"));

function PageFallback() {
  return <div className="text-slate-400 text-sm">Loading…</div>;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsListPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/change-requests" element={<ChangeRequestsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route
            path="/admin/configuration"
            element={
              <AdminOnly>
                <AdminConfigPage />
              </AdminOnly>
            }
          />
          <Route path="/action-items" element={<ActionItemsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/manufacturing" element={<ManufacturingPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/helpdesk" element={<HelpDeskPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route
            path="/employee-tasks"
            element={
              <PermissionGuard module="employee-tasks" action="create">
                <EmployeeTasksBoardPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/employee-tasks/deleted"
            element={
              <AdminOrCeoOnly>
                <DeletedTasksPage />
              </AdminOrCeoOnly>
            }
          />
          <Route
            path="/employee-tasks/department-teams"
            element={
              <AdminOrCeoOnly>
                <DepartmentTeamsPage />
              </AdminOrCeoOnly>
            }
          />
          <Route path="/my-team" element={<MyTeamPage />} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/my-tasks/:assignmentId" element={<TicketDetailPage />} />
          <Route path="/task-analytics" element={<TaskAnalyticsPage />} />
          <Route
            path="/employees"
            element={
              <PermissionGuard module="employees" action="create">
                <EmployeesPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/admin/rbac"
            element={
              <PermissionGuard module="rbac" action="update">
                <RbacAdminPage />
              </PermissionGuard>
            }
          />

          <Route
            path="/leads"
            element={
              <SimpleListPage
                title="Leads"
                endpoint="/leads"
                columns={[
                  { key: "leadCode", header: "Code" },
                  { key: "companyName", header: "Company" },
                  { key: "contactName", header: "Contact" },
                  { key: "source", header: "Source" },
                  { key: "status", header: "Status" },
                ]}
              />
            }
          />
          <Route
            path="/customers"
            element={
              <SimpleListPage
                title="Customers"
                endpoint="/customers"
                columns={[
                  { key: "customerCode", header: "Code" },
                  { key: "name", header: "Name" },
                  { key: "industry", header: "Industry" },
                  { key: "status", header: "Status" },
                ]}
              />
            }
          />
          <Route
            path="/opportunities"
            element={
              <SimpleListPage
                title="Opportunities"
                endpoint="/opportunities"
                columns={[
                  { key: "opportunityCode", header: "Code" },
                  { key: "name", header: "Name" },
                  { key: "stage", header: "Stage" },
                  { key: "amount", header: "Amount", render: (r) => Number(r.amount).toLocaleString() },
                  { key: "probability", header: "Probability", render: (r) => `${r.probability}%` },
                ]}
              />
            }
          />
          <Route
            path="/vendors"
            element={
              <SimpleListPage
                title="Vendors"
                endpoint="/vendors"
                columns={[
                  { key: "vendorCode", header: "Code" },
                  { key: "name", header: "Name" },
                  { key: "category", header: "Category" },
                  { key: "status", header: "Status" },
                  { key: "rating", header: "Rating" },
                ]}
              />
            }
          />
          <Route
            path="/leave-requests"
            element={
              <SimpleListPage
                title="Leave Requests"
                endpoint="/leave-requests"
                columns={[
                  { key: "leaveCode", header: "Code" },
                  { key: "leaveType", header: "Type" },
                  { key: "startDate", header: "Start" },
                  { key: "endDate", header: "End" },
                  { key: "status", header: "Status" },
                ]}
              />
            }
          />

          <Route
            path="/tasks"
            element={
              <SimpleListPage
                title="Tasks"
                endpoint="/tasks"
                columns={[
                  { key: "taskCode", header: "Code" },
                  { key: "name", header: "Name" },
                  { key: "status", header: "Status" },
                  { key: "progressPct", header: "Progress", render: (r) => `${(r.progressPct * 100).toFixed(0)}%` },
                  { key: "healthCache", header: "Health", render: (r) => <HealthBadge value={r.healthCache} /> },
                  { key: "isCriticalCache", header: "Critical", render: (r) => (r.isCriticalCache ? "Yes" : "No") },
                ]}
              />
            }
          />
          <Route
            path="/risks"
            element={
              <SimpleListPage
                title="Risk Register"
                endpoint="/risks"
                columns={[
                  { key: "riskCode", header: "Code" },
                  { key: "category", header: "Category" },
                  { key: "description", header: "Description" },
                  { key: "riskScoreCache", header: "Score" },
                  { key: "status", header: "Status" },
                ]}
              />
            }
          />
          <Route
            path="/issues"
            element={
              <SimpleListPage
                title="Issue Register"
                endpoint="/issues"
                columns={[
                  { key: "issueCode", header: "Code" },
                  { key: "description", header: "Description" },
                  { key: "severity", header: "Severity" },
                  { key: "status", header: "Status" },
                  { key: "dueDate", header: "Due Date" },
                ]}
              />
            }
          />
          <Route
            path="/budget-entries"
            element={
              <SimpleListPage
                title="Budget Tracker"
                endpoint="/budget-entries"
                columns={[
                  { key: "entryCode", header: "Code" },
                  { key: "costCategory", header: "Category" },
                  { key: "vendorName", header: "Vendor" },
                  { key: "actualCost", header: "Actual Cost", render: (r) => Number(r.actualCost).toLocaleString() },
                  { key: "invoiceStatus", header: "Invoice Status" },
                ]}
              />
            }
          />
          <Route
            path="/milestones"
            element={
              <SimpleListPage
                title="Milestones"
                endpoint="/milestones"
                columns={[
                  { key: "name", header: "Milestone" },
                  { key: "plannedDate", header: "Planned Date" },
                  { key: "actualDate", header: "Actual Date" },
                  { key: "status", header: "Status" },
                ]}
              />
            }
          />
          <Route
            path="/meetings"
            element={
              <SimpleListPage
                title="Meeting Log"
                endpoint="/meetings"
                columns={[
                  { key: "meetingCode", header: "Code" },
                  { key: "meetingDate", header: "Date" },
                  { key: "discussion", header: "Discussion" },
                  { key: "status", header: "Status" },
                ]}
              />
            }
          />
          <Route
            path="/lessons-learned"
            element={
              <SimpleListPage
                title="Lessons Learned"
                endpoint="/lessons-learned"
                columns={[
                  { key: "lessonCode", header: "Code" },
                  { key: "category", header: "Category" },
                  { key: "description", header: "Description" },
                  { key: "recommendation", header: "Recommendation" },
                ]}
              />
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
