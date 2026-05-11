// Validates request data with schemas before handlers run.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
function validate(schema) {
    return (req, _res, next) => {
        try {
            const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
            req.body = parsed.body ?? req.body;
            req.query = parsed.query ?? req.query;
            req.params = parsed.params ?? req.params;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                next(new errors_1.ValidationError(error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')));
            }
            else
                next(error);
        }
    };
}
