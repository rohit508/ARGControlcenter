import { z } from "zod";

/**
 * Validated at process startup, not discovered piecemeal when a route first touches a missing
 * variable. A commercial product should never find out in production that JWT_ACCESS_SECRET was
 * never set — it should refuse to boot. The two secrets get a minimum-length check specifically
 * because the dev fallback used earlier in this build ("dev-access-secret") is exactly the kind
 * of value that quietly ends up in a shipped .env template if nothing enforces better.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"), // comma-separated allowlist
  APP_URL: z.string().default("http://localhost:5173"), // web client origin, used to build links in emails

  // SMTP is optional: if SMTP_HOST is unset, mailer.ts logs instead of sending. Lets ticket
  // assignment notifications work in every environment without forcing a mail account on dev/test.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("ERP System <no-reply@erp.local>"),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment configuration — refusing to start:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  if (result.data.NODE_ENV === "production") {
    const insecureDefaults = ["dev-access-secret", "dev-refresh-secret", "dev-access-secret-change-in-production", "dev-refresh-secret-change-in-production"];
    if (insecureDefaults.includes(result.data.JWT_ACCESS_SECRET) || insecureDefaults.includes(result.data.JWT_REFRESH_SECRET)) {
      console.error("Refusing to start in production with a development JWT secret. Set real secrets via environment variables.");
      process.exit(1);
    }
  }
  return result.data;
}

export const env = loadEnv();
export const corsOrigins = env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
