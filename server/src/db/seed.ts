import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { db, sqlite } from "./client";
import {
  roles,
  permissions,
  rolePermissions,
  departments,
  employees,
  users,
  userRoles,
  lookupLists,
  lookupValues,
  projects,
  tasks,
  budgetEntries,
  risks,
  issues,
  milestones,
  workflowDefinitions,
  comments,
  notifications,
  employeeTasks,
  employeeTaskAssignments,
} from "./schema";
import { customers, leads, opportunities, chartOfAccounts, journalEntries, journalLines, vendors, purchaseOrders, poLines, leaveRequests } from "./schema.phase2";
import { warehouses, stockItems, boms, bomLines, assets, tickets } from "./schema.phase3";
import { recalculateProject } from "../modules/projects/projects.service";
import { recordStockTransaction } from "../modules/inventory/inventory.service";

// ---- real employee roster (docs/employee-account-reset-requirements.md) ----
// `key` disambiguates the two "Usman" and two "Mumtaz" entries so generated emails never
// collide; it has no other meaning and is never shown to the person.
type RosterRow = { name: string; designation: string; key?: string; roles: string[]; dept: number };

// Department indices refer to deptNames below: Leadership/Executive=0, Sales & Marketing=1,
// Cargo Operations=2, Aviation/Airport IFC=3, Fisheries=4, IT & Automation=5,
// Finance & Accounts=6, HR & Admin=7, Legal=8, Support Staff=9. Assigned by best fit from
// designation — this is a login/records system, not an attempt to model the real org chart
// precisely.
const roster: RosterRow[] = [
  { name: "Syed Shujaat Ali", designation: "Group Chairman", roles: ["Admin", "CEO"], dept: 0 },
  { name: "Shamshad Ali", designation: "Senior Vice Chairman", roles: ["User"], dept: 0 },
  { name: "Vania Ali", designation: "Sales & Marketing", roles: ["User"], dept: 1 },
  { name: "Shiraan Ali", designation: "Sales & Marketing", roles: ["User"], dept: 1 },
  { name: "Asad Ali", designation: "Group Director", roles: ["Admin", "DepartmentHead"], dept: 0 },
  { name: "Muhammad Adeel", designation: "Manager Supply Chain", roles: ["User"], dept: 2 },
  { name: "Kashif Bashir", designation: "Director IFC ISB", roles: ["User"], dept: 3 },
  { name: "Brig Nayyar Abbas Zaidi", designation: "Sale Support", roles: ["User"], dept: 1 },
  { name: "AVM Hussain", designation: "Sale Support", roles: ["User"], dept: 1 },
  { name: "Ibad Jabbar", designation: "Business Development", roles: ["User"], dept: 1 },
  { name: "Usman", designation: "Business Development", key: "bizdev", roles: ["User"], dept: 1 },
  { name: "Atif Tasneem", designation: "Manager OEP KSA", roles: ["User"], dept: 4 },
  { name: "Zaheer Ahmed", designation: "Group Manager", roles: ["User"], dept: 0 },
  { name: "Muhammad Meer", designation: "Assistant KSA (Seafood Division)", roles: ["User"], dept: 4 },
  { name: "Kanwal", designation: "Aviation Assistant KHI", roles: ["User"], dept: 3 },
  { name: "Ziaullah", designation: "Microbiologist", roles: ["User"], dept: 4 },
  { name: "Tahir Hussain", designation: "Manager", roles: ["User"], dept: 2 },
  { name: "Mohammad Tariq Zubair Khan", designation: "Cargo Manager/Sales and Operation", roles: ["User"], dept: 2 },
  { name: "Adnan Shahid", designation: "Assistant Manager Cargo Sales and Operation", roles: ["User"], dept: 2 },
  { name: "Ahsan Ali", designation: "Cargo Operation South", roles: ["User"], dept: 2 },
  { name: "Syed Azfal Ali Zahidi", designation: "CFO", roles: ["User"], dept: 6 },
  { name: "Kashif Ali", designation: "Travel Manager", roles: ["User"], dept: 3 },
  { name: "Muharram Ali", designation: "Manager Operation", roles: ["User"], dept: 2 },
  { name: "Gohar Mehdi", designation: "IT Manager/Asst. Manager Finance", roles: ["User"], dept: 5 },
  { name: "Inshaal Ali Khan", designation: "Assistant Operation Manager IFC", roles: ["User"], dept: 3 },
  { name: "Jahanzaib Saleem", designation: "Assistant Operation Manager IFC", roles: ["User"], dept: 3 },
  { name: "Shaharyar Ali", designation: "Assistant Operation Manager IFC", roles: ["User"], dept: 3 },
  { name: "Shazhad Rahim Ali", designation: "Admin Manager/HR IFC", roles: ["User"], dept: 7 },
  { name: "Asad Naviad", designation: "AI-Automation Engineer", roles: ["User"], dept: 5 },
  { name: "M. Danish Meraj", designation: "AI-Automation Engineer - Intern", roles: ["User"], dept: 5 },
  { name: "Shazaib Ahmed", designation: "Business Process Analyst", roles: ["User"], dept: 5 },
  { name: "Ajiya Anwar", designation: "AI-Automation Engineer", roles: ["User"], dept: 5 },
  { name: "MarJan Farooqui", designation: "Legal Officer/HR Manager", roles: ["User"], dept: 8 },
  { name: "Muhammad Qasim", designation: "Assistant Manager", roles: ["User"], dept: 2 },
  { name: "Shehbaz Ahmed", designation: "Director/Country Manager", roles: ["User"], dept: 0 },
  { name: "Razia Ashraf", designation: "Assistant Manager LHE", roles: ["User"], dept: 2 },
  { name: "Ghulm Sadiq", designation: "Manager LHE", roles: ["User"], dept: 2 },
  { name: "Ishtiaq Ahmed", designation: "Office Accounts Assistant", roles: ["User"], dept: 6 },
  { name: "Mumtaz Hussain", designation: "", roles: ["User"], dept: 9 },
  { name: "Muhammad Amjad SKT", designation: "Asst Manager Operation", roles: ["User"], dept: 2 },
  { name: "Muhammad Qasim SKT", designation: "Cargo Operation North", roles: ["User"], dept: 2 },
  { name: "Danish", designation: "Delivery Boy", roles: ["User"], dept: 9 },
  { name: "Hasnain", designation: "Office Assistant", roles: ["User"], dept: 9 },
  { name: "Shoaib", designation: "Office Boy", roles: ["User"], dept: 9 },
  { name: "Saif ur Rehman", designation: "Office Boy", roles: ["User"], dept: 9 },
  { name: "Raza Saleem", designation: "Delivery Boy", roles: ["User"], dept: 9 },
  { name: "Ramm Chand", designation: "Sweeper", roles: ["User"], dept: 9 },
  { name: "Guard 1", designation: "Office", roles: ["User"], dept: 9 },
  { name: "Guard 2", designation: "Office", roles: ["User"], dept: 9 },
  { name: "Hanif Mashi", designation: "Airport IFC", roles: ["User"], dept: 3 },
  { name: "Shoukat Mashi", designation: "Airport IFC", roles: ["User"], dept: 3 },
  { name: "Nabeel", designation: "Airport IFC", roles: ["User"], dept: 3 },
  { name: "Wasim Salamat", designation: "Airport IFC", roles: ["User"], dept: 3 },
  { name: "Syed Zaki Hussain", designation: "Airport M&S", roles: ["User"], dept: 3 },
  { name: "Amin Yar Khan", designation: "Airport M&S", roles: ["User"], dept: 3 },
  { name: "Merajuddin", designation: "Airport M&S", roles: ["User"], dept: 3 },
  { name: "Shabbir", designation: "Masum Airport", roles: ["User"], dept: 3 },
  { name: "Imam Airport Masjid", designation: "Airport-IFC", roles: ["User"], dept: 3 },
  { name: "Usman", designation: "Fisheries", key: "fisheries", roles: ["User"], dept: 4 },
  { name: "Sarfaraz", designation: "Fisheries", roles: ["User"], dept: 4 },
  { name: "Abdul", designation: "Fisheries", roles: ["User"], dept: 4 },
  { name: "Zeeshan", designation: "Fisheries", roles: ["User"], dept: 4 },
  { name: "Umair", designation: "Fisheries", roles: ["User"], dept: 4 },
  { name: "Abdullah", designation: "Fisheries", roles: ["User"], dept: 4 },
  { name: "Mumtaz", designation: "Fisheries", key: "fisheries", roles: ["User"], dept: 4 },
  { name: "Guard 3", designation: "House", roles: ["User"], dept: 9 },
  { name: "Guard 4", designation: "House", roles: ["User"], dept: 9 },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(".");
}

// Builds a unique, stable local part for each roster row: "firstname.lastname@erp.local", with
// the disambiguation `key` appended only for the handful of duplicate names (the two Usmans, two
// Mumtazes) and a numeric suffix as a last-resort fallback if a slug still collides.
function buildEmails(rows: RosterRow[]): string[] {
  const used = new Set<string>();
  return rows.map((r) => {
    let base = slugify(r.name);
    if (r.key) base = `${base}.${r.key}`;
    let candidate = `${base}@erp.local`;
    let n = 2;
    while (used.has(candidate)) {
      candidate = `${base}${n}@erp.local`;
      n++;
    }
    used.add(candidate);
    return candidate;
  });
}

// Deterministic, not random: password = "<username>@demo123" where <username> is the local part
// of the person's @erp.local login email. This means re-running the seed always regenerates the
// exact same password for the exact same person — the previous version used crypto.randomBytes,
// which produced a brand-new password every single reseed and made every previously-shared
// credential stop working. Fine for this dev/demo roster; a real launch would need real
// self-service password resets instead of a shared guessable pattern.
function passwordFor(loginEmail: string): string {
  const username = loginEmail.split("@")[0];
  return `${username}@demo123`;
}

async function main() {
  console.log("Seeding database...");

  // ---- wipe existing data (idempotent re-seed for dev) ----
  const tableNames = [
    "tickets", "kb_articles",
    "maintenance_logs", "assets",
    "production_orders", "bom_lines", "boms", "work_centers",
    "stock_transactions", "stock_levels", "stock_items", "warehouses",
    "attendance_records", "leave_requests", "po_lines", "purchase_orders", "vendors",
    "journal_lines", "journal_entries", "chart_of_accounts", "opportunities", "contacts", "leads", "customers",
    "kpi_snapshots", "lessons_learned", "action_items", "meeting_attendees", "meetings",
    "milestones", "change_requests", "issues", "risks", "budget_entries", "tasks", "project_shares",
    "projects", "lookup_values", "lookup_lists", "workflow_actions", "workflow_instances",
    "workflow_definitions", "notifications", "comments", "attachments", "audit_log",
    "employee_task_assignments", "employee_tasks",
    "refresh_tokens", "user_roles", "users", "employees", "departments", "role_permissions",
    "permissions", "roles",
  ];
  for (const t of tableNames) sqlite.exec(`DELETE FROM ${t}`);
  // Every table above uses drizzle's autoIncrement:true (SQLite AUTOINCREMENT), which never
  // reuses ids even after a DELETE — so re-running this script repeatedly drifts ids upward and
  // breaks the handful of hardcoded literal FK references below (e.g. projectId: 1). Resetting
  // the counter here is what actually makes the "idempotent re-seed for dev" comment above true.
  sqlite.exec("DELETE FROM sqlite_sequence");

  // ---- workflow definitions (the generic engine's config, not code) ----
  await db.insert(workflowDefinitions).values([
    {
      code: "change_request_approval",
      name: "Change Request Approval",
      entityType: "change_request",
      stepsJson: JSON.stringify([
        { step: 1, name: "Project Manager Review", approverRole: "ProjectManager", slaHours: 48 },
        { step: 2, name: "Finance Sign-off", approverRole: "Finance", slaHours: 72 },
      ]),
    },
    {
      code: "purchase_order_approval",
      name: "Purchase Order Approval",
      entityType: "purchase_order",
      stepsJson: JSON.stringify([
        { step: 1, name: "Procurement Review", approverRole: "Procurement", slaHours: 24 },
        { step: 2, name: "Finance Approval", approverRole: "Finance", slaHours: 48 },
      ]),
    },
  ]);

  // ---- roles ----
  // "User" is the default role for every non-admin employee in the real roster (see
  // docs/employee-account-reset-requirements.md). It gets the same baseline grants "Employee"
  // had (own leave requests) — kept as a separate role name rather than renaming "Employee" so
  // any other code/tests referencing "Employee" don't silently break.
  const roleNames = ["Admin", "CEO", "ProjectManager", "Finance", "HR", "Procurement", "DepartmentHead", "Employee", "User", "Client", "Vendor", "Auditor"];
  const roleRows = await db.insert(roles).values(roleNames.map((name) => ({ name }))).returning();
  const roleId = Object.fromEntries(roleRows.map((r) => [r.name, r.id]));

  // ---- permissions: module x action grid for Phase-1 and Phase-2 modules ----
  const modules = [
    "projects", "tasks", "risks", "issues", "budget", "change-requests", "milestones", "meetings",
    "action-items", "lessons-learned", "configuration",
    "leads", "customers", "opportunities", "finance", "vendors", "purchase-orders",
    "leave-requests", "attendance",
    "inventory", "manufacturing", "assets", "tickets", "kb-articles",
    "employee-tasks", "employees", "rbac",
  ];
  const actions = ["create", "update", "delete"];
  const permRows = await db
    .insert(permissions)
    .values(modules.flatMap((module) => actions.map((action) => ({ module, action }))))
    .returning();

  // Admin: everything. ProjectManager: full CRUD on PMO modules. Finance: full CRUD on budget +
  // finance GL, read elsewhere. Procurement: vendors + purchase orders. HR: leave + attendance.
  const grants: { role: string; module: string; action: string }[] = [];
  for (const m of modules) for (const a of actions) grants.push({ role: "Admin", module: m, action: a });
  for (const m of ["projects", "tasks", "risks", "issues", "change-requests", "milestones", "meetings", "action-items", "lessons-learned"]) {
    for (const a of actions) grants.push({ role: "ProjectManager", module: m, action: a });
  }
  for (const m of ["budget", "finance"]) for (const a of actions) grants.push({ role: "Finance", module: m, action: a });
  for (const m of ["vendors", "purchase-orders"]) for (const a of actions) grants.push({ role: "Procurement", module: m, action: a });
  for (const a of actions) grants.push({ role: "HR", module: "leave-requests", action: a });
  for (const a of actions) grants.push({ role: "HR", module: "attendance", action: a });
  // Employees/Users can create and update their own leave requests, but not delete them once submitted
  grants.push({ role: "Employee", module: "leave-requests", action: "create" });
  grants.push({ role: "Employee", module: "leave-requests", action: "update" });
  grants.push({ role: "User", module: "leave-requests", action: "create" });
  grants.push({ role: "User", module: "leave-requests", action: "update" });
  // No Employee/User grant for "employee-tasks": listing/status-update on that module is scoped
  // by row ownership (are you the assignee?) in employee-tasks.service.ts, not by
  // requirePermission — a permission grant there would only matter for *managing other people's*
  // tasks.

  const permByKey = Object.fromEntries(permRows.map((p) => [`${p.module}:${p.action}`, p.id]));
  const seenGrants = new Set<string>();
  const dedupedGrantRows = grants
    .filter((g) => roleId[g.role] && permByKey[`${g.module}:${g.action}`])
    .map((g) => ({ roleId: roleId[g.role], permissionId: permByKey[`${g.module}:${g.action}`] }))
    .filter((g) => {
      const key = `${g.roleId}:${g.permissionId}`;
      if (seenGrants.has(key)) return false; // defends against a duplicate grant slipping in
      seenGrants.add(key);
      return true;
    });
  await db.insert(rolePermissions).values(dedupedGrantRows);

  // ---- departments ----
  const deptNames = [
    "Leadership/Executive",
    "Sales & Marketing",
    "Cargo Operations",
    "Aviation/Airport IFC",
    "Fisheries",
    "IT & Automation",
    "Finance & Accounts",
    "HR & Admin",
    "Legal",
    "Support Staff",
  ];
  const deptRows = await db.insert(departments).values(deptNames.map((name) => ({ name }))).returning();

  // ---- employees (real roster — see docs/employee-account-reset-requirements.md) ----
  const empRows = await db
    .insert(employees)
    .values(
      roster.map((r, i) => ({
        employeeCode: `EMP-${String(i + 1).padStart(3, "0")}`,
        fullName: r.name,
        roleTitle: r.designation || undefined,
        departmentId: deptRows[r.dept].id,
        capacityHoursPerMonth: 160,
      }))
    )
    .returning();

  // ---- users (login accounts) — one per roster entry, every employee gets a login ----
  const loginEmails = buildEmails(roster);
  const plainPasswords = loginEmails.map((email) => passwordFor(email));
  const passwordHashes = await Promise.all(plainPasswords.map((p) => bcrypt.hash(p, 10)));

  const userRows = await db
    .insert(users)
    .values(
      roster.map((r, i) => ({
        email: loginEmails[i],
        passwordHash: passwordHashes[i],
        employeeId: empRows[i].id,
      }))
    )
    .returning();

  await db.insert(userRoles).values(
    roster.flatMap((r, i) => r.roles.map((roleName) => ({ userId: userRows[i].id, roleId: roleId[roleName] })))
  );

  const employeeIdToUserId: Record<number, number> = {};
  roster.forEach((_, i) => {
    employeeIdToUserId[empRows[i].id] = userRows[i].id;
  });

  // ---- write generated credentials to a local, gitignored file for secure distribution ----
  // Never printed to the console/logs in full — only the file path is logged below.
  const credentialsPath = path.join(__dirname, "..", "..", "CREDENTIALS.local.csv");
  const csvLines = ["name,designation,email,roles,password"];
  roster.forEach((r, i) => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    csvLines.push([esc(r.name), esc(r.designation), esc(loginEmails[i]), esc(r.roles.join("+")), esc(plainPasswords[i])].join(","));
  });
  fs.writeFileSync(credentialsPath, csvLines.join("\n") + "\n", { encoding: "utf-8" });

  // Convenience indices into the new roster for reassigning demo business data below.
  // (0-based against `roster`/`empRows`/`userRows`.)
  const iChairman = 0; // Syed Shujaat Ali — Admin+CEO
  const iDirector = 4; // Asad Ali — Admin+Director
  const iSalesA = 2; // Vania Ali — Sales & Marketing
  const iSalesB = 3; // Shiraan Ali — Sales & Marketing
  const iSupplyChain = 5; // Muhammad Adeel — Manager Supply Chain
  const iCFO = 20; // Syed Azfal Ali Zahidi — CFO
  const iITMgr = 23; // Gohar Mehdi — IT Manager/Asst. Manager Finance
  const iCargoMgr = 17; // Mohammad Tariq Zubair Khan — Cargo Manager/Sales and Operation
  const iCargoAsst = 18; // Adnan Shahid — Assistant Manager Cargo Sales and Operation
  const iBizDev = 10; // Usman (Business Development)
  const iHRMgr = 27; // Shazhad Rahim Ali — Admin Manager/HR IFC
  const iOpsAssist = 42; // Hasnain — Office Assistant

  // ---- lookup lists (Configuration) ----
  const lists: Record<string, string[]> = {
    project_status: ["Not Started", "In Progress", "On Hold", "Completed", "Delayed", "Cancelled"],
    task_status: ["Not Started", "In Progress", "Completed", "Delayed", "Blocked"],
    priority: ["Critical", "High", "Medium", "Low"],
    risk_category: ["Technical", "Financial", "Schedule", "Resource", "Scope", "External", "Compliance"],
    cost_category: ["Labor", "Hardware", "Software/Licensing", "Vendor/Services", "Travel", "Contingency"],
  };
  for (const [code, values] of Object.entries(lists)) {
    const [list] = await db.insert(lookupLists).values({ code, label: code.replace(/_/g, " ") }).returning();
    await db.insert(lookupValues).values(values.map((v, i) => ({ lookupListId: list.id, value: v, sortOrder: i })));
  }

  // ---- sample projects, tasks, budget, risks, issues, milestones ----
  // Ownership reassigned onto real roster members (chairman/director/managers) instead of the
  // old fake demo employees — see requirements doc, "keep structure, reassign owners".
  const projectSeed = [
    { name: "ERP Platform Modernization", budget: 22_000_000, status: "In Progress" },
    { name: "Regional Distribution Center Expansion", budget: 15_500_000, status: "On Hold" },
    { name: "Customer Portal Revamp", budget: 6_200_000, status: "Completed" },
    { name: "Cybersecurity Uplift Program", budget: 9_800_000, status: "Delayed" },
    { name: "Warehouse Automation Phase 1", budget: 18_400_000, status: "In Progress" },
  ];

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

  for (let i = 0; i < projectSeed.length; i++) {
    const p = projectSeed[i];
    const start = addDays(today, -120 + i * 5);
    const finish = addDays(today, 90 - i * 10);
    const [project] = await db
      .insert(projects)
      .values({
        projectCode: `PRJ-${String(i + 1).padStart(3, "0")}`,
        name: p.name,
        departmentId: deptRows[i % deptRows.length].id,
        projectManagerId: empRows[iDirector].id,
        sponsorId: empRows[iChairman].id,
        priority: ["Critical", "High", "Medium", "Low"][i % 4],
        status: p.status,
        startDate: iso(start),
        endDate: iso(finish),
        baselineStart: iso(start),
        baselineFinish: iso(addDays(finish, -10)),
        forecastFinish: iso(finish),
        budget: p.budget,
        description: `Delivers ${p.name.toLowerCase()}.`,
      })
      .returning();

    // tasks
    const taskNames = ["Requirements Gathering", "Design & Architecture", "Procurement", "Development / Build", "Integration Testing", "UAT", "Go-Live"];
    let cursor = start;
    for (let t = 0; t < taskNames.length; t++) {
      const dur = 12 + (t % 3) * 4;
      const tStart = cursor;
      const tFinish = addDays(cursor, dur);
      cursor = addDays(tFinish, 1);
      const status = p.status === "Completed" ? "Completed" : t === 0 ? "Completed" : t === 1 ? "In Progress" : "Not Started";
      const progress = status === "Completed" ? 1 : status === "In Progress" ? 0.45 : 0;
      const assignees = [iSupplyChain, iCargoMgr, iCargoAsst, iBizDev, iITMgr];
      await db.insert(tasks).values({
        taskCode: `TSK-${String(i * 10 + t + 1).padStart(4, "0")}`,
        projectId: project.id,
        name: taskNames[t],
        assignedTo: empRows[assignees[(t + i) % assignees.length]].id,
        priority: ["Critical", "High", "Medium", "Low"][t % 4],
        status,
        startDate: iso(tStart),
        finishDate: iso(tFinish),
        progressPct: progress,
        baselineStart: iso(tStart),
        baselineFinish: iso(tFinish),
        isMilestone: t === taskNames.length - 1,
        durationDaysCache: dur + 1,
        remainingDaysCache: status === "Completed" ? 0 : Math.max(0, Math.round((tFinish.getTime() - today.getTime()) / 86_400_000)),
        isCriticalCache: t === 3,
        healthCache: status === "Completed" ? "Green" : t === 1 ? "Amber" : "Green",
      });
    }

    // budget entries
    for (let b = 0; b < 3; b++) {
      const committed = p.budget * (0.15 + b * 0.1);
      await db.insert(budgetEntries).values({
        entryCode: `BUD-${String(i * 10 + b + 1).padStart(4, "0")}`,
        projectId: project.id,
        costCategory: ["Labor", "Software/Licensing", "Vendor/Services"][b],
        vendorName: ["Alpha Systems", "Orbit Software", "Vertex Consulting"][b],
        invoiceStatus: ["Paid", "Pending", "Approved"][b],
        transactionDate: iso(addDays(start, 20 + b * 15)),
        committedCost: committed,
        actualCost: committed * 0.85,
        forecastCost: committed * 1.05,
      });
    }

    // risks
    const riskOwners = [iCargoMgr, iCargoAsst, iSupplyChain, iBizDev];
    await db.insert(risks).values([
      {
        riskCode: `RSK-${String(i * 2 + 1).padStart(3, "0")}`,
        projectId: project.id,
        category: "Schedule",
        description: "Key vendor delivery delay",
        probability: 3 + (i % 3),
        impact: 3 + (i % 2),
        riskScoreCache: (3 + (i % 3)) * (3 + (i % 2)),
        ownerId: empRows[riskOwners[i % riskOwners.length]].id,
        status: "Open",
        targetDate: iso(addDays(today, 30)),
      },
      {
        riskCode: `RSK-${String(i * 2 + 2).padStart(3, "0")}`,
        projectId: project.id,
        category: "Financial",
        description: "Budget overrun on licensing",
        probability: 2,
        impact: 3,
        riskScoreCache: 6,
        ownerId: empRows[riskOwners[(i + 1) % riskOwners.length]].id,
        status: i % 2 === 0 ? "Open" : "Mitigated",
        targetDate: iso(addDays(today, 45)),
      },
    ]);

    // issues
    await db.insert(issues).values({
      issueCode: `ISS-${String(i + 1).padStart(3, "0")}`,
      projectId: project.id,
      description: "Interface failing intermittently in test environment",
      ownerId: empRows[riskOwners[i % riskOwners.length]].id,
      severity: "High",
      dateRaised: iso(addDays(today, -10)),
      dueDate: iso(addDays(today, 5)),
      status: "In Progress",
    });

    // milestones
    await db.insert(milestones).values([
      { projectId: project.id, name: "Requirements Sign-off", ownerId: empRows[iDirector].id, plannedDate: iso(addDays(start, 20)), actualDate: iso(addDays(start, 22)), status: "Achieved" },
      { projectId: project.id, name: "Go-Live", ownerId: empRows[iDirector].id, plannedDate: iso(finish), status: finish < today ? "Overdue" : "Pending" },
    ]);

    // this is the same recalculation the API triggers after every task/budget/risk write —
    // running it here means the seed data shows real, correct KPIs immediately, not zeros.
    await recalculateProject(project.id);
  }

  // ---- Phase 2 sample data: CRM, Finance, Procurement, HR ----
  const [customer1] = await db.insert(customers).values({ customerCode: "CUST-001", name: "Continental Traders LLC", industry: "Logistics", accountOwnerId: empRows[iSalesA].id, status: "Active" }).returning();
  await db.insert(leads).values([
    { leadCode: "LEAD-001", companyName: "Northbridge Manufacturing", contactName: "Farah Malik", email: "farah@northbridge.example", source: "Referral", status: "Qualified", ownerId: empRows[iSalesA].id },
    { leadCode: "LEAD-002", companyName: "Crescent Retail Group", contactName: "Imran Sheikh", source: "Website", status: "New", ownerId: empRows[iSalesB].id },
  ]);
  await db.insert(opportunities).values([
    { opportunityCode: "OPP-001", customerId: customer1.id, name: "Warehouse Automation Rollout", stage: "Proposal", amount: 4_500_000, probability: 60, ownerId: empRows[iSalesA].id, expectedCloseDate: iso(addDays(today, 45)) },
    { opportunityCode: "OPP-002", customerId: customer1.id, name: "Cold Chain Expansion", stage: "Negotiation", amount: 2_100_000, probability: 80, ownerId: empRows[iSalesB].id, expectedCloseDate: iso(addDays(today, 20)) },
  ]);

  const coa = await db
    .insert(chartOfAccounts)
    .values([
      { accountCode: "1000", name: "Cash", type: "Asset" },
      { accountCode: "1100", name: "Accounts Receivable", type: "Asset" },
      { accountCode: "2000", name: "Accounts Payable", type: "Liability" },
      { accountCode: "3000", name: "Owner's Equity", type: "Equity" },
      { accountCode: "4000", name: "Revenue", type: "Revenue" },
      { accountCode: "5000", name: "Project Expenses", type: "Expense" },
    ])
    .returning();
  // one balanced sample journal entry so /trial-balance has real, non-zero numbers to show
  const cashAcct = coa.find((a) => a.accountCode === "1000")!;
  const expenseAcct = coa.find((a) => a.accountCode === "5000")!;
  const [je] = await db.insert(journalEntries).values({ entryCode: "JE-00001", entryDate: iso(today), memo: "Initial project expense payment", postedBy: userRows[iCFO].id, status: "Posted" }).returning();
  await db.insert(journalLines).values([
    { journalEntryId: je.id, accountId: expenseAcct.id, debit: 50000, credit: 0, description: "Vendor payment" },
    { journalEntryId: je.id, accountId: cashAcct.id, debit: 0, credit: 50000, description: "Cash disbursed" },
  ]);

  const [vendor1] = await db.insert(vendors).values({ vendorCode: "VEN-001", name: "Alpha Systems", category: "Software/Licensing", contactEmail: "sales@alphasystems.example", status: "Active", rating: 4.2 }).returning();
  const [po1] = await db
    .insert(purchaseOrders)
    .values({ poNumber: "PO-00001", vendorId: vendor1.id, projectId: 1, orderDate: iso(today), expectedDate: iso(addDays(today, 14)), totalAmount: 120000, requestedBy: empRows[iSupplyChain].id, status: "Draft" })
    .returning();
  await db.insert(poLines).values([{ purchaseOrderId: po1.id, description: "Annual software license renewal", quantity: 1, unitPrice: 120000, lineTotal: 120000 }]);

  await db.insert(leaveRequests).values([
    { leaveCode: "LV-00001", employeeId: empRows[iOpsAssist].id, leaveType: "Annual", startDate: iso(addDays(today, 10)), endDate: iso(addDays(today, 14)), status: "Pending", reason: "Family trip" },
    { leaveCode: "LV-00002", employeeId: empRows[iCargoAsst].id, leaveType: "Sick", startDate: iso(addDays(today, -3)), endDate: iso(addDays(today, -1)), status: "Approved", approvedBy: empRows[iHRMgr].id },
  ]);

  // ---- Phase 3 sample data: Inventory, Manufacturing, Assets, Help Desk ----
  const [wh1] = await db.insert(warehouses).values({ code: "WH-001", name: "Main Distribution Center", location: "Karachi", isActive: true }).returning();
  const [rawItem] = await db.insert(stockItems).values({ sku: "SKU-0001", name: "Steel Bracket (raw)", category: "Raw Material", unitOfMeasure: "ea", reorderPoint: 100, standardCost: 12 }).returning();
  const [finishedItem] = await db.insert(stockItems).values({ sku: "SKU-0002", name: "Assembled Frame Unit", category: "Finished Good", unitOfMeasure: "ea", reorderPoint: 20, standardCost: 85 }).returning();
  // seed via the real stock ledger service, not a direct insert, so the audit trail is genuine from day one
  await recordStockTransaction({ stockItemId: rawItem.id, warehouseId: wh1.id, type: "Receipt", quantity: 500, reference: "Initial stock load", performedBy: userRows[iChairman].id });

  const [bom1] = await db.insert(boms).values({ bomCode: "BOM-001", outputItemId: finishedItem.id, outputQuantity: 1, isActive: true }).returning();
  await db.insert(bomLines).values([{ bomId: bom1.id, componentItemId: rawItem.id, quantityPerOutput: 4 }]);

  await db.insert(assets).values([
    { assetCode: "AST-001", name: "Forklift Unit 3", category: "Material Handling", purchaseDate: iso(addDays(today, -730)), purchaseCost: 850000, usefulLifeYears: 8, salvageValue: 50000, location: "Main Distribution Center", status: "Active" },
    { assetCode: "AST-002", name: "Server Rack (Data Center)", category: "IT Equipment", purchaseDate: iso(addDays(today, -365)), purchaseCost: 620000, usefulLifeYears: 5, salvageValue: 0, assignedTo: empRows[iITMgr].id, status: "Active" },
  ]);

  await db.insert(tickets).values([
    { ticketCode: "TCK-001", subject: "Portal login failing intermittently", description: "Customer reports 2FA codes not arriving", customerId: 1, priority: "High", status: "Open", slaHours: 24 },
    { ticketCode: "TCK-002", subject: "Invoice discrepancy on last shipment", customerId: 1, priority: "Medium", status: "In Progress", slaHours: 48 },
  ]);

  // ---- Employee Tasks module demo data ----
  // Independent from the PMO `tasks` table above (see schema.employeeTasks.ts for why). Status
  // is per-assignee, so a multi-assignee task below shows divergent statuses per person on
  // purpose — that's the feature, not an inconsistency. Reassigned onto real roster members.
  const etDefs: {
    title: string;
    description: string;
    priority: string;
    dueOffset: number;
    deptIdx: number; // index into deptRows — matches the primary assignee's own department
    assignees: { empIdx: number; status: string; notDoneReason?: string; progressNotes?: string; startedOffset?: number; completedOffset?: number }[];
  }[] = [
    {
      title: "Prepare Q3 status report",
      description: "Compile project status across all active initiatives for the steering committee.",
      priority: "High",
      dueOffset: 5,
      deptIdx: 0, // Leadership/Executive — Asad Ali
      assignees: [{ empIdx: iDirector, status: "In Progress", progressNotes: "Draft 60% complete, awaiting finance numbers." }],
    },
    {
      title: "Update vendor contact directory",
      description: "Reconcile vendor emails and phone numbers against procurement records.",
      priority: "Low",
      dueOffset: 12,
      deptIdx: 2, // Cargo Operations — Muhammad Adeel (Supply Chain)
      assignees: [{ empIdx: iSupplyChain, status: "Pending" }],
    },
    {
      title: "Apply critical security patches",
      description: "Roll out the latest OS security patches to all production servers.",
      priority: "Critical",
      dueOffset: -2,
      deptIdx: 5, // IT & Automation — Gohar Mehdi / Usman (Business Dev)
      assignees: [
        { empIdx: iITMgr, status: "Completed After Due Date", progressNotes: "Patched batches 1-3 successfully, verified uptime.", completedOffset: -1 },
        { empIdx: iBizDev, status: "Not Done", notDoneReason: "Blocked — change-freeze approval from Ops is still pending.", completedOffset: -1 },
      ],
    },
    {
      title: "Draft onboarding checklist",
      description: "Create a standard onboarding checklist for new hires.",
      priority: "Medium",
      dueOffset: 20,
      deptIdx: 7, // HR & Admin — Shazhad Rahim Ali
      assignees: [{ empIdx: iHRMgr, status: "In Progress", progressNotes: "First draft shared with HR lead for review." }],
    },
    {
      title: "Reconcile petty cash log",
      description: "Reconcile the petty cash ledger against receipts for the month.",
      priority: "Medium",
      dueOffset: -5,
      deptIdx: 6, // Finance & Accounts — Syed Azfal Ali Zahidi (CFO)
      assignees: [{ empIdx: iCFO, status: "Completed", progressNotes: "Reconciled, no discrepancies found.", completedOffset: -6 }],
    },
    {
      title: "Client demo environment refresh",
      description: "Reset and reseed the client-facing demo environment ahead of Thursday's walkthrough.",
      priority: "High",
      dueOffset: 2,
      deptIdx: 5, // IT & Automation
      assignees: [
        { empIdx: iITMgr, status: "In Progress", progressNotes: "Environment reset, reseeding data now." },
        { empIdx: iSupplyChain, status: "Pending" },
      ],
    },
    {
      title: "Archive completed change requests",
      description: "Move all approved/closed change requests older than 90 days to the archive folder.",
      priority: "Low",
      dueOffset: 15,
      deptIdx: 0, // Leadership/Executive — Syed Shujaat Ali
      assignees: [{ empIdx: iChairman, status: "Pending" }],
    },
    {
      title: "Review Q2 risk register",
      description: "Walk through the open risk register and re-score probability/impact for accuracy.",
      priority: "High",
      dueOffset: -1,
      deptIdx: 2, // Cargo Operations — Mohammad Tariq Zubair Khan
      assignees: [{ empIdx: iCargoMgr, status: "Not Done", notDoneReason: "Waiting on updated impact estimates from the finance team.", completedOffset: -1 }],
    },
    {
      title: "Prepare monthly attendance summary",
      description: "Compile attendance and leave summary for all departments.",
      priority: "Medium",
      dueOffset: -10,
      deptIdx: 7, // HR & Admin
      assignees: [{ empIdx: iHRMgr, status: "Completed", progressNotes: "Summary sent to department heads.", completedOffset: -11 }],
    },
    {
      title: "Test disaster-recovery failover",
      description: "Run a scheduled failover test on the secondary data center and document results.",
      priority: "Critical",
      dueOffset: 7,
      deptIdx: 5, // IT & Automation
      assignees: [
        { empIdx: iBizDev, status: "Pending" },
        { empIdx: iITMgr, status: "In Progress", progressNotes: "Runbook reviewed, scheduling the test window." },
      ],
    },
  ];

  const adminUserId = userRows[iChairman].id; // Syed Shujaat Ali — creator of all demo assignments
  for (let i = 0; i < etDefs.length; i++) {
    const def = etDefs[i];
    const [task] = await db
      .insert(employeeTasks)
      .values({
        taskCode: `ETSK-${String(i + 1).padStart(4, "0")}`,
        title: def.title,
        description: def.description,
        priority: def.priority,
        dueDate: iso(addDays(today, def.dueOffset)),
        departmentId: deptRows[def.deptIdx].id,
        createdBy: adminUserId,
      })
      .returning();

    for (const a of def.assignees) {
      const employeeId = empRows[a.empIdx].id;
      const [assignment] = await db
        .insert(employeeTaskAssignments)
        .values({
          taskId: task.id,
          employeeId,
          status: a.status,
          notDoneReason: a.notDoneReason ?? null,
          progressNotes: a.progressNotes ?? null,
          startedAt: a.startedOffset !== undefined ? addDays(today, a.startedOffset) : null,
          completedAt: a.completedOffset !== undefined ? addDays(today, a.completedOffset) : null,
          durationMs:
            a.startedOffset !== undefined && a.completedOffset !== undefined
              ? (addDays(today, a.completedOffset).getTime() - addDays(today, a.startedOffset).getTime())
              : null,
        })
        .returning();

      const loginUserId = employeeIdToUserId[employeeId];
      if (loginUserId) {
        if (a.notDoneReason || a.progressNotes) {
          await db.insert(comments).values({
            entityType: "employee-task-assignment",
            entityId: assignment.id,
            userId: loginUserId,
            body: a.notDoneReason ?? a.progressNotes!,
          });
        }
        await db.insert(notifications).values({
          userId: loginUserId,
          type: "task_assigned",
          title: `New task assigned: ${def.title}`,
          link: "/my-tasks",
        });
      }
    }
  }

  console.log("Seed complete.");
  console.log(`Created ${userRows.length} real employee accounts (2 Admin: Syed Shujaat Ali [Admin+CEO], Asad Ali [Admin+Director]; ${userRows.length - 2} User accounts).`);
  console.log(`Generated login credentials written to: ${credentialsPath}`);
  console.log("This file is gitignored — distribute credentials securely and delete/rotate afterward.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
