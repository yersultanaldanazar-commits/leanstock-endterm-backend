// Provides helpers for hashing and secure random values.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomToken = randomToken;
exports.sha256 = sha256;
const crypto_1 = __importDefault(require("crypto"));
function randomToken(bytes = 48) {
    return crypto_1.default.randomBytes(bytes).toString('base64url');
}
function sha256(value) {
    return crypto_1.default.createHash('sha256').update(value).digest('hex');
}
