// Provides helpers for paginated API responses.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationQuerySchema = exports.normalizePagination = exports.paginated = void 0;
const { z, ZodError } = require("zod");
const { ValidationError } = require("./errors");

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

exports.paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0)
});

function normalizePagination(query = {}) {
  try {
    const parsed = exports.paginationQuerySchema.parse(query);
    return { limit: parsed.limit, offset: parsed.offset };
  } catch (error) {
    if (error instanceof ZodError) throw new ValidationError(error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "));
    throw error;
  }
}
exports.normalizePagination = normalizePagination;

function paginated(data, total, pagination) {
  return {
    data,
    meta: {
      total,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: pagination.offset + data.length < total
    }
  };
}
exports.paginated = paginated;
