// Defines API routes for background jobs.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobRouter = void 0;
const { Router } = require("express");
const { UserRole } = require("@prisma/client");
const { authenticate } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/rbac.middleware");
const controller = require("../controllers/job.controller");
exports.jobRouter = Router();
exports.jobRouter.use(authenticate, requireRole(UserRole.TENANT_ADMIN, UserRole.WAREHOUSE_MANAGER));
exports.jobRouter.get("/jobs/email", controller.listEmailJobs);
exports.jobRouter.post("/jobs/email/process-next", controller.processEmailJob);
