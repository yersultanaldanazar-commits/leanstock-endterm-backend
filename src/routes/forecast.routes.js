// Defines API routes for forecast features.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forecastRouter = void 0;
const { Router } = require("express");
const { UserRole } = require("@prisma/client");
const { authenticate } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validate.middleware");
const schemas = require("../schemas/forecast.schema");
const controller = require("../controllers/forecast.controller");
exports.forecastRouter = Router();
exports.forecastRouter.use(authenticate);
exports.forecastRouter.post("/sales", requireRole(UserRole.TENANT_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.STAFF_MEMBER), validate(schemas.recordSaleSchema), controller.recordSale);
exports.forecastRouter.get("/forecast/reorder-point", validate(schemas.forecastQuerySchema), controller.calculateReorderForecast);
exports.forecastRouter.post("/forecast/reorder-point/apply", requireRole(UserRole.TENANT_ADMIN, UserRole.WAREHOUSE_MANAGER), validate(schemas.applyForecastSchema), controller.applyReorderForecast);
