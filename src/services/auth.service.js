// Handles login, token refresh, and logout logic.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTenantAdmin = registerTenantAdmin;
exports.verifyEmail = verifyEmail;
exports.resendVerification = resendVerification;
exports.login = login;
exports.refreshAccessToken = refreshAccessToken;
exports.logout = logout;
exports.getCurrentUser = getCurrentUser;
exports.changePassword = changePassword;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AuditAction } = require("@prisma/client");
const { prisma } = require("../config/prisma");
const { env } = require("../config/env");
const { randomToken, sha256 } = require("../utils/crypto");
const { appendAuditLog } = require("../utils/audit");
const { queueEmail, buildVerificationEmail, buildPasswordResetEmail, buildBusinessEventEmail } = require("./email.service");
const { UnauthorizedError, ConflictError, NotFoundError } = require("../utils/errors");

const VERIFICATION_TOKEN_MINUTES = 60 * 24;
const PASSWORD_RESET_TOKEN_MINUTES = 30;

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email, type: "access" }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
}
async function createRefreshToken(userId, tx = prisma) {
  const raw = randomToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await tx.refreshToken.create({ data: { userId, tokenHash: sha256(raw), expiresAt } });
  return raw;
}
function authPayload(user, refreshToken) {
  return {
    accessToken: signAccessToken(user),
    refreshToken,
    tokenType: "Bearer",
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    user: { id: user.id, tenantId: user.tenantId, email: user.email, role: user.role, emailVerifiedAt: user.emailVerifiedAt }
  };
}
async function createVerificationToken(userId, tx = prisma) {
  const raw = randomToken();
  await tx.emailVerificationToken.create({
    data: { userId, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_MINUTES * 60 * 1000) }
  });
  return raw;
}
async function createPasswordResetToken(userId, tx = prisma) {
  const raw = randomToken();
  await tx.passwordResetToken.create({
    data: { userId, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_MINUTES * 60 * 1000) }
  });
  return raw;
}
async function registerTenantAdmin(input) {
  const existing = await prisma.user.findFirst({ where: { email: input.email } });
  if (existing) throw new ConflictError("Email is already registered");
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name: input.tenantName, plan: "FREE" } });
    const user = await tx.user.create({ data: { tenantId: tenant.id, email: input.email, passwordHash, role: "TENANT_ADMIN", isActive: true } });
    const verificationToken = await createVerificationToken(user.id, tx);
    await appendAuditLog(tx, { tenantId: tenant.id, actorId: user.id, entityType: "user", entityId: user.id, action: AuditAction.USER_REGISTERED, payload: { email: user.email, role: user.role, emailVerified: false }, ipAddress: input.ipAddress });
    return { tenant, user, verificationToken };
  });
  const email = buildVerificationEmail({ email: result.user.email, token: result.verificationToken });
  const queued = await queueEmail({ tenantId: result.tenant.id, userId: result.user.id, eventType: "EMAIL_VERIFICATION", entityType: "user", entityId: result.user.id, ...email });
  await prisma.auditLog.create({ data: { tenantId: result.tenant.id, actorId: result.user.id, entityType: "user", entityId: result.user.id, action: AuditAction.EMAIL_VERIFICATION_SENT, payload: { emailJobId: queued.id }, ipAddress: input.ipAddress } });
  return {
    message: "Registration created. Verify email before login.",
    user: { id: result.user.id, tenantId: result.user.tenantId, email: result.user.email, role: result.user.role, emailVerifiedAt: null },
    emailJob: queued,
    ...(env.isProduction ? {} : { verificationTokenForDemo: result.verificationToken })
  };
}
async function verifyEmail(rawToken, ipAddress) {
  const tokenHash = sha256(rawToken);
  const stored = await prisma.emailVerificationToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) throw new UnauthorizedError("Invalid or expired verification token");
  const user = await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } });
    const updated = await tx.user.update({ where: { id: stored.userId }, data: { emailVerifiedAt: new Date(), isActive: true } });
    await appendAuditLog(tx, { tenantId: updated.tenantId, actorId: updated.id, entityType: "user", entityId: updated.id, action: AuditAction.EMAIL_VERIFIED, payload: { email: updated.email }, ipAddress });
    return updated;
  });
  return { message: "Email verified. You can login now.", user: { id: user.id, tenantId: user.tenantId, email: user.email, role: user.role, emailVerifiedAt: user.emailVerifiedAt } };
}
async function resendVerification(input, ipAddress) {
  const user = await prisma.user.findFirst({ where: { email: input.email } });
  if (!user || user.emailVerifiedAt) return { message: "If the account exists and is unverified, a verification email was queued." };
  const token = await createVerificationToken(user.id);
  const email = buildVerificationEmail({ email: user.email, token });
  const queued = await queueEmail({ tenantId: user.tenantId, userId: user.id, eventType: "EMAIL_VERIFICATION_RESEND", entityType: "user", entityId: user.id, ...email });
  await prisma.auditLog.create({ data: { tenantId: user.tenantId, actorId: user.id, entityType: "user", entityId: user.id, action: AuditAction.EMAIL_VERIFICATION_SENT, payload: { emailJobId: queued.id, resend: true }, ipAddress } });
  return { message: "If the account exists and is unverified, a verification email was queued.", ...(env.isProduction ? {} : { verificationTokenForDemo: token }) };
}
async function login(input) {
  const where = input.tenantId ? { email: input.email, tenantId: input.tenantId } : { email: input.email };
  const user = await prisma.user.findFirst({ where });
  if (!user || !user.isActive) throw new UnauthorizedError("Invalid credentials");
  if (!user.emailVerifiedAt) throw new UnauthorizedError("Email is not verified");
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new UnauthorizedError("Invalid credentials");
  const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), failedAttempts: 0, lockedUntil: null } });
  await prisma.auditLog.create({ data: { tenantId: user.tenantId, actorId: user.id, entityType: "user", entityId: user.id, action: AuditAction.USER_LOGIN, payload: { email: user.email }, ipAddress: input.ipAddress } });
  return authPayload(updated, await createRefreshToken(user.id));
}
async function refreshAccessToken(refreshToken) {
  const tokenHash = sha256(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.isActive || !stored.user.emailVerifiedAt) throw new UnauthorizedError("Invalid refresh token");
  const newRefreshToken = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date(), lastUsedAt: new Date() } });
    return createRefreshToken(stored.userId, tx);
  });
  return authPayload(stored.user, newRefreshToken);
}
async function logout(refreshToken, actorId, ipAddress) {
  const tokenHash = sha256(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!stored || stored.revokedAt) return;
  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date(), lastUsedAt: new Date() } });
    await appendAuditLog(tx, { tenantId: stored.user.tenantId, actorId: actorId ?? stored.user.id, entityType: "user", entityId: stored.user.id, action: AuditAction.USER_LOGOUT, payload: {}, ipAddress });
  });
}
async function getCurrentUser(userId, tenantId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, isActive: true },
    select: { id: true, tenantId: true, email: true, role: true, isActive: true, emailVerifiedAt: true, lastLoginAt: true, createdAt: true, updatedAt: true, tenant: { select: { id: true, name: true, plan: true, isActive: true } } }
  });
  if (!user) throw new NotFoundError("User not found");
  if (!user.emailVerifiedAt) throw new UnauthorizedError("Email is not verified");
  return user;
}
async function forgotPassword(input, ipAddress) {
  const user = await prisma.user.findFirst({ where: { email: input.email, isActive: true } });
  if (!user || !user.emailVerifiedAt) return { message: "If the account exists, a password reset email was queued." };
  const token = await createPasswordResetToken(user.id);
  const email = buildPasswordResetEmail({ email: user.email, token });
  const queued = await queueEmail({ tenantId: user.tenantId, userId: user.id, eventType: "PASSWORD_RESET", entityType: "user", entityId: user.id, ...email });
  await prisma.auditLog.create({ data: { tenantId: user.tenantId, actorId: user.id, entityType: "user", entityId: user.id, action: AuditAction.PASSWORD_RESET_REQUESTED, payload: { emailJobId: queued.id }, ipAddress } });
  return { message: "If the account exists, a password reset email was queued.", ...(env.isProduction ? {} : { resetTokenForDemo: token }) };
}
async function resetPassword(input, ipAddress) {
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(input.token) }, include: { user: true } });
  if (!stored || stored.usedAt || stored.expiresAt < new Date() || !stored.user.isActive) throw new UnauthorizedError("Invalid or expired reset token");
  const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } });
    await tx.user.update({ where: { id: stored.userId }, data: { passwordHash } });
    await tx.refreshToken.updateMany({ where: { userId: stored.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await appendAuditLog(tx, { tenantId: stored.user.tenantId, actorId: stored.user.id, entityType: "user", entityId: stored.user.id, action: AuditAction.PASSWORD_RESET_COMPLETED, payload: { tokensRevoked: true }, ipAddress });
  });
  return { message: "Password reset completed. Please login again." };
}
async function changePassword(userId, tenantId, input, ipAddress) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, isActive: true } });
  if (!user) throw new NotFoundError("User not found");
  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) throw new UnauthorizedError("Current password is incorrect");
  const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await appendAuditLog(tx, { tenantId, actorId: user.id, entityType: "user", entityId: user.id, action: AuditAction.PASSWORD_RESET_COMPLETED, payload: { event: "PASSWORD_CHANGED_AND_TOKENS_REVOKED" }, ipAddress });
  });
  return { message: "Password changed. Please login again." };
}
