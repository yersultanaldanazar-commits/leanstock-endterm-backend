// Handles HTTP requests for stock reservations.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReservation = createReservation;
exports.listReservations = listReservations;
exports.getReservation = getReservation;
exports.confirmReservation = confirmReservation;
exports.releaseReservation = releaseReservation;
exports.expireReservations = expireReservations;
const service = require("../services/reservation.service");
const { normalizePagination } = require("../utils/pagination");
async function createReservation(req, res) { res.status(201).json(await service.createReservation(req.user.tenantId, req.user.id, req.body, req.ip)); }
async function listReservations(req, res) { res.json(await service.listReservations(req.user.tenantId, normalizePagination(req.query))); }
async function getReservation(req, res) { res.json(await service.getReservation(req.user.tenantId, req.params.id)); }
async function confirmReservation(req, res) { res.json(await service.confirmReservation(req.user.tenantId, req.user.id, req.params.id, req.ip)); }
async function releaseReservation(req, res) { res.json(await service.releaseReservation(req.user.tenantId, req.user.id, req.params.id, req.ip)); }
async function expireReservations(req, res) { res.json(await service.expireReservations(req.user.tenantId)); }
