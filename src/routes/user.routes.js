// Defines API routes for user accounts.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const { Router } = require("express");
const { UserRole } = require("@prisma/client");
const { authenticate } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validate.middleware");
const { idParamSchema } = require("../schemas/business.schema");
const { createTenantUserSchema, updateTenantUserSchema } = require("../schemas/user.schema");
const controller = require("../controllers/user.controller");
exports.userRouter = Router();
exports.userRouter.use(authenticate, requireRole(UserRole.TENANT_ADMIN));
exports.userRouter.get("/users", controller.listTenantUsers);
exports.userRouter.post("/users", validate(createTenantUserSchema), controller.createTenantUser);
exports.userRouter.get("/users/:id", validate(idParamSchema), controller.getTenantUser);
exports.userRouter.patch("/users/:id", validate(updateTenantUserSchema), controller.updateTenantUser);
