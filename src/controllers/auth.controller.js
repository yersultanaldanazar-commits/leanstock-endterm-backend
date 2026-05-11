// Handles HTTP requests for login, tokens, and logout.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.verifyEmail = verifyEmail;
exports.resendVerification = resendVerification;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.me = me;
exports.changePassword = changePassword;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const authService = require("../services/auth.service");
async function register(req, res) { res.status(201).json(await authService.registerTenantAdmin({ ...req.body, ipAddress: req.ip })); }
async function verifyEmail(req, res) { res.json(await authService.verifyEmail(req.body?.token ?? req.query?.token, req.ip)); }
async function resendVerification(req, res) { res.json(await authService.resendVerification(req.body, req.ip)); }
async function login(req, res) { res.status(200).json(await authService.login({ ...req.body, ipAddress: req.ip })); }
async function refresh(req, res) { res.status(200).json(await authService.refreshAccessToken(req.body.refreshToken)); }
async function logout(req, res) { await authService.logout(req.body.refreshToken, req.user?.id, req.ip); res.status(204).send(); }
async function me(req, res) { res.json(await authService.getCurrentUser(req.user.id, req.user.tenantId)); }
async function changePassword(req, res) { res.json(await authService.changePassword(req.user.id, req.user.tenantId, req.body, req.ip)); }
async function forgotPassword(req, res) { res.json(await authService.forgotPassword(req.body, req.ip)); }
async function resetPassword(req, res) { res.json(await authService.resetPassword(req.body, req.ip)); }
