// Handles HTTP requests for user accounts.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantUser = createTenantUser;
exports.listTenantUsers = listTenantUsers;
exports.getTenantUser = getTenantUser;
exports.updateTenantUser = updateTenantUser;
const users = require("../services/user.service");
const { normalizePagination } = require("../utils/pagination");
async function createTenantUser(req, res) { res.status(201).json(await users.createTenantUser(req.user.tenantId, req.user.id, req.body, req.ip)); }
async function listTenantUsers(req, res) { res.json(await users.listTenantUsers(req.user.tenantId, normalizePagination(req.query))); }
async function getTenantUser(req, res) { res.json(await users.getTenantUser(req.user.tenantId, req.params.id)); }
async function updateTenantUser(req, res) { res.json(await users.updateTenantUser(req.user.tenantId, req.user.id, req.params.id, req.body, req.ip)); }
