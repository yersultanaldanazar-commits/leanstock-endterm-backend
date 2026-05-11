// Handles HTTP requests for dead stock decay actions.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDecay = runDecay;
const decay_service_1 = require("../services/decay.service");
async function runDecay(_req, res) {
    res.json(await (0, decay_service_1.runDeadStockDecay)());
}
