// Builds the Express app and connects all middleware and routes.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const pino_http_1 = __importDefault(require("pino-http"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = __importDefault(require("yaml"));
const routes_1 = require("./routes");
const env_1 = require("./config/env");
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const logger_1 = require("./utils/logger");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({ origin: env_1.env.isProduction ? env_1.corsOrigins : env_1.corsOrigins, credentials: true }));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use((0, cookie_parser_1.default)());
    app.use((0, pino_http_1.default)({ logger: logger_1.logger }));
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    const openapiPath = node_path_1.default.join(process.cwd(), 'docs/openapi.yaml');
    if (node_fs_1.default.existsSync(openapiPath)) {
        const doc = yaml_1.default.parse(node_fs_1.default.readFileSync(openapiPath, 'utf8'));
        app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(doc));
    }
    app.use('/api/v1', routes_1.apiRouter);
    app.use(errorHandler_middleware_1.errorHandler);
    return app;
}
