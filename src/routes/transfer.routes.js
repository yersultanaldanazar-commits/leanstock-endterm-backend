// Defines API routes for stock transfers.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferRouter = void 0;
const { Router } = require("express");
const { UserRole } = require("@prisma/client");
const { authenticate } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validate.middleware");
const { transferSchema, idParamSchema } = require("../schemas/business.schema");
const controller = require("../controllers/transfer.controller");
exports.transferRouter = Router();
exports.transferRouter.use(authenticate);
exports.transferRouter.get("/transfers", controller.listTransfers);
exports.transferRouter.post("/transfers", requireRole(UserRole.TENANT_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.STAFF_MEMBER), validate(transferSchema), controller.createTransfer);
exports.transferRouter.get("/transfers/:id", validate(idParamSchema), controller.getTransfer);
exports.transferRouter.post("/transfers/:id/complete", requireRole(UserRole.TENANT_ADMIN, UserRole.WAREHOUSE_MANAGER), validate(idParamSchema), controller.completeTransfer);
exports.transferRouter.post("/transfers/:id/cancel", requireRole(UserRole.TENANT_ADMIN, UserRole.WAREHOUSE_MANAGER), validate(idParamSchema), controller.cancelTransfer);
