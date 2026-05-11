import { describe, expect, it } from "vitest";

function isStrongPassword(password) {
  return (
    password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function shouldAllowProtectedRoute({ isAuthenticated, isEmailVerified }) {
  return isAuthenticated && isEmailVerified;
}

describe("authentication rules", () => {
  it("accepts strong passwords", () => {
    expect(isStrongPassword("Password123!")).toBe(true);
  });

  it("rejects weak passwords", () => {
    expect(isStrongPassword("password")).toBe(false);
    expect(isStrongPassword("Password123")).toBe(false);
    expect(isStrongPassword("password123!")).toBe(false);
  });

  it("blocks protected routes for unverified users", () => {
    expect(
      shouldAllowProtectedRoute({
        isAuthenticated: true,
        isEmailVerified: false
      })
    ).toBe(false);
  });

  it("allows protected routes for verified authenticated users", () => {
    expect(
      shouldAllowProtectedRoute({
        isAuthenticated: true,
        isEmailVerified: true
      })
    ).toBe(true);
  });
});