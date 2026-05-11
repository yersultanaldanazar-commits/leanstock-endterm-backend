// Handles catalog and inventory business logic.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLocation = createLocation;
exports.listLocations = listLocations;
exports.getLocation = getLocation;
exports.updateLocation = updateLocation;
exports.deleteLocation = deleteLocation;
exports.createSku = createSku;
exports.listSkus = listSkus;
exports.getSku = getSku;
exports.updateSku = updateSku;
exports.deleteSku = deleteSku;
exports.receiveInventory = receiveInventory;
exports.listInventory = listInventory;
exports.getInventory = getInventory;
exports.updateInventory = updateInventory;
exports.listLowStock = listLowStock;
exports.listDeadStock = listDeadStock;
const { Prisma } = require("@prisma/client");
const { prisma } = require("../config/prisma");
const { ConflictError, NotFoundError } = require("../utils/errors");
const { paginated } = require("../utils/pagination");
async function createLocation(tenantId, data) { return prisma.location.create({ data: { tenantId, ...data } }); }
async function listLocations(tenantId, pagination) {
  const where = { tenantId, isActive: true };
  const [data, total] = await Promise.all([
    prisma.location.findMany({ where, orderBy: { createdAt: "desc" }, take: pagination.limit, skip: pagination.offset }),
    prisma.location.count({ where })
  ]);
  return paginated(data, total, pagination);
}
async function getLocation(tenantId, id) { const location = await prisma.location.findFirst({ where: { tenantId, id, isActive: true } }); if (!location) throw new NotFoundError("Location not found"); return location; }
async function updateLocation(tenantId, id, data) { await getLocation(tenantId, id); return prisma.location.update({ where: { id }, data }); }
async function deleteLocation(tenantId, id) { await getLocation(tenantId, id); return prisma.location.update({ where: { id }, data: { isActive: false } }); }
async function createSku(tenantId, data) { try { return await prisma.sku.create({ data: { tenantId, ...data, costPrice: new Prisma.Decimal(data.costPrice), sellPrice: new Prisma.Decimal(data.sellPrice) } }); } catch (e) { if (e.code === "P2002") throw new ConflictError("SKU code already exists in this tenant"); throw e; } }
async function listSkus(tenantId, pagination) {
  const where = { tenantId, isArchived: false };
  const [data, total] = await Promise.all([
    prisma.sku.findMany({ where, orderBy: { createdAt: "desc" }, take: pagination.limit, skip: pagination.offset }),
    prisma.sku.count({ where })
  ]);
  return paginated(data, total, pagination);
}
async function getSku(tenantId, id) { const sku = await prisma.sku.findFirst({ where: { tenantId, id, isArchived: false } }); if (!sku) throw new NotFoundError("SKU not found"); return sku; }
async function updateSku(tenantId, id, data) { await getSku(tenantId, id); const updateData = { ...data }; if (updateData.costPrice !== undefined) updateData.costPrice = new Prisma.Decimal(updateData.costPrice); if (updateData.sellPrice !== undefined) updateData.sellPrice = new Prisma.Decimal(updateData.sellPrice); return prisma.sku.update({ where: { id }, data: updateData }); }
async function deleteSku(tenantId, id) { await getSku(tenantId, id); return prisma.sku.update({ where: { id }, data: { isArchived: true } }); }
async function receiveInventory(tenantId, data) {
  const sku = await prisma.sku.findFirst({ where: { id: data.skuId, tenantId, isArchived: false } });
  const location = await prisma.location.findFirst({ where: { id: data.locationId, tenantId, isActive: true } });
  if (!sku) throw new NotFoundError("SKU not found");
  if (!location) throw new NotFoundError("Location not found");
  return prisma.inventory.upsert({
    where: { tenantId_skuId_locationId: { tenantId, skuId: data.skuId, locationId: data.locationId } },
    create: { tenantId, skuId: data.skuId, locationId: data.locationId, quantity: data.quantity, reorderPoint: data.reorderPoint ?? 0 },
    update: { quantity: { increment: data.quantity }, ...(data.reorderPoint !== undefined ? { reorderPoint: data.reorderPoint } : {}) },
    include: { sku: true, location: true }
  });
}
async function listInventory(tenantId, pagination) {
  const where = { tenantId, isArchived: false };
  const [data, total] = await Promise.all([
    prisma.inventory.findMany({ where, include: { sku: true, location: true }, orderBy: { updatedAt: "desc" }, take: pagination.limit, skip: pagination.offset }),
    prisma.inventory.count({ where })
  ]);
  return paginated(data, total, pagination);
}
async function getInventory(tenantId, id) { const item = await prisma.inventory.findFirst({ where: { tenantId, id }, include: { sku: true, location: true } }); if (!item) throw new NotFoundError("Inventory item not found"); return item; }
async function updateInventory(tenantId, id, data) { await getInventory(tenantId, id); return prisma.inventory.update({ where: { id }, data, include: { sku: true, location: true } }); }
async function listLowStock(tenantId, pagination) {
  const allWhere = { tenantId, isArchived: false, quantity: { gt: 0 } };
  const items = await prisma.inventory.findMany({ where: allWhere, include: { sku: true, location: true }, orderBy: { updatedAt: "desc" } });
  const filtered = items.filter((item) => item.quantity <= item.reorderPoint);
  return paginated(filtered.slice(pagination.offset, pagination.offset + pagination.limit), filtered.length, pagination);
}
async function listDeadStock(tenantId, pagination) {
  const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const where = { tenantId, isArchived: false, isSold: false, quantity: { gt: 0 }, receivedAt: { lt: threshold } };
  const [data, total] = await Promise.all([
    prisma.inventory.findMany({ where, include: { sku: true, location: true }, orderBy: [{ daysInInventory: "desc" }, { receivedAt: "asc" }], take: pagination.limit, skip: pagination.offset }),
    prisma.inventory.count({ where })
  ]);
  return paginated(data, total, pagination);
}
