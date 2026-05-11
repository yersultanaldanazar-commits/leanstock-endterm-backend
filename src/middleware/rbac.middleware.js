// Checks user roles before protected actions continue.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const errors_1 = require("../utils/errors");
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user)
            return next(new errors_1.UnauthorizedError());
        if (!roles.includes(req.user.role))
            return next(new errors_1.ForbiddenError('Your role is not allowed to access this resource'));
        next();
    };
}
