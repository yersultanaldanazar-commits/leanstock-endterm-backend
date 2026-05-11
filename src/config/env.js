// Reads and validates environment variables for the app.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOrigins = exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const envalid_1 = require("envalid");
dotenv_1.default.config();
exports.env = (0, envalid_1.cleanEnv)(process.env, {
  NODE_ENV: (0, envalid_1.str)({ choices: ["development", "test", "production"], default: "development" }),
  PORT: (0, envalid_1.port)({ default: 3001 }),
  DATABASE_URL: (0, envalid_1.str)(),
  JWT_ACCESS_SECRET: (0, envalid_1.str)({ min: 32 }),
  JWT_REFRESH_SECRET: (0, envalid_1.str)({ min: 32 }),
  JWT_ACCESS_EXPIRES_IN: (0, envalid_1.str)({ default: "15m" }),
  REFRESH_TOKEN_EXPIRES_DAYS: (0, envalid_1.num)({ default: 30 }),
  BCRYPT_ROUNDS: (0, envalid_1.num)({ default: 12 }),
  CORS_ORIGINS: (0, envalid_1.str)({ default: "http://localhost:5173,http://localhost:3001" }),
  RUN_JOBS: (0, envalid_1.bool)({ default: true }),
  REDIS_URL: (0, envalid_1.str)({ default: "redis://localhost:6379" }),
  RESERVATION_TTL_SECONDS: (0, envalid_1.num)({ default: 900 }),
  APP_BASE_URL: (0, envalid_1.str)({ default: "http://localhost:3001" }),
  EMAIL_FROM: (0, envalid_1.str)({ default: "LeanStock <onboarding@resend.dev>" }),
  RESEND_API_KEY: (0, envalid_1.str)({ default: "" }),
  EMAIL_DRY_RUN: (0, envalid_1.bool)({ default: true }),
  EMAIL_WORKER_ENABLED: (0, envalid_1.bool)({ default: true }),
  EMAIL_WORKER_INTERVAL_MS: (0, envalid_1.num)({ default: 2000 })
});
exports.corsOrigins = exports.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
if (exports.env.isProduction && exports.corsOrigins.includes("*")) {
  throw new Error("CORS_ORIGINS cannot contain wildcard (*) in production");
}
if (exports.env.isProduction && exports.env.EMAIL_DRY_RUN) {
  throw new Error("EMAIL_DRY_RUN must be false in production");
}
if (exports.env.isProduction && !exports.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is required in production for real email delivery");
}
