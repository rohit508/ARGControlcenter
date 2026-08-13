import { db } from "../../db/client";
import { journalEntries, journalLines, chartOfAccounts } from "../../db/schema";
import { eq } from "drizzle-orm";
import { ApiError, notFound } from "../../middleware/errorHandler.middleware";
import { nextCode } from "../../lib/codeGenerator";
import { writeAudit } from "../../lib/audit";

export interface JournalLineInput {
  accountId: number;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalEntryInput {
  entryDate: string;
  memo?: string;
  projectId?: number;
  lines: JournalLineInput[];
}

/**
 * The one rule that makes this a real general ledger rather than a glorified spreadsheet: a
 * journal entry MUST balance (total debits = total credits) before it can post. Checked here,
 * not trusted from the client — this is the actual implementation of "double-entry" referenced
 * in 02-database-design.md §2.3, not just a table that happens to have debit/credit columns.
 */
export async function createJournalEntry(input: CreateJournalEntryInput, userId: number) {
  if (input.lines.length < 2) {
    throw new ApiError(400, "VALIDATION_ERROR", "A journal entry needs at least two lines (one debit, one credit)");
  }
  const totalDebit = round2(input.lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(input.lines.reduce((s, l) => s + l.credit, 0));
  if (totalDebit !== totalCredit) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      `Journal entry does not balance: total debits ${totalDebit} != total credits ${totalCredit}`
    );
  }
  for (const line of input.lines) {
    if (line.debit > 0 && line.credit > 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "A single journal line cannot have both a debit and a credit amount");
    }
    if (line.debit === 0 && line.credit === 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "Every journal line must have either a debit or a credit amount");
    }
  }

  const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
  const accounts = await db.select().from(chartOfAccounts);
  const validIds = new Set(accounts.map((a) => a.id));
  for (const id of accountIds) {
    if (!validIds.has(id)) throw new ApiError(400, "VALIDATION_ERROR", `Account ${id} does not exist in the Chart of Accounts`);
  }

  const entryCode = nextCode("journal_entries", "entry_code", "JE", 5);
  const [entry] = await db
    .insert(journalEntries)
    .values({ entryCode, entryDate: input.entryDate, memo: input.memo, projectId: input.projectId, postedBy: userId, status: "Posted" })
    .returning();

  await db.insert(journalLines).values(input.lines.map((l) => ({ journalEntryId: entry.id, ...l })));
  await writeAudit({ userId, entityType: "journal_entry", entityId: entry.id, action: "create", after: { ...entry, lines: input.lines } });
  return entry;
}

export async function getTrialBalance() {
  const accounts = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.isActive, true));
  const lines = await db.select().from(journalLines);
  return accounts.map((acct) => {
    const acctLines = lines.filter((l) => l.accountId === acct.id);
    const debit = round2(acctLines.reduce((s, l) => s + l.debit, 0));
    const credit = round2(acctLines.reduce((s, l) => s + l.credit, 0));
    // Assets/Expenses are debit-normal; Liabilities/Equity/Revenue are credit-normal
    const debitNormal = acct.type === "Asset" || acct.type === "Expense";
    const balance = debitNormal ? debit - credit : credit - debit;
    return { accountId: acct.id, accountCode: acct.accountCode, name: acct.name, type: acct.type, debit, credit, balance };
  });
}

export async function reverseJournalEntry(id: number, userId: number) {
  const entry = (await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1))[0];
  if (!entry) throw notFound("Journal entry");
  if (entry.status === "Reversed") throw new ApiError(409, "CONFLICT", "Entry already reversed");
  const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, id));

  const reverseCode = nextCode("journal_entries", "entry_code", "JE", 5);
  const [reversal] = await db
    .insert(journalEntries)
    .values({ entryCode: reverseCode, entryDate: new Date().toISOString().slice(0, 10), memo: `Reversal of ${entry.entryCode}`, postedBy: userId, status: "Posted" })
    .returning();
  await db.insert(journalLines).values(lines.map((l) => ({ journalEntryId: reversal.id, accountId: l.accountId, debit: l.credit, credit: l.debit, description: l.description })));
  await db.update(journalEntries).set({ status: "Reversed" }).where(eq(journalEntries.id, id));
  await writeAudit({ userId, entityType: "journal_entry", entityId: id, action: "update", before: entry, after: { status: "Reversed", reversalId: reversal.id } });
  return reversal;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
