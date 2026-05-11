import { describe, expect, it } from "vitest";

function canCreateTenantUser(role) {
  return role === "TENANT_ADMIN";
}

describe("RBAC behavior", () => {
  it("allows TENANT_ADMIN to create tenant users", () => {
    expect(canCreateTenantUser("TENANT_ADMIN")).toBe(true);
  });

  it("rejects WAREHOUSE_MANAGER from creating tenant users", () => {
    expect(canCreateTenantUser("WAREHOUSE_MANAGER")).toBe(false);
  });

  it("rejects STAFF_MEMBER from creating tenant users", () => {
    expect(canCreateTenantUser("STAFF_MEMBER")).toBe(false);
  });
});