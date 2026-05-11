// Runs the scheduled job that lowers dead stock value.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDeadStockDecayJob = startDeadStockDecayJob;
const node_cron_1 = __importDefault(require("node-cron"));
const decay_service_1 = require("../services/decay.service");
const logger_1 = require("../utils/logger");
function startDeadStockDecayJob() {
    node_cron_1.default.schedule('0 2 * * *', async () => {
        try {
            const result = await (0, decay_service_1.runDeadStockDecay)();
            logger_1.logger.info({ result }, 'Dead stock decay job completed');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Dead stock decay job failed');
        }
    });
}
