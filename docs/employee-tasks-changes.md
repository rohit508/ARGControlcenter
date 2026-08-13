# Employee Task Management - Required Changes

## Overview
This document captures the requested feature work and a concrete implementation plan for:

- Add filters to the Employee Tasks screen (assignee / user dropdown).
- Make Task Analytics -> "Total Tasks" navigate to the Employee Tasks screen.
- Add a User Name dropdown filter with `All` option.
- Track time spent per task (start time, completion time, total time) and display on task cards in the Admin Console.

---

## Requirements (from product)

1. Add filtering options on the **Employee Tasks** screen.
   - Include filter by **Assignee (Employee Name)** so users can view tasks assigned to a specific employee.

2. Task Analytics Navigation
   - On the **Task Analytics** dashboard, clicking **Total Tasks** should redirect to the **Employee Tasks** screen.

3. Employee Tasks - User Dropdown Filter
   - Add a **User Name** dropdown filter.
   - Dropdown lists all employees + an **All** option.
   - Selecting a specific employee shows only that user's tasks.

4. Task Time Tracking
   - When a task status changes to **In Progress**, record the start time.
   - When a task status changes to **Completed**, record the completion time.
   - Calculate total time taken (completion - start).
   - Display on the task card in Admin Console: Start Time, Completion Time, Total Time Spent (human-readable, e.g., `2h 35m`).

---

## Implementation Plan (Technical)

High level: apply a small DB migration, update server services to record timestamps, expose the values in the API, and update the frontend UI to add filters/navigation and show times.

### A. Database

Files to change (server):
- `server/src/db/schema.employeeTasks.ts` (or wherever `employeeTaskAssignments` schema is defined)

Changes:
- Add columns (SQLite) to the `employee_task_assignments` table:
  - `started_at` TEXT NULL
  - `completed_at` TEXT NULL
  - Optionally `duration_ms` INTEGER NULL (can be computed on the fly; storing is optional)

Migration SQL (SQLite):
```sql
ALTER TABLE employee_task_assignments ADD COLUMN started_at TEXT;
ALTER TABLE employee_task_assignments ADD COLUMN completed_at TEXT;
ALTER TABLE employee_task_assignments ADD COLUMN duration_ms INTEGER;
```

Notes:
- SQLite `ALTER TABLE ... ADD COLUMN` is safe for adding nullable columns.
- If the codebase uses Drizzle schema definitions, update the `schema.employeeTasks.ts` to include the new columns (name and types) and run the appropriate migration/generate step (`drizzle-kit` or manual SQL).

### B. Server: record timestamps and expose via API

Files likely involved (server):
- `server/src/modules/employee-tasks/employee-tasks.service.ts` (or similar)
- `server/src/modules/employee-tasks/employee-tasks.controller.ts` (or route handlers)
- `server/src/db/schema.employeeTasks.ts`

Behavior changes:
- When updating an assignment status to `In Progress`:
  - If `started_at` is null, set `started_at = now()` (ISO string).
- When updating assignment status to `Completed`:
  - Set `completed_at = now()`.
  - Compute `duration_ms = datetime(completed_at) - datetime(started_at)` in milliseconds (only if `started_at` present). Store it or compute on read.

API changes:
- Ensure the GET/list endpoints for employee tasks return the new fields: `startedAt`, `completedAt`, `durationMs` (or `totalTimeHuman`).
- Provide an optional query param filter: `employeeId` (or `assigneeId`) to filter assignments by employee.

Example patch (pseudocode):
```ts
// inside updateAssignmentStatus(assignmentId, newStatus, userId) {
if (newStatus === 'In Progress' && !row.startedAt) {
  await db.update(employeeTaskAssignments).set({ startedAt: new Date().toISOString() }).where(...)
}
if (newStatus === 'Completed') {
  const completedAt = new Date().toISOString();
  const startedAt = row.startedAt;
  const durationMs = startedAt ? Date.parse(completedAt) - Date.parse(startedAt) : null;
  await db.update(employeeTaskAssignments).set({ completedAt, durationMs }).where(...)
}
```

### C. Frontend: Employee Tasks page

Files likely involved (client):
- `client/src/modules/employee-tasks/*` (page + components)
- `client/src/components/*/TaskCard.tsx` (or wherever task card markup exists)
- `client/src/services/apiClient.ts` (to add/adjust endpoint query params)

1) Filters & Dropdown
- Add a `select` control labeled `User Name` that fetches `/api/employees` (or existing employees endpoint) to populate options. Include an `All` option with value `''`.
- When an employee is selected, call the tasks listing endpoint with `employeeId` query param.
- Also add a quick `Assignee` text filter if needed or reuse the dropdown.

2) Display time fields on the task card
- Update task card to display:
  - `Start: {startedAt ? format(startedAt) : '-'}`
  - `Completed: {completedAt ? format(completedAt) : '-'}`
  - `Time Spent: {durationMs ? humanizeDuration(durationMs) : '-'}`

Helper (humanize):
```ts
function humanizeDuration(ms: number) {
  const totalMins = Math.round(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;
  return `${hours}h ${minutes}m`;
}
```

3) Admin Console presentation
- Ensure the Admin view of task cards includes the new fields. Use a compact layout so cards don't become overly tall.

### D. Frontend: Task Analytics navigation

- Locate the Task Analytics card for `Total Tasks` (`client/src/modules/analytics/...`).
- Change the click handler to `router.push('/employee-tasks' + (optionalQuery))` or call the same client-side route used by the Employee Tasks page.
- Optionally, append a query param to pre-filter the Employee Tasks screen (e.g., `?filter=all` or `?metric=totalTasks`).

### E. Seed / migration updates

- Update `server/src/db/seed.ts` to set `started_at`, `completed_at`, and `duration_ms` for some demo assignments so Admin view shows data.
- If you use migration files, create a small migration and run it before seeding.

### F. Tests

- Add unit tests for the service that updates statuses to verify timestamps are set.
- Add an integration test for `GET /employee-tasks?employeeId=...` to verify filtering.

---

## Example commands

Run dev servers and seed (already used in this repo):

```powershell
cd server
npm install
npm run seed
npm run dev

cd client
npm install
npm run dev
```

If using Drizzle migrations:
```bash
cd server
npx drizzle-kit generate
npx drizzle-kit push
```

---

## Next steps I can take for you

- Implement the DB migration + server changes and open a PR (I can do this).
- Implement the frontend changes (dropdown, filter, card UI) and test locally.
- Create the migration only and leave frontend for you.

Tell me which scope you'd like me to implement now. If you want me to proceed with code changes, I'll start with the DB migration and server updates (low-risk) and then update the frontend.
