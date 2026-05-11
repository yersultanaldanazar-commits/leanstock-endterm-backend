// Checks access tokens before protected requests continue.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const { prisma } = require("../config/prisma");
const errors_1 = require("../utils/errors");
async function authenticate(req, _res, next) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return next(new errors_1.UnauthorizedError("Missing Bearer token"));
  const token = header.slice("Bearer ".length);
  try {
    const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
    if (payload.type !== "access") throw new Error("Invalid token type");
    const user = await prisma.user.findFirst({ where: { id: payload.sub, tenantId: payload.tenantId, isActive: true }, select: { id: true, tenantId: true, email: true, role: true, emailVerifiedAt: true } });
    if (!user || !user.emailVerifiedAt) throw new Error("Inactive or unverified user");
    req.user = { id: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
    next();
  } catch {
    next(new errors_1.UnauthorizedError("Invalid or expired access token"));
  }
}
