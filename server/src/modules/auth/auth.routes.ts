import { Router } from "express";
import { z } from "zod";
import * as authService from "./auth.service";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { ApiError } from "../../middleware/errorHandler.middleware";

const router = Router();

// Every account logs in with its email except one special-cased login alias (see LOGIN_ALIASES
// in auth.service.ts) — dropped the email() format check so that alias isn't rejected here
// before it ever reaches the lookup. auth.service.login() still requires an exact match against
// a real stored users.email or a known alias, so this doesn't loosen who can actually log in.
const loginSchema = z.object({ email: z.string().min(1), password: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password, req.ip ?? null);
    res.json(result);
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);
    res.json(result);
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);
    res.json({ success: true });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, "UNAUTHENTICATED", "Not authenticated");
    const result = await authService.me(req.user.userId);
    res.json(result);
  })
);

export default router;
