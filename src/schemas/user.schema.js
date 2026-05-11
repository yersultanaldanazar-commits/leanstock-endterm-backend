// Defines validation rules for user requests.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTenantUserSchema = exports.createTenantUserSchema = void 0;
const { z } = require("zod");
const password = z.string().min(10).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);
const manageableRoles = ["WAREHOUSE_MANAGER", "STAFF_MEMBER", "AUDITOR", "API_CLIENT"];
exports.createTenantUserSchema = z.object({
  body: z.object({
    email: z.string().email().transform((v) => v.toLowerCase()),
    password,
    role: z.enum(manageableRoles).default("WAREHOUSE_MANAGER")
  })
});
exports.updateTenantUserSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    role: z.enum(manageableRoles).optional(),
    isActive: z.boolean().optional()
  }).refine((v) => Object.keys(v).length > 0, "At least one field is required")
});
