// Handles HTTP requests for background job actions.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEmailJobs = listEmailJobs;
exports.processEmailJob = processEmailJob;
const emailService = require("../services/email.service");
async function listEmailJobs(_req, res) { res.json(await emailService.listEmailJobs()); }
async function processEmailJob(_req, res) { res.json(await emailService.processNextEmailJob()); }
