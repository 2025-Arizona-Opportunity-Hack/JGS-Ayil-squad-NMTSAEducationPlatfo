import { describe, it, expect } from "vitest";
import {
  formatUserName,
  validateEmail,
  validatePhoneNumber,
  validatePrice,
} from "./helpers";

describe("formatUserName", () => {
  it("formats first and last name", () => {
    expect(formatUserName({ firstName: "Jane", lastName: "Doe" })).toBe("Jane Doe");
  });

  it("returns 'Unknown' for null profile", () => {
    expect(formatUserName(null)).toBe("Unknown");
  });

  it("handles empty last name", () => {
    expect(formatUserName({ firstName: "Jane", lastName: "" })).toBe("Jane ");
  });
});

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(() => validateEmail("user@example.com")).not.toThrow();
    expect(() => validateEmail("user+tag@sub.domain.com")).not.toThrow();
  });

  it("rejects emails without @", () => {
    expect(() => validateEmail("userexample.com")).toThrow("Invalid email");
  });

  it("rejects emails without domain", () => {
    expect(() => validateEmail("user@")).toThrow("Invalid email");
  });

  it("rejects empty string", () => {
    expect(() => validateEmail("")).toThrow("Invalid email");
  });

  it("rejects emails with spaces", () => {
    expect(() => validateEmail("user @example.com")).toThrow("Invalid email");
  });
});

describe("validatePhoneNumber", () => {
  it("accepts valid E.164 numbers", () => {
    expect(() => validatePhoneNumber("+14155551234")).not.toThrow();
    expect(() => validatePhoneNumber("+442071234567")).not.toThrow();
    expect(() => validatePhoneNumber("+8613912345678")).not.toThrow();
  });

  it("rejects numbers without +", () => {
    expect(() => validatePhoneNumber("14155551234")).toThrow("Invalid phone number");
  });

  it("rejects numbers starting with +0", () => {
    expect(() => validatePhoneNumber("+04155551234")).toThrow("Invalid phone number");
  });

  it("rejects too-short numbers", () => {
    expect(() => validatePhoneNumber("+1")).toThrow("Invalid phone number");
  });

  it("rejects numbers with letters", () => {
    expect(() => validatePhoneNumber("+1415abc1234")).toThrow("Invalid phone number");
  });
});

describe("validatePrice", () => {
  it("accepts positive integers", () => {
    expect(() => validatePrice(100)).not.toThrow();
    expect(() => validatePrice(1)).not.toThrow();
    expect(() => validatePrice(999999)).not.toThrow();
  });

  it("rejects zero", () => {
    expect(() => validatePrice(0)).toThrow("positive integer");
  });

  it("rejects negative numbers", () => {
    expect(() => validatePrice(-100)).toThrow("positive integer");
  });

  it("rejects floating point numbers", () => {
    expect(() => validatePrice(19.99)).toThrow("positive integer");
  });
});
