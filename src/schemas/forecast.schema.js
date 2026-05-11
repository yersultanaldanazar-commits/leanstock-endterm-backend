// Defines validation rules for forecast requests.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyForecastSchema = exports.forecastQuerySchema = exports.recordSaleSchema = void 0;
const { z } = require("zod");
exports.recordSaleSchema = z.object({
  body: z.object({
    skuId: z.string().uuid(),
    locationId: z.string().uuid(),
    quantitySold: z.number().int().positive(),
    soldAt: z.coerce.date().optional()
  })
});
exports.forecastQuerySchema = z.object({
  query: z.object({
    skuId: z.string().uuid(),
    locationId: z.string().uuid(),
    days: z.coerce.number().int().min(3).max(120).default(30),
    leadTimeDays: z.coerce.number().int().min(1).max(60).default(7),
    safetyStock: z.coerce.number().int().min(0).max(10000).default(5)
  })
});
exports.applyForecastSchema = exports.forecastQuerySchema;
