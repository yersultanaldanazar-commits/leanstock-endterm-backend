// Defines shared validation rules for business data.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idParamSchema = exports.cancelTransferSchema = exports.completeTransferSchema = exports.updateInventorySchema = exports.transferSchema = exports.receiveInventorySchema = exports.updateSkuSchema = exports.createSkuSchema = exports.updateLocationSchema = exports.createLocationSchema = void 0;
const { z } = require("zod");
const uuidParams = z.object({ params: z.object({ id: z.string().uuid() }) });
exports.idParamSchema = uuidParams;
exports.createLocationSchema = z.object({
  body: z.object({ name: z.string().min(2).max(120), address: z.string().max(255).optional() })
});
exports.updateLocationSchema = z.object({
  params: uuidParams.shape.params,
  body: z.object({ name: z.string().min(2).max(120).optional(), address: z.string().max(255).nullable().optional(), isActive: z.boolean().optional() }).refine((v) => Object.keys(v).length > 0, "At least one field is required")
});
exports.createSkuSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(160),
    skuCode: z.string().min(2).max(80),
    unit: z.string().min(1).max(40).default("piece"),
    costPrice: z.coerce.number().nonnegative(),
    sellPrice: z.coerce.number().nonnegative(),
    barcode: z.string().max(80).optional()
  })
});
exports.updateSkuSchema = z.object({
  params: uuidParams.shape.params,
  body: z.object({
    name: z.string().min(2).max(160).optional(),
    unit: z.string().min(1).max(40).optional(),
    costPrice: z.coerce.number().nonnegative().optional(),
    sellPrice: z.coerce.number().nonnegative().optional(),
    barcode: z.string().max(80).nullable().optional(),
    isArchived: z.boolean().optional()
  }).refine((v) => Object.keys(v).length > 0, "At least one field is required")
});
exports.receiveInventorySchema = z.object({
  body: z.object({
    skuId: z.string().uuid(),
    locationId: z.string().uuid(),
    quantity: z.number().int().positive(),
    reorderPoint: z.number().int().nonnegative().optional()
  })
});
exports.updateInventorySchema = z.object({
  params: uuidParams.shape.params,
  body: z.object({
    quantity: z.number().int().nonnegative().optional(),
    reorderPoint: z.number().int().nonnegative().optional(),
    discountPct: z.number().int().min(0).max(90).optional(),
    isArchived: z.boolean().optional()
  }).refine((v) => Object.keys(v).length > 0, "At least one field is required")
});
exports.transferSchema = z.object({
  body: z.object({
    skuId: z.string().uuid(),
    sourceLocationId: z.string().uuid(),
    destinationLocationId: z.string().uuid(),
    quantity: z.number().int().positive()
  })
});
exports.completeTransferSchema = uuidParams;
exports.cancelTransferSchema = uuidParams;
