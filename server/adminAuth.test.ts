import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./adminAuth";

describe("admin password security", () => {
  it("stores passwords as salted scrypt hashes and verifies them", () => {
    const encoded = hashPassword("correct horse battery staple");
    expect(encoded.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery staple", encoded)).toBe(true);
    expect(verifyPassword("wrong password", encoded)).toBe(false);
  });

  it("uses a different salt for each password hash", () => {
    expect(hashPassword("same password")).not.toBe(hashPassword("same password"));
  });
});
