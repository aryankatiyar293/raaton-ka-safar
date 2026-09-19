import { describe, expect, it } from "vitest";

describe("configured admin credentials", () => {
  it("authenticate through the admin login API", async () => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be available to validate the configured admin login.");

    const baseUrl = process.env.ADMIN_TEST_BASE_URL || "http://127.0.0.1:3000";
    const response = await fetch(`${baseUrl}/api/admin/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json() as { admin?: { email?: string }; error?: string };

    expect(response.status, payload.error || "admin login should succeed").toBe(200);
    expect(payload.admin?.email).toBe(email.toLowerCase());
  }, 15_000);
});
