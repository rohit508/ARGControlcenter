# Employee Accounts & Restricted "My Tasks" Access — Requirements

## 1. New Employee Accounts

Create employee profiles (with login access) for:

- **Zainab Malik**
- **Mariam Chaudhry**
- **Ahmed Khan**

Each employee has their own profile and login.

## 2. Restricted Screen Access

When an employee (e.g. **Zainab Malik**) logs in, they must **not** see the full set of system screens. Their access is limited to a single screen: **My Tasks**.

## 3. My Tasks Page — Tabs

The My Tasks page is organized into four tabs, with the logged-in employee's name shown dynamically in each tab title:

- **{Employee Name} – Pending Tasks**
- **{Employee Name} – In Progress Tasks**
- **{Employee Name} – Completed Tasks**
- **{Employee Name} – Not Done Tasks**

Example for Zainab Malik:
- Zainab Malik – Pending Tasks
- Zainab Malik – In Progress Tasks
- Zainab Malik – Completed Tasks
- Zainab Malik – Not Done Tasks

## 4. Employee Capabilities

The employee can:

- View all tasks assigned to them.
- Open and review complete task details in a clean, modern preview panel or modal.
- Update task status where permitted (see workflow below).

The employee **cannot**:

- Delete any task.

## 5. Task Workflow

- **Pending → In Progress**: employee can move a task from Pending to In Progress.
- **In Progress → Completed**: while a task is In Progress, a **Mark as Completed** button is available.
- Clicking **Mark as Completed** automatically moves the task to the **Completed** tab.
- Any status change made by the employee is reflected **immediately** on the Admin Dashboard — no manual refresh required.

## 6. Admin Visibility

The Admin can monitor all assigned tasks across employees and see real-time updates whenever any employee changes a task's status.

---

*This document captures the requirement as specified. Implementation notes (data model, RBAC changes, UI components) to be added once implementation begins.*
