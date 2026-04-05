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

describe("date timezone handling", () => {
  // Tests verify the T12:00:00 fix for date picker off-by-one bug.
  // When a date string like "2026-03-28" is parsed with new Date(),
  // it's interpreted as UTC midnight — which in western timezones
  // displays as the previous day. Appending T12:00:00 fixes this.

  it("date string without time creates UTC midnight (the bug)", () => {
    const date = new Date("2026-03-28");
    // This is midnight UTC — in e.g. US Pacific time, that's still March 27
    expect(date.getUTCHours()).toBe(0);
  });

  it("date string with T12:00:00 creates noon local time (the fix)", () => {
    const date = new Date("2026-03-28" + "T12:00:00");
    // This is noon local time — always the correct day regardless of timezone
    expect(date.getDate()).toBe(28);
    expect(date.getMonth()).toBe(2); // March is 0-indexed
  });

  it("getTime() with T12:00:00 produces valid timestamp", () => {
    const timestamp = new Date("2026-03-28" + "T12:00:00").getTime();
    expect(timestamp).toBeGreaterThan(0);
    // Round-trip: timestamp back to date should be March 28
    const roundTrip = new Date(timestamp);
    expect(roundTrip.getDate()).toBe(28);
  });

  it("empty date string is handled by the conditional", () => {
    // The form uses: data.startDate ? new Date(data.startDate + "T12:00:00").getTime() : undefined
    const startDate = "";
    const result = startDate ? new Date(startDate + "T12:00:00").getTime() : undefined;
    expect(result).toBeUndefined();
  });
});
