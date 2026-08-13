import { z } from "zod";

const employeeCoreSchema = z.object({
  fullName: z.string().min(1),
  roleTitle: z.string().optional(),
  departmentId: z.number().int().optional(),
  managerId: z.number().int().optional(),
  email: z.string().email().optional(),
  location: z.string().optional(),
  costRate: z.number().optional(),
  capacityHoursPerMonth: z.number().optional(),
  skill: z.string().optional(),
  status: z.enum(["Active", "Inactive", "On Leave"]).default("Active"),
});

export const createEmployeeSchema = employeeCoreSchema
  .extend({
    createLogin: z.boolean().default(false),
    loginEmail: z.string().email().optional(),
    loginPassword: z.string().min(8).optional(),
    // Roles to grant the new login. Optional — when omitted, the caller falls back to the
    // default "Employee" role (see attachLogin/createEmployee in employees.service.ts) so
    // existing callers that never send this keep working exactly as before.
    roleIds: z.array(z.number().int()).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.createLogin && !v.loginEmail) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["loginEmail"], message: "Email required to create a login" });
    }
    if (v.createLogin && !v.loginPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["loginPassword"], message: "Password required to create a login" });
    }
  });

export const updateEmployeeSchema = employeeCoreSchema.partial();

export const createLoginSchema = z.object({
  loginEmail: z.string().email(),
  loginPassword: z.string().min(8),
  roleIds: z.array(z.number().int()).optional(),
});

export const updateRolesSchema = z.object({ roleIds: z.array(z.number().int()) });

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateLoginInput = z.infer<typeof createLoginSchema>;
export type UpdateRolesInput = z.infer<typeof updateRolesSchema>;
