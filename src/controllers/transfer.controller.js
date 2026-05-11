// Handles HTTP requests for stock transfers.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransfer = createTransfer;
exports.listTransfers = listTransfers;
exports.getTransfer = getTransfer;
exports.completeTransfer = completeTransfer;
exports.cancelTransfer = cancelTransfer;
const transfer = require("../services/transfer.service");
const { normalizePagination } = require("../utils/pagination");
async function createTransfer(req, res) { res.status(201).json(await transfer.transferInventory(req.user.tenantId, req.user.id, { ...req.body, ipAddress: req.ip })); }
async function listTransfers(req, res) { res.json(await transfer.listTransfers(req.user.tenantId, normalizePagination(req.query))); }
async function getTransfer(req, res) { res.json(await transfer.getTransfer(req.user.tenantId, req.params.id)); }
async function completeTransfer(req, res) { res.json(await transfer.completeTransfer(req.user.tenantId, req.user.id, req.params.id, req.ip)); }
async function cancelTransfer(req, res) { res.json(await transfer.cancelTransfer(req.user.tenantId, req.user.id, req.params.id, req.ip)); }
