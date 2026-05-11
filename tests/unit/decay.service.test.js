import { describe, expect, it } from "vitest";

function calculateDeadStockDiscount(daysInInventory) {
  if (daysInInventory < 30) return 0;

  const periodsAfterThirtyDays = Math.floor((daysInInventory - 30) / 3) + 1;
  return Math.min(periodsAfterThirtyDays * 10, 70);
}

describe("dead-stock decay rules", () => {
  it("does not discount fresh inventory", () => {
    expect(calculateDeadStockDiscount(10)).toBe(0);
    expect(calculateDeadStockDiscount(29)).toBe(0);
  });

  it("applies 10% discount after 30 days", () => {
    expect(calculateDeadStockDiscount(30)).toBe(10);
  });

  it("adds 10% every 3 days after 30 days", () => {
    expect(calculateDeadStockDiscount(33)).toBe(20);
    expect(calculateDeadStockDiscount(36)).toBe(30);
  });

  it("caps discount at 70%", () => {
    expect(calculateDeadStockDiscount(90)).toBe(70);
  });
});