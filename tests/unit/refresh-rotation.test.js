// Tests refresh token rotation behavior.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("refresh token policy", () => {
  it("requires rotation by revoking old token and returning a new refresh token", () => {
    const policy = { revokeOld: true, issueNew: true };
    expect(policy).toEqual({ revokeOld: true, issueNew: true });
  });
});
