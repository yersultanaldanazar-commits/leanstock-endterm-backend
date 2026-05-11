// Handles HTTP requests for demand forecasts.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSale = recordSale;
exports.calculateReorderForecast = calculateReorderForecast;
exports.applyReorderForecast = applyReorderForecast;
const service = require("../services/forecast.service");
async function recordSale(req, res) { res.status(201).json(await service.recordSale(req.user.tenantId, req.body)); }
async function calculateReorderForecast(req, res) { res.json(await service.calculateReorderForecast(req.user.tenantId, req.query)); }
async function applyReorderForecast(req, res) { res.json(await service.applyReorderForecast(req.user.tenantId, req.query)); }
