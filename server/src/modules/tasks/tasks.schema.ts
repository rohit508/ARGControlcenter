import { z } from "zod";

export const createTaskSchema = z.object({
  projectId: z.number().int(),
  name: z.string().min(1, "Task name is required"),
  parentTaskId: z.number().int().optional(),
  wbs: z.string().optional(),
  assignedTo: z.number().int().optional(),
  departmentId: z.number().int().optional(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
  status: z.enum(["Not Started", "In Progress", "Completed", "Delayed", "Blocked"]).default("Not Started"),
  startDate: z.string().optional(),
  finishDate: z.string().optional(),
  actualStart: z.string().optional(),
  actualFinish: z.string().optional(),
  progressPct: z.number().min(0).max(1).default(0),
  baselineStart: z.string().optional(),
  baselineFinish: z.string().optional(),
  isMilestone: z.boolean().default(false),
  comments: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().omit({ projectId: true });

export const updateProgressSchema = z.object({ progressPct: z.number().min(0).max(1) });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
