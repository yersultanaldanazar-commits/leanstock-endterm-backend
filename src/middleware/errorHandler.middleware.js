// Converts thrown errors into consistent HTTP responses.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
function errorHandler(error, _req, res, _next) {
    if (error instanceof errors_1.AppError) {
        return res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    }
    logger_1.logger.error({ error }, 'Unhandled error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
