// Queues and sends emails for the app.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueEmail = queueEmail;
exports.processNextEmailJob = processNextEmailJob;
exports.listEmailJobs = listEmailJobs;
exports.startEmailWorker = startEmailWorker;
exports.stopEmailWorker = stopEmailWorker;
exports.buildVerificationEmail = buildVerificationEmail;
exports.buildPasswordResetEmail = buildPasswordResetEmail;
exports.buildBusinessEventEmail = buildBusinessEventEmail;
const { randomUUID } = require("crypto");
const { redisClient, connectRedis } = require("../config/redis");
const { env } = require("../config/env");
const { logger } = require("../utils/logger");

const QUEUE_KEY = "email:queue:pending";
const COMPLETED_KEY = "email:queue:completed";
const FAILED_KEY = "email:queue:failed";
const JOB_PREFIX = "email:job:";
const MAX_ATTEMPTS = 3;
let workerTimer = null;

function jobKey(id) { return `${JOB_PREFIX}${id}`; }

async function queueEmail(input) {
  await connectRedis();
  const id = randomUUID();
  const now = new Date().toISOString();
  const job = {
    id,
    status: "PENDING",
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    eventType: input.eventType,
    tenantId: input.tenantId ?? null,
    userId: input.userId ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    createdAt: now,
    updatedAt: now,
    lastError: null
  };
  await redisClient.set(jobKey(id), JSON.stringify(job), { EX: 60 * 60 * 24 * 14 });
  await redisClient.rPush(QUEUE_KEY, id);
  logger.info({ jobId: id, to: input.to, eventType: input.eventType }, "Email queued");
  return { id, status: job.status, eventType: job.eventType, to: job.to, subject: job.subject };
}

async function sendEmail(job) {
  if (env.EMAIL_DRY_RUN || !env.RESEND_API_KEY) {
    logger.info({ to: job.to, subject: job.subject, eventType: job.eventType }, "Email dry-run delivery");
    return { provider: "dry-run", id: `dry_${job.id}` };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: job.to, subject: job.subject, html: job.html, text: job.text })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Resend API failed: ${response.status} ${body}`);
  return JSON.parse(body || "{}");
}

async function processNextEmailJob() {
  await connectRedis();
  const id = await redisClient.lPop(QUEUE_KEY);
  if (!id) return { processed: false };
  const raw = await redisClient.get(jobKey(id));
  if (!raw) return { processed: false, skipped: true, reason: "missing job payload" };
  const job = JSON.parse(raw);
  job.status = "PROCESSING";
  job.attempts += 1;
  job.updatedAt = new Date().toISOString();
  await redisClient.set(jobKey(id), JSON.stringify(job), { EX: 60 * 60 * 24 * 14 });
  try {
    const providerResponse = await sendEmail(job);
    job.status = "COMPLETED";
    job.providerResponse = providerResponse;
    job.completedAt = new Date().toISOString();
    job.updatedAt = job.completedAt;
    await redisClient.set(jobKey(id), JSON.stringify(job), { EX: 60 * 60 * 24 * 14 });
    await redisClient.lPush(COMPLETED_KEY, id);
    await redisClient.lTrim(COMPLETED_KEY, 0, 99);
    return { processed: true, id, status: job.status };
  } catch (error) {
    job.status = job.attempts >= job.maxAttempts ? "FAILED" : "PENDING";
    job.lastError = error.message;
    job.updatedAt = new Date().toISOString();
    await redisClient.set(jobKey(id), JSON.stringify(job), { EX: 60 * 60 * 24 * 14 });
    if (job.status === "PENDING") await redisClient.rPush(QUEUE_KEY, id);
    else {
      await redisClient.lPush(FAILED_KEY, id);
      await redisClient.lTrim(FAILED_KEY, 0, 99);
    }
    logger.error({ error, jobId: id, attempts: job.attempts }, "Email job failed");
    return { processed: true, id, status: job.status, error: error.message };
  }
}

async function listEmailJobs() {
  await connectRedis();
  const keys = [];
  for await (const key of redisClient.scanIterator({ MATCH: `${JOB_PREFIX}*`, COUNT: 100 })) keys.push(key);
  const jobs = [];
  for (const key of keys) {
    const raw = await redisClient.get(key);
    if (raw) jobs.push(JSON.parse(raw));
  }
  jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return jobs.slice(0, 100).map(({ html, text, ...job }) => job);
}

function startEmailWorker() {
  if (!env.EMAIL_WORKER_ENABLED || workerTimer) return;
  workerTimer = setInterval(() => {
    processNextEmailJob().catch((error) => logger.error({ error }, "Email worker tick failed"));
  }, env.EMAIL_WORKER_INTERVAL_MS);
  logger.info({ intervalMs: env.EMAIL_WORKER_INTERVAL_MS }, "Email worker started");
}

function stopEmailWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
}

function buildVerificationEmail({ email, token }) {
  const verifyUrl = `${env.APP_BASE_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`;
  return {
    to: email,
    subject: "Verify your LeanStock account",
    text: `Welcome to LeanStock. Verify your account here: ${verifyUrl}`,
    html: `<p>Welcome to LeanStock.</p><p><a href="${verifyUrl}">Verify your account</a></p><p>Token: <code>${token}</code></p>`
  };
}

function buildPasswordResetEmail({ email, token }) {
  return {
    to: email,
    subject: "Reset your LeanStock password",
    text: `Use this password reset token: ${token}`,
    html: `<p>Use this password reset token:</p><p><code>${token}</code></p>`
  };
}

function buildBusinessEventEmail({ to, subject, message }) {
  return { to, subject, text: message, html: `<p>${message}</p>` };
}
