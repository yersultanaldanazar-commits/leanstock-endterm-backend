// Helps create audit records from app actions.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendAuditLog = appendAuditLog;
async function appendAuditLog(tx, input) {
    return tx.auditLog.create({ data: input });
}
