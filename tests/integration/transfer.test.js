import { describe, expect, it } from "vitest";

function validateTransferInput({ sourceLocationId, destinationLocationId, quantity }) {
  if (sourceLocationId === destinationLocationId) {
    return {
      valid: false,
      code: "SAME_LOCATION"
    };
  }

  if (quantity <= 0) {
    return {
      valid: false,
      code: "INVALID_QUANTITY"
    };
  }

  return {
    valid: true,
    code: null
  };
}

describe("inventory transfer", () => {
  it("requires source and destination to be different", () => {
    const result = validateTransferInput({
      sourceLocationId: "location-1",
      destinationLocationId: "location-1",
      quantity: 10
    });

    expect(result.valid).toBe(false);
    expect(result.code).toBe("SAME_LOCATION");
  });

  it("rejects zero or negative quantity", () => {
    expect(
      validateTransferInput({
        sourceLocationId: "location-1",
        destinationLocationId: "location-2",
        quantity: 0
      }).valid
    ).toBe(false);

    expect(
      validateTransferInput({
        sourceLocationId: "location-1",
        destinationLocationId: "location-2",
        quantity: -5
      }).valid
    ).toBe(false);
  });

  it("accepts valid transfer input", () => {
    const result = validateTransferInput({
      sourceLocationId: "location-1",
      destinationLocationId: "location-2",
      quantity: 20
    });

    expect(result.valid).toBe(true);
  });
});