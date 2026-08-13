import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client";
import { chartOfAccounts, journalEntries, journalLines } from "../../db/schema";
import { eq, isNull } from "drizzle-orm";
import { asyncHandler, notFound } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import * as journalService from "./journal.service";

const router = Router();
router.use(authenticate);

const accountSchema = z.object({
  accountCode: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["Asset", "Liability", "Equity", "Revenue", "Expense"]),
  parentAccountId: z.number().int().optional(),
});

router.get("/accounts", asyncHandler(async (_req, res) => {
  res.json({ data: await db.select().from(chartOfAccounts) });
}));

router.post("/accounts", requirePermission("finance", "create"), asyncHandler(async (req, res) => {
  const input = accountSchema.parse(req.body);
  const [row] = await db.insert(chartOfAccounts).values(input).returning();
  res.status(201).json({ data: row });
}));

const lineSchema = z.object({ accountId: z.number().int(), debit: z.number().min(0).default(0), credit: z.number().min(0).default(0), description: z.string().optional() });
const journalEntrySchema = z.object({
  entryDate: z.string().min(1),
  memo: z.string().optional(),
  projectId: z.number().int().optional(),
  lines: z.array(lineSchema).min(2),
});

router.get("/journal-entries", asyncHandler(async (_req, res) => {
  const entries = await db.select().from(journalEntries).where(isNull(journalEntries.deletedAt));
  res.json({ data: entries, meta: { total: entries.length } });
}));

router.get("/journal-entries/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const entry = (await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1))[0];
  if (!entry) throw notFound("Journal entry");
  const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, id));
  res.json({ data: { ...entry, lines } });
}));

router.post("/journal-entries", requirePermission("finance", "create"), asyncHandler(async (req, res) => {
  const input = journalEntrySchema.parse(req.body);
  const entry = await journalService.createJournalEntry(input, req.user!.userId);
  res.status(201).json({ data: entry });
}));

router.post("/journal-entries/:id/reverse", requirePermission("finance", "update"), asyncHandler(async (req, res) => {
  const reversal = await journalService.reverseJournalEntry(Number(req.params.id), req.user!.userId);
  res.status(201).json({ data: reversal });
}));

router.get("/trial-balance", asyncHandler(async (_req, res) => {
  res.json({ data: await journalService.getTrialBalance() });
}));

export default router;
