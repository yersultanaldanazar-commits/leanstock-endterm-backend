// Defines API routes for dead stock decay features.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decayRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const decay_controller_1 = require("../controllers/decay.controller");
exports.decayRouter = (0, express_1.Router)();
exports.decayRouter.post('/inventory/decay/run', auth_middleware_1.authenticate, (0, rbac_middleware_1.requireRole)(client_1.UserRole.TENANT_ADMIN, client_1.UserRole.WAREHOUSE_MANAGER), decay_controller_1.runDecay);
