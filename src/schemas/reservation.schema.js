// Defines validation rules for reservation requests.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseReservationSchema = exports.confirmReservationSchema = exports.reservationIdParamSchema = exports.createReservationSchema = void 0;
const { z } = require("zod");
exports.createReservationSchema = z.object({
  body: z.object({
    inventoryId: z.string().uuid(),
    orderId: z.string().uuid().optional(),
    quantity: z.number().int().positive(),
    ttlSeconds: z.number().int().min(60).max(3600).optional()
  })
});
exports.reservationIdParamSchema = z.object({ params: z.object({ id: z.string().uuid() }) });
exports.confirmReservationSchema = exports.reservationIdParamSchema;
exports.releaseReservationSchema = exports.reservationIdParamSchema;
