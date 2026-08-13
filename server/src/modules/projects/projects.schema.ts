import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  program: z.string().optional(),
  portfolio: z.string().optional(),
  departmentId: z.number().int().optional(),
  businessUnit: z.string().optional(),
  projectManagerId: z.number().int().optional(),
  sponsorId: z.number().int().optional(),
  client: z.string().optional(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
  category: z.string().optional(),
  status: z.enum(["Not Started", "In Progress", "On Hold", "Completed", "Delayed", "Cancelled"]).default("Not Started"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  baselineStart: z.string().optional(),
  baselineFinish: z.string().optional(),
  budget: z.number().min(0).default(0),
  description: z.string().optional(),
  remarks: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
