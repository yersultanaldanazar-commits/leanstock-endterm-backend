// Defines API routes for stock reservations.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reservationRouter = void 0;
const { Router } = require("express");
const { UserRole } = require("@prisma/client");
const { authenticate } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validate.middleware");
const schemas = require("../schemas/reservation.schema");
const controller = require("../controllers/reservation.controller");
exports.reservationRouter = Router();
exports.reservationRouter.use(authenticate);
exports.reservationRouter.get("/reservations", controller.listReservations);
exports.reservationRouter.post("/reservations", requireRole(UserRole.TENANT_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.STAFF_MEMBER), validate(schemas.createReservationSchema), controller.createReservation);
exports.reservationRouter.post("/reservations/expire", requireRole(UserRole.TENANT_ADMIN, UserRole.WAREHOUSE_MANAGER), controller.expireReservations);
exports.reservationRouter.get("/reservations/:id", validate(schemas.reservationIdParamSchema), controller.getReservation);
exports.reservationRouter.post("/reservations/:id/confirm", requireRole(UserRole.TENANT_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.STAFF_MEMBER), validate(schemas.confirmReservationSchema), controller.confirmReservation);
exports.reservationRouter.post("/reservations/:id/release", requireRole(UserRole.TENANT_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.STAFF_MEMBER), validate(schemas.releaseReservationSchema), controller.releaseReservation);
