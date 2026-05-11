// Starts the API server and handles graceful shutdown.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { createApp } = require("./app");
const { env } = require("./config/env");
const { prisma, disconnectPrisma } = require("./config/prisma");
const { connectRedis, disconnectRedis } = require("./config/redis");
const { startDeadStockDecayJob } = require("./jobs/deadStockDecay.job");
const { startEmailWorker, stopEmailWorker } = require("./services/email.service");
const { logger } = require("./utils/logger");
async function main() {
  await prisma.$connect();
  await connectRedis();
  if (env.RUN_JOBS) startDeadStockDecayJob();
  startEmailWorker();
  const app = createApp();
  const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, "LeanStock API listening"));
  const shutdown = async () => {
    server.close(async () => {
      stopEmailWorker();
      await disconnectRedis();
      await disconnectPrisma();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
main().catch(async (error) => {
  logger.error({ error }, "Failed to start app");
  stopEmailWorker();
  await disconnectRedis();
  await disconnectPrisma();
  process.exit(1);
});
