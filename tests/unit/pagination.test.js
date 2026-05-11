// Tests pagination helper behavior.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizePagination, paginated } = require("../../src/utils/pagination");

describe("pagination helper", () => {
  it("normalizes default pagination", () => {
    expect(normalizePagination({})).toEqual({ limit: 20, offset: 0 });
  });
  it("wraps data with total and hasMore metadata", () => {
    expect(paginated([1, 2], 5, { limit: 2, offset: 0 }).meta.hasMore).toBe(true);
  });
});
