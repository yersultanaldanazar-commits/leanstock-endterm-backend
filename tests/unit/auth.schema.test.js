// Tests validation rules for authentication data.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { registerSchema, resetPasswordSchema } = require("../../src/schemas/auth.schema");

describe("auth validation", () => {
  it("rejects weak passwords", () => {
    expect(() => registerSchema.parse({ body: { tenantName: "Demo", email: "a@b.com", password: "password" } })).toThrow();
  });
  it("accepts strong reset password token payload", () => {
    const parsed = resetPasswordSchema.parse({ body: { token: "x".repeat(32), newPassword: "Password123!" } });
    expect(parsed.body.newPassword).toBe("Password123!");
  });
});
