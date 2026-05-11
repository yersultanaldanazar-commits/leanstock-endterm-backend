// Handles HTTP requests for audit log data.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogs = listAuditLogs;
const service = require("../services/audit.service");
const { normalizePagination } = require("../utils/pagination");
async function listAuditLogs(req, res) { res.json(await service.listAuditLogs(req.user.tenantId, normalizePagination(req.query))); }
