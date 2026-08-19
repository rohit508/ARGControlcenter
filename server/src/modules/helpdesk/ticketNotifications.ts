import { eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { employees, users, userRoles, roles } from "../../db/schema";
import { sendMail } from "../../lib/mailer";
import { env } from "../../env";

/**
 * Resolves the email to notify an employee at: employees.email is optional/often unpopulated in
 * the real roster (only their users.email login address is guaranteed to exist), so prefer
 * employees.email when set and fall back to the linked login's users.email otherwise.
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

/**
 * Finds the DepartmentHead for a given department: the employee in that department whose login
 * user holds the "DepartmentHead" role (see employee-tasks.service.ts's isDepartmentHead — there
 * is no departments.headId column, headship is role + departmentId match, same pattern here).
 * Returns null if the department has no head or the head has no usable email.
 */
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

// env.APP_URL is the deployed web client's origin (defaults to localhost only for local dev —
// set APP_URL in .env once deployed and this follows automatically, no code change needed).
const TICKET_LINK = `${env.APP_URL}/helpdesk`;

/**
 * Fires on ticket create/update whenever `assignedTo` is present. Emails both the assignee and
 * their department head — never throws, since a notification failure must not break the ticket
 * write that triggered it (sendMail already swallows its own errors; this just adds the "who to
 * notify" lookup on top).
 */
export async function notifyTicketAssignment(ticket: { id: number; ticketCode: string; subject: string; priority: string; assignedTo: number | null }) {
  if (!ticket.assignedTo) return;

  const assignee = (
    await db.select({ departmentId: employees.departmentId }).from(employees).where(eq(employees.id, ticket.assignedTo)).limit(1)
  )[0];
  if (!assignee) return;

  const contact = await getEmployeeContact(ticket.assignedTo);
  if (!contact) return;

  const subject = `Ticket ${ticket.ticketCode} assigned to you: ${ticket.subject}`;
  const text = `Hi ${contact.name},\n\nTicket ${ticket.ticketCode} ("${ticket.subject}", priority: ${ticket.priority}) has been assigned to you.\n\nView it here: ${TICKET_LINK}`;

  if (contact.email) {
    await sendMail({ to: contact.email, subject, text });
  }

  if (assignee.departmentId) {
    const head = await getDepartmentHeadContact(assignee.departmentId);
    if (head?.email && head.email !== contact.email) {
      await sendMail({
        to: head.email,
        subject: `Ticket ${ticket.ticketCode} assigned to your team member: ${contact.name}`,
        text: `Hi ${head.name},\n\nTicket ${ticket.ticketCode} ("${ticket.subject}", priority: ${ticket.priority}) has been assigned to ${contact.name}, a member of your department.\n\nThis is an FYI notification — no action required unless you choose to follow up.\n\nView it here: ${TICKET_LINK}`,
      });
    }
  }
}
