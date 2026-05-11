// Stores and reads audit log records.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogs = listAuditLogs;
const { prisma } = require("../config/prisma");
const { paginated } = require("../utils/pagination");
function serializeAuditLog(log) { return { ...log, id: log.id.toString() }; }
async function listAuditLogs(tenantId, pagination) {
  const where = { tenantId };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { actor: { select: { id: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, take: pagination.limit, skip: pagination.offset }),
    prisma.auditLog.count({ where })
  ]);
  return paginated(logs.map(serializeAuditLog), total, pagination);
}
