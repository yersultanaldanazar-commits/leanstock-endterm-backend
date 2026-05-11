// Handles stock transfer business logic.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferInventory = transferInventory;
exports.listTransfers = listTransfers;
exports.getTransfer = getTransfer;
exports.completeTransfer = completeTransfer;
exports.cancelTransfer = cancelTransfer;
const { AuditAction } = require("@prisma/client");
const { prisma } = require("../config/prisma");
const { BadRequestError, ConflictError, NotFoundError } = require("../utils/errors");
const { appendAuditLog } = require("../utils/audit");
const { paginated } = require("../utils/pagination");
const { queueEmail, buildBusinessEventEmail } = require("./email.service");
async function notifyTenantAdmins(tenantId, eventType, subject, message, entityType, entityId) {
  const admins = await prisma.user.findMany({ where: { tenantId, role: "TENANT_ADMIN", isActive: true, emailVerifiedAt: { not: null } }, select: { id: true, email: true } });
  for (const admin of admins) await queueEmail({ tenantId, userId: admin.id, eventType, entityType, entityId, ...buildBusinessEventEmail({ to: admin.email, subject, message }) });
}
async function transferInventory(tenantId, actorId, input) {
  if (input.sourceLocationId === input.destinationLocationId) throw new BadRequestError("Source and destination locations must be different");
  const transfer = await prisma.$transaction(async (tx) => {
    const sku = await tx.sku.findFirst({ where: { id: input.skuId, tenantId, isArchived: false } });
    if (!sku) throw new NotFoundError("SKU not found");
    const locations = await tx.location.findMany({ where: { tenantId, id: { in: [input.sourceLocationId, input.destinationLocationId] }, isActive: true } });
    if (locations.length !== 2) throw new NotFoundError("One or both locations were not found or inactive");
    const source = await tx.inventory.findFirst({ where: { tenantId, skuId: input.skuId, locationId: input.sourceLocationId, isArchived: false } });
    if (!source) throw new NotFoundError("Source inventory row not found");
    const updatedSource = await tx.inventory.updateMany({ where: { id: source.id, tenantId, isArchived: false, quantity: { gte: input.quantity } }, data: { quantity: { decrement: input.quantity } } });
    if (updatedSource.count !== 1) throw new ConflictError("Insufficient source inventory");
    const destination = await tx.inventory.upsert({
      where: { tenantId_skuId_locationId: { tenantId, skuId: input.skuId, locationId: input.destinationLocationId } },
      create: { tenantId, skuId: input.skuId, locationId: input.destinationLocationId, quantity: input.quantity },
      update: { quantity: { increment: input.quantity } }
    });
    const created = await tx.stockTransfer.create({
      data: { tenantId, skuId: input.skuId, sourceLocationId: input.sourceLocationId, destinationLocationId: input.destinationLocationId, quantity: input.quantity, requestedById: actorId, approvedById: actorId, status: "COMPLETED", completedAt: new Date() }
    });
    await appendAuditLog(tx, { tenantId, actorId, entityType: "stock_transfer", entityId: created.id, action: AuditAction.TRANSFER_COMPLETED, payload: { skuId: input.skuId, sourceLocationId: input.sourceLocationId, destinationLocationId: input.destinationLocationId, quantity: input.quantity, destinationInventoryId: destination.id }, ipAddress: input.ipAddress });
    return created;
  }, { isolationLevel: "Serializable" });
  await notifyTenantAdmins(tenantId, "TRANSFER_COMPLETED", "LeanStock transfer completed", `Transfer ${transfer.id} moved ${transfer.quantity} units.`, "stock_transfer", transfer.id);
  return transfer;
}
async function listTransfers(tenantId, pagination) {
  const where = { tenantId };
  const include = { sku: true, sourceLocation: true, destinationLocation: true, requestedBy: { select: { id: true, email: true, role: true } }, approvedBy: { select: { id: true, email: true, role: true } } };
  const [data, total] = await Promise.all([
    prisma.stockTransfer.findMany({ where, include, orderBy: { createdAt: "desc" }, take: pagination.limit, skip: pagination.offset }),
    prisma.stockTransfer.count({ where })
  ]);
  return paginated(data, total, pagination);
}
async function getTransfer(tenantId, id) {
  const transfer = await prisma.stockTransfer.findFirst({ where: { tenantId, id }, include: { sku: true, sourceLocation: true, destinationLocation: true, requestedBy: { select: { id: true, email: true, role: true } }, approvedBy: { select: { id: true, email: true, role: true } } } });
  if (!transfer) throw new NotFoundError("Transfer not found");
  return transfer;
}
async function completeTransfer(tenantId, actorId, id, ipAddress) {
  const transfer = await prisma.stockTransfer.findFirst({ where: { tenantId, id } });
  if (!transfer) throw new NotFoundError("Transfer not found");
  if (transfer.status === "COMPLETED") return transfer;
  if (transfer.status === "CANCELLED") throw new ConflictError("Cancelled transfer cannot be completed");
  const updated = await prisma.stockTransfer.update({ where: { id }, data: { status: "COMPLETED", approvedById: actorId, completedAt: new Date() } });
  await prisma.auditLog.create({ data: { tenantId, actorId, entityType: "stock_transfer", entityId: id, action: AuditAction.TRANSFER_COMPLETED, payload: { status: updated.status }, ipAddress } });
  await notifyTenantAdmins(tenantId, "TRANSFER_COMPLETED", "LeanStock transfer completed", `Transfer ${updated.id} was completed.`, "stock_transfer", updated.id);
  return updated;
}
async function cancelTransfer(tenantId, actorId, id, ipAddress) {
  const transfer = await prisma.stockTransfer.findFirst({ where: { tenantId, id } });
  if (!transfer) throw new NotFoundError("Transfer not found");
  if (transfer.status === "COMPLETED") throw new ConflictError("Completed transfer cannot be cancelled");
  if (transfer.status === "CANCELLED") return transfer;
  const updated = await prisma.stockTransfer.update({ where: { id }, data: { status: "CANCELLED", approvedById: actorId } });
  await prisma.auditLog.create({ data: { tenantId, actorId, entityType: "stock_transfer", entityId: id, action: AuditAction.TRANSFER_INITIATED, payload: { event: "TRANSFER_CANCELLED" }, ipAddress } });
  return updated;
}
