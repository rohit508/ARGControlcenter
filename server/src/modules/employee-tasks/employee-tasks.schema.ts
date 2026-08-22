import { z } from "zod";

export const STATUS_VALUES = ["Pending", "In Progress", "Completed", "Not Done", "Completed After Due Date"] as const;
export const PRIORITY_VALUES = ["Critical", "High", "Medium", "Low"] as const;

const dueTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Due time must be HH:MM")
  .optional();

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(PRIORITY_VALUES).default("Medium"),
  dueDate: z.string().optional(),
  dueTime: dueTimeSchema,
  departmentId: z.number().int().optional(),
  assigneeIds: z.array(z.number().int()).min(1, "Assign at least one employee"),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  dueDate: z.string().optional(),
  dueTime: dueTimeSchema,
  departmentId: z.number().int().nullable().optional(),
  assigneeIds: z.array(z.number().int()).optional(),
});

// The mandatory-reason rule lives here, at the validation boundary, so the API can never accept
// a "Not Done" status without one — the client-side disable-until-filled behavior is UX only.
export const updateAssignmentStatusSchema = z
  .object({
    status: z.enum(STATUS_VALUES),
    notDoneReason: z.string().trim().optional(),
    progressNotes: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.status === "Not Done" && !v.notDoneReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notDoneReason"],
        message: "A reason/comment is required when marking a task as Not Done",
      });
    }
  });

// body may be empty for a voice-note-only comment — the audio attachment carries the content in
// that case, uploaded as a follow-up request once this comment row (and its id) exists.
export const addCommentSchema = z.object({ body: z.string().default("") });

export const deleteTaskSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required to delete a task"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateAssignmentStatusInput = z.infer<typeof updateAssignmentStatusSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;
