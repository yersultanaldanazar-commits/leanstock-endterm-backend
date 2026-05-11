// Handles stock reservation business logic.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReservation = createReservation;
exports.listReservations = listReservations;
exports.getReservation = getReservation;
exports.confirmReservation = confirmReservation;
exports.releaseReservation = releaseReservation;
exports.expireReservations = expireReservations;
const { randomUUID } = require("crypto");
const { AuditAction } = require("@prisma/client");
const { prisma } = require("../config/prisma");
const { env } = require("../config/env");
const { withRedisLock } = require("../config/redis");
const { appendAuditLog } = require("../utils/audit");
const { ConflictError, NotFoundError } = require("../utils/errors");
const { paginated } = require("../utils/pagination");
const { queueEmail, buildBusinessEventEmail } = require("./email.service");
async function getActiveReservedQuantity(tx, inventoryId) {
  const result = await tx.reservation.aggregate({ where: { inventoryId, status: "ACTIVE", expiresAt: { gt: new Date() } }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}
async function notifyTenantAdmins(tenantId, eventType, subject, message, entityType, entityId) {
  const admins = await prisma.user.findMany({ where: { tenantId, role: "TENANT_ADMIN", isActive: true, emailVerifiedAt: { not: null } }, select: { id: true, email: true } });
  for (const admin of admins) await queueEmail({ tenantId, userId: admin.id, eventType, entityType, entityId, ...buildBusinessEventEmail({ to: admin.email, subject, message }) });
}
async function createReservation(tenantId, actorId, input, ipAddress) {
  const ttlSeconds = input.ttlSeconds ?? env.RESERVATION_TTL_SECONDS;
  const orderId = input.orderId ?? randomUUID();
  const reservation = await withRedisLock(`reservation:create:${tenantId}:${input.inventoryId}`, 10, async () => {
    return prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findFirst({ where: { id: input.inventoryId, tenantId, isArchived: false } });
      if (!inventory) throw new NotFoundError("Inventory row not found");
      const reserved = await getActiveReservedQuantity(tx, input.inventoryId);
      const available = inventory.quantity - reserved;
      if (available < input.quantity) throw new ConflictError(`Only ${available} units are available after active reservations`);
      const created = await tx.reservation.create({ data: { tenantId, inventoryId: input.inventoryId, orderId, quantity: input.quantity, expiresAt: new Date(Date.now() + ttlSeconds * 1000) }, include: { inventory: { include: { sku: true, location: true } } } });
      await appendAuditLog(tx, { tenantId, actorId, entityType: "reservation", entityId: created.id, action: AuditAction.ORDER_RESERVED, payload: { orderId, inventoryId: input.inventoryId, quantity: input.quantity, ttlSeconds }, ipAddress });
      return created;
    }, { isolationLevel: "Serializable" });
  });
  return reservation;
}
async function listReservations(tenantId, pagination) {
  const where = { tenantId };
  const include = { inventory: { include: { sku: true, location: true } } };
  const [data, total] = await Promise.all([
    prisma.reservation.findMany({ where, include, orderBy: { createdAt: "desc" }, take: pagination.limit, skip: pagination.offset }),
    prisma.reservation.count({ where })
  ]);
  return paginated(data, total, pagination);
}
async function getReservation(tenantId, id) {
  const reservation = await prisma.reservation.findFirst({ where: { tenantId, id }, include: { inventory: { include: { sku: true, location: true } } } });
  if (!reservation) throw new NotFoundError("Reservation not found");
  return reservation;
}
async function confirmReservation(tenantId, actorId, id, ipAddress) {
  const updated = await withRedisLock(`reservation:confirm:${tenantId}:${id}`, 10, async () => {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({ where: { tenantId, id }, include: { inventory: true } });
      if (!reservation) throw new NotFoundError("Reservation not found");
      if (reservation.status !== "ACTIVE") throw new ConflictError(`Reservation is already ${reservation.status}`);
      if (reservation.expiresAt < new Date()) {
        await tx.reservation.update({ where: { id }, data: { status: "EXPIRED" } });
        throw new ConflictError("Reservation expired");
      }
      const inventoryUpdate = await tx.inventory.updateMany({ where: { id: reservation.inventoryId, tenantId, isArchived: false, quantity: { gte: reservation.quantity } }, data: { quantity: { decrement: reservation.quantity }, isSold: true } });
      if (inventoryUpdate.count !== 1) throw new ConflictError("Insufficient inventory for confirmation");
      const confirmed = await tx.reservation.update({ where: { id }, data: { status: "CONFIRMED" } });
      await tx.salesHistory.create({ data: { tenantId, skuId: reservation.inventory.skuId, locationId: reservation.inventory.locationId, quantitySold: reservation.quantity, source: "reservation_confirmed" } });
      await appendAuditLog(tx, { tenantId, actorId, entityType: "reservation", entityId: id, action: AuditAction.ORDER_CONFIRMED, payload: { inventoryId: reservation.inventoryId, orderId: reservation.orderId, quantity: reservation.quantity }, ipAddress });
      return confirmed;
    }, { isolationLevel: "Serializable" });
  });
  await notifyTenantAdmins(tenantId, "ORDER_CONFIRMED", "LeanStock reservation confirmed", `Reservation ${updated.id} was confirmed.`, "reservation", updated.id);
  return updated;
}
async function releaseReservation(tenantId, actorId, id, ipAddress) {
  const reservation = await getReservation(tenantId, id);
  if (reservation.status !== "ACTIVE") throw new ConflictError(`Reservation is already ${reservation.status}`);
  const updated = await prisma.reservation.update({ where: { id }, data: { status: "RELEASED" } });
  await prisma.auditLog.create({ data: { tenantId, actorId, entityType: "reservation", entityId: id, action: AuditAction.RESERVATION_RELEASED, payload: { event: "RESERVATION_RELEASED" }, ipAddress } });
  return updated;
}
async function expireReservations(tenantId) {
  const result = await prisma.reservation.updateMany({ where: { tenantId, status: "ACTIVE", expiresAt: { lt: new Date() } }, data: { status: "EXPIRED" } });
  return { expired: result.count };
}
