// Defines validation rules for authentication requests.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.resendVerificationSchema = exports.verifyEmailSchema = exports.logoutSchema = exports.refreshSchema = exports.loginSchema = exports.registerSchema = exports.password = void 0;
const { z } = require("zod");
exports.password = z.string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-z]/, "Password must include lowercase letter")
  .regex(/[A-Z]/, "Password must include uppercase letter")
  .regex(/[0-9]/, "Password must include number")
  .regex(/[^A-Za-z0-9]/, "Password must include special character");
exports.registerSchema = z.object({
  body: z.object({
    tenantName: z.string().min(2).max(120),
    email: z.string().email().toLowerCase(),
    password: exports.password
  })
});
exports.loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
    tenantId: z.string().uuid().optional()
  })
});
exports.refreshSchema = z.object({ body: z.object({ refreshToken: z.string().min(20) }) });
exports.logoutSchema = z.object({ body: z.object({ refreshToken: z.string().min(20) }) });
exports.verifyEmailSchema = z.object({
  body: z.object({ token: z.string().min(20).optional() }).optional(),
  query: z.object({ token: z.string().min(20).optional() }).optional()
}).refine((value) => value.body?.token || value.query?.token, { message: "token is required" });
exports.resendVerificationSchema = z.object({ body: z.object({ email: z.string().email().toLowerCase() }) });
exports.forgotPasswordSchema = z.object({ body: z.object({ email: z.string().email().toLowerCase() }) });
exports.resetPasswordSchema = z.object({ body: z.object({ token: z.string().min(20), newPassword: exports.password }) });
exports.changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: exports.password
  })
});
