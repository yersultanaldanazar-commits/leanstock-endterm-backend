// Handles HTTP requests for catalog and inventory data.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLocation = createLocation;
exports.listLocations = listLocations;
exports.getLocation = getLocation;
exports.updateLocation = updateLocation;
exports.deleteLocation = deleteLocation;
exports.createSku = createSku;
exports.listSkus = listSkus;
exports.getSku = getSku;
exports.updateSku = updateSku;
exports.deleteSku = deleteSku;
exports.receiveInventory = receiveInventory;
exports.listInventory = listInventory;
exports.getInventory = getInventory;
exports.updateInventory = updateInventory;
exports.listLowStock = listLowStock;
exports.listDeadStock = listDeadStock;
const catalog = require("../services/catalog.service");
const { normalizePagination } = require("../utils/pagination");
async function createLocation(req, res) { res.status(201).json(await catalog.createLocation(req.user.tenantId, req.body)); }
async function listLocations(req, res) { res.json(await catalog.listLocations(req.user.tenantId, normalizePagination(req.query))); }
async function getLocation(req, res) { res.json(await catalog.getLocation(req.user.tenantId, req.params.id)); }
async function updateLocation(req, res) { res.json(await catalog.updateLocation(req.user.tenantId, req.params.id, req.body)); }
async function deleteLocation(req, res) { res.json(await catalog.deleteLocation(req.user.tenantId, req.params.id)); }
async function createSku(req, res) { res.status(201).json(await catalog.createSku(req.user.tenantId, req.body)); }
async function listSkus(req, res) { res.json(await catalog.listSkus(req.user.tenantId, normalizePagination(req.query))); }
async function getSku(req, res) { res.json(await catalog.getSku(req.user.tenantId, req.params.id)); }
async function updateSku(req, res) { res.json(await catalog.updateSku(req.user.tenantId, req.params.id, req.body)); }
async function deleteSku(req, res) { res.json(await catalog.deleteSku(req.user.tenantId, req.params.id)); }
async function receiveInventory(req, res) { res.status(201).json(await catalog.receiveInventory(req.user.tenantId, req.body)); }
async function listInventory(req, res) { res.json(await catalog.listInventory(req.user.tenantId, normalizePagination(req.query))); }
async function getInventory(req, res) { res.json(await catalog.getInventory(req.user.tenantId, req.params.id)); }
async function updateInventory(req, res) { res.json(await catalog.updateInventory(req.user.tenantId, req.params.id, req.body)); }
async function listLowStock(req, res) { res.json(await catalog.listLowStock(req.user.tenantId, normalizePagination(req.query))); }
async function listDeadStock(req, res) { res.json(await catalog.listDeadStock(req.user.tenantId, normalizePagination(req.query))); }
