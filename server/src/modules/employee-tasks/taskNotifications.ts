import { eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { employees, users, userRoles, roles, departments } from "../../db/schema";
import { sendMail } from "../../lib/mailer";
import { env } from "../../env";

/**
 * Resolves the email to notify an employee at: employees.email is optional/often unpopulated in
 * the real roster (only their users.email login address is guaranteed to exist), so prefer
 * employees.email when set and fall back to the linked login's users.email otherwise. Mirrors
 * helpdesk/ticketNotifications.ts's same lookup.
 */
async function getEmployeeContact(employeeId: number): Promise<{ name: string; email: string | null } | null> {
  const row = (
    await db
      .select({ name: employees.fullName, employeeEmail: employees.email, loginEmail: users.email })
      .from(employees)
      .leftJoin(users, eq(users.employeeId, employees.id))
      .where(eq(employees.id, employeeId))
      .limit(1)
  )[0];
  if (!row) return null;
  return { name: row.name, email: row.employeeEmail ?? row.loginEmail ?? null };
}

async function getDepartmentHeadContact(departmentId: number): Promise<{ name: string; email: string | null } | null> {
  const row = (
    await db
      .select({ name: employees.fullName, employeeEmail: employees.email, loginEmail: users.email })
      .from(employees)
      .innerJoin(users, eq(users.employeeId, employees.id))
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(employees.departmentId, departmentId), eq(roles.name, "DepartmentHead")))
      .limit(1)
  )[0];
  if (!row) return null;
  return { name: row.name, email: row.employeeEmail ?? row.loginEmail ?? null };
}

async function getDepartmentName(departmentId: number | null): Promise<string> {
  if (!departmentId) return "—";
  const row = (await db.select({ name: departments.name }).from(departments).where(eq(departments.id, departmentId)).limit(1))[0];
  return row?.name ?? "—";
}

function formatDueDate(dueDate: string | null, dueTime: string | null): string {
  if (!dueDate) return "—";
  return dueTime ? `${dueDate}, ${dueTime}` : dueDate;
}

// env.APP_URL is the deployed web client's origin (defaults to localhost only for local dev —
// set APP_URL in .env once deployed and this follows automatically, no code change needed).
const TASK_LINK = `${env.APP_URL}/my-tasks`;

function buildTaskDetailText(params: {
  recipientName: string;
  intro: string;
  taskCode: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigneeName: string;
  departmentName: string;
  dueDate: string | null;
  dueTime: string | null;
}): string {
  return [
    `Hi ${params.recipientName},`,
    "",
    params.intro,
    "",
    `Task Number: ${params.taskCode}`,
    `Title: ${params.title}`,
    `Description: ${params.description || "—"}`,
    `Priority: ${params.priority}`,
    `Status: ${params.status}`,
    `Assignee: ${params.assigneeName}`,
    `Department: ${params.departmentName}`,
    `Due Date: ${formatDueDate(params.dueDate, params.dueTime)}`,
    "",
    `View it here: ${TASK_LINK}`,
  ].join("\n");
}

/**
 * Fires after a task is created and assigned to one or more employees (see createTask in
 * employee-tasks.service.ts). Emails each assignee and their department head with the full task
 * detail shown on the task page — never throws, since notification failure must not break task
 * creation (sendMail already swallows its own errors).
 */
export async function notifyTaskAssignment(params: {
  taskCode: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  dueTime: string | null;
  departmentId: number | null;
  assignments: { employeeId: number; assignmentId: number }[];
}) {
  if (params.assignments.length === 0) return;

  const departmentName = await getDepartmentName(params.departmentId);
  const notifiedHeadEmails = new Set<string>();

  for (const { employeeId } of params.assignments) {
    const contact = await getEmployeeContact(employeeId);
    if (!contact) continue;

    if (contact.email) {
      await sendMail({
        to: contact.email,
        subject: `Task ${params.taskCode} assigned to you: ${params.title}`,
        text: buildTaskDetailText({
          recipientName: contact.name,
          intro: `Task ${params.taskCode} has been assigned to you.`,
          taskCode: params.taskCode,
          title: params.title,
          description: params.description,
          priority: params.priority,
          status: "Pending",
          assigneeName: contact.name,
          departmentName,
          dueDate: params.dueDate,
          dueTime: params.dueTime,
        }),
      });
    }

    if (params.departmentId) {
      const head = await getDepartmentHeadContact(params.departmentId);
      if (head?.email && head.email !== contact.email && !notifiedHeadEmails.has(head.email)) {
        notifiedHeadEmails.add(head.email);
        await sendMail({
          to: head.email,
          subject: `Task ${params.taskCode} assigned to your team member: ${contact.name}`,
          text: buildTaskDetailText({
            recipientName: head.name,
            intro: `Task ${params.taskCode} has been assigned to ${contact.name}, a member of your department.`,
            taskCode: params.taskCode,
            title: params.title,
            description: params.description,
            priority: params.priority,
            status: "Pending",
            assigneeName: contact.name,
            departmentName,
            dueDate: params.dueDate,
            dueTime: params.dueTime,
          }),
        });
      }
    }
  }
}
