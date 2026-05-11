// Creates and manages the Redis connection.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
exports.withRedisLock = withRedisLock;
const { createClient } = require("redis");
const { env } = require("./env");
const { ConflictError } = require("../utils/errors");
const { randomToken } = require("../utils/crypto");
const { logger } = require("../utils/logger");
exports.redisClient = createClient({ url: env.REDIS_URL });
exports.redisClient.on("error", (error) => logger.error({ error }, "Redis error"));
async function connectRedis() {
  if (!exports.redisClient.isOpen) await exports.redisClient.connect();
}
async function disconnectRedis() {
  if (exports.redisClient.isOpen) await exports.redisClient.quit();
}
async function withRedisLock(key, ttlSeconds, callback) {
  await connectRedis();
  const token = randomToken(24);
  const acquired = await exports.redisClient.set(key, token, { NX: true, EX: ttlSeconds });
  if (acquired !== "OK") throw new ConflictError("Resource is temporarily locked. Try again shortly.");
  try {
    return await callback();
  } finally {
    await exports.redisClient.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      { keys: [key], arguments: [token] }
    );
  }
}
