// Handles user account business logic.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantUser = createTenantUser;
exports.listTenantUsers = listTenantUsers;
exports.getTenantUser = getTenantUser;
exports.updateTenantUser = updateTenantUser;
const bcrypt = require("bcryptjs");
const { AuditAction } = require("@prisma/client");
const { prisma } = require("../config/prisma");
const { env } = require("../config/env");
const { randomToken, sha256 } = require("../utils/crypto");
const { appendAuditLog } = require("../utils/audit");
const { ConflictError, NotFoundError } = require("../utils/errors");
const { queueEmail, buildVerificationEmail } = require("./email.service");
const { paginated } = require("../utils/pagination");
function publicUser(user) { return { id: user.id, tenantId: user.tenantId, email: user.email, role: user.role, isActive: user.isActive, emailVerifiedAt: user.emailVerifiedAt, createdAt: user.createdAt, updatedAt: user.updatedAt }; }
async function createTenantUser(tenantId, actorId, input, ipAddress) {
  const existing = await prisma.user.findFirst({ where: { tenantId, email: input.email } });
  if (existing) throw new ConflictError("User email already exists in this tenant");
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const verificationToken = randomToken();
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { tenantId, email: input.email, passwordHash, role: input.role, isActive: true } });
    await tx.emailVerificationToken.create({ data: { userId: user.id, tokenHash: sha256(verificationToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    await appendAuditLog(tx, { tenantId, actorId, entityType: "user", entityId: user.id, action: AuditAction.USER_REGISTERED, payload: { email: user.email, role: user.role, createdByAdmin: true, emailVerified: false }, ipAddress });
    return user;
  });
  const email = buildVerificationEmail({ email: created.email, token: verificationToken });
  const emailJob = await queueEmail({ tenantId, userId: created.id, eventType: "TENANT_USER_INVITE", entityType: "user", entityId: created.id, ...email });
  return { ...publicUser(created), emailJob, ...(env.isProduction ? {} : { verificationTokenForDemo: verificationToken }) };
}
async function listTenantUsers(tenantId, pagination) {
  const where = { tenantId };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, take: pagination.limit, skip: pagination.offset }),
    prisma.user.count({ where })
  ]);
  return paginated(users.map(publicUser), total, pagination);
}
async function getTenantUser(tenantId, id) { const user = await prisma.user.findFirst({ where: { tenantId, id } }); if (!user) throw new NotFoundError("User not found"); return publicUser(user); }
async function updateTenantUser(tenantId, actorId, id, data, ipAddress) {
  await getTenantUser(tenantId, id);
  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id }, data });
    if (data.role !== undefined || data.isActive === false) await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await appendAuditLog(tx, { tenantId, actorId, entityType: "user", entityId: id, action: AuditAction.USER_ROLE_CHANGED, payload: { ...data, tokensRevoked: data.role !== undefined || data.isActive === false }, ipAddress });
    return user;
  });
  return publicUser(updated);
}
