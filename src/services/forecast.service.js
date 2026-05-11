// Builds demand forecasts from sales and stock data.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSale = recordSale;
exports.calculateReorderForecast = calculateReorderForecast;
exports.applyReorderForecast = applyReorderForecast;
const { AuditAction } = require("@prisma/client");
const { prisma } = require("../config/prisma");
const { ConflictError, NotFoundError } = require("../utils/errors");
const { appendAuditLog } = require("../utils/audit");
const { queueEmail, buildBusinessEventEmail } = require("./email.service");
async function ensureSkuAndLocation(tenantId, skuId, locationId) {
  const [sku, location] = await Promise.all([
    prisma.sku.findFirst({ where: { id: skuId, tenantId, isArchived: false } }),
    prisma.location.findFirst({ where: { id: locationId, tenantId, isActive: true } })
  ]);
  if (!sku) throw new NotFoundError("SKU not found");
  if (!location) throw new NotFoundError("Location not found");
  return { sku, location };
}
async function notifyTenantAdmins(tenantId, eventType, subject, message, entityType, entityId) {
  const admins = await prisma.user.findMany({ where: { tenantId, role: "TENANT_ADMIN", isActive: true, emailVerifiedAt: { not: null } }, select: { id: true, email: true } });
  for (const admin of admins) await queueEmail({ tenantId, userId: admin.id, eventType, entityType, entityId, ...buildBusinessEventEmail({ to: admin.email, subject, message }) });
}
async function recordSale(tenantId, input) {
  await ensureSkuAndLocation(tenantId, input.skuId, input.locationId);
  return prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findFirst({ where: { tenantId, skuId: input.skuId, locationId: input.locationId, isArchived: false } });
    if (!inventory) throw new NotFoundError("Inventory row not found");
    const updated = await tx.inventory.updateMany({ where: { id: inventory.id, tenantId, isArchived: false, quantity: { gte: input.quantitySold } }, data: { quantity: { decrement: input.quantitySold }, isSold: true } });
    if (updated.count !== 1) throw new ConflictError("Insufficient inventory for sale");
    return tx.salesHistory.create({ data: { tenantId, skuId: input.skuId, locationId: input.locationId, quantitySold: input.quantitySold, soldAt: input.soldAt ?? new Date(), source: "manual" } });
  }, { isolationLevel: "Serializable" });
}
function toDateKey(date) { return date.toISOString().slice(0, 10); }
async function calculateReorderForecast(tenantId, input) {
  await ensureSkuAndLocation(tenantId, input.skuId, input.locationId);
  const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
  const sales = await prisma.salesHistory.findMany({ where: { tenantId, skuId: input.skuId, locationId: input.locationId, soldAt: { gte: since } }, orderBy: { soldAt: "asc" } });
  const daily = new Map();
  for (const sale of sales) daily.set(toDateKey(sale.soldAt), (daily.get(toDateKey(sale.soldAt)) ?? 0) + sale.quantitySold);
  const totalSold = sales.reduce((sum, sale) => sum + sale.quantitySold, 0);
  const averageDailySales = Number((totalSold / input.days).toFixed(2));
  const recommendedReorderPoint = Math.ceil(averageDailySales * input.leadTimeDays + input.safetyStock);
  const inventory = await prisma.inventory.findFirst({ where: { tenantId, skuId: input.skuId, locationId: input.locationId }, include: { sku: true, location: true } });
  return { skuId: input.skuId, locationId: input.locationId, days: input.days, leadTimeDays: input.leadTimeDays, safetyStock: input.safetyStock, totalSold, averageDailySales, currentQuantity: inventory?.quantity ?? 0, currentReorderPoint: inventory?.reorderPoint ?? 0, recommendedReorderPoint, shouldReorderNow: inventory ? inventory.quantity <= recommendedReorderPoint : false, dailySales: Array.from(daily.entries()).map(([date, quantitySold]) => ({ date, quantitySold })) };
}
async function applyReorderForecast(tenantId, input) {
  const forecast = await calculateReorderForecast(tenantId, input);
  const inventory = await prisma.inventory.findFirst({ where: { tenantId, skuId: input.skuId, locationId: input.locationId } });
  if (!inventory) throw new NotFoundError("Inventory row not found");
  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.inventory.update({ where: { id: inventory.id }, data: { reorderPoint: forecast.recommendedReorderPoint } });
    await appendAuditLog(tx, { tenantId, actorId: null, entityType: "inventory", entityId: inventory.id, action: AuditAction.REORDER_FORECAST_APPLIED, payload: { recommendedReorderPoint: forecast.recommendedReorderPoint, previousReorderPoint: inventory.reorderPoint }, ipAddress: null });
    return inv;
  });
  if (forecast.shouldReorderNow) await notifyTenantAdmins(tenantId, "LOW_STOCK_DETECTED", "LeanStock low stock alert", `Inventory ${inventory.id} is at or below the forecast reorder point ${forecast.recommendedReorderPoint}.`, "inventory", inventory.id);
  return { forecast, inventory: updated };
}
