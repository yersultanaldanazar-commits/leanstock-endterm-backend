// Defines API routes for audit logs.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const { Router } = require("express");
const { UserRole } = require("@prisma/client");
const { authenticate } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/rbac.middleware");
const controller = require("../controllers/audit.controller");
exports.auditRouter = Router();
exports.auditRouter.get("/audit-logs", authenticate, requireRole(UserRole.TENANT_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.AUDITOR), controller.listAuditLogs);
