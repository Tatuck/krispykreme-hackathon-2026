import { describe, expect, it } from "vitest";
import { isAllowedSignupEmail, isDemoEmail, makeFakeProfile, pinRole } from "../demo";

describe("public demo emails", () => {
  it("accepts only @example.com unless allowlisted", () => {
    expect(isDemoEmail("Lucia.ab12cd@Example.com")).toBe(true);
    expect(isAllowedSignupEmail("someone@gmail.com", "")).toBe(false);
    expect(isAllowedSignupEmail("evil@example.com.attacker.io", "")).toBe(false);
    expect(isAllowedSignupEmail("Team@Gmail.com", "other@x.es, team@gmail.com")).toBe(true);
  });

  it("generates valid, unique-looking fake profiles", () => {
    const p = makeFakeProfile();
    expect(isDemoEmail(p.email)).toBe(true);
    expect(p.email).toMatch(/^[a-z]+\.[0-9a-z]{6}@example\.com$/);
    expect(p.dob).toMatch(/^(19[7-9]\d|200[0-4])-(0[1-9]|1[0-2])-(0[1-9]|1\d|2[0-8])$/);
    expect(makeFakeProfile(() => 0.999).name).toBe("Javier");
  });
});

describe("pinRole", () => {
  it("public staff PIN opens the kiosk, ADMIN_PIN unlocks the owner role", () => {
    expect(pinRole("1234", "1234", "9876")).toBe("staff");
    expect(pinRole("9876", "1234", "9876")).toBe("owner");
    expect(pinRole("0000", "1234", "9876")).toBeNull();
    expect(pinRole("123", "1234")).toBeNull();
  });

  it("without ADMIN_PIN nobody is owner (an empty PIN never matches)", () => {
    expect(pinRole("", "1234", "")).toBeNull();
    expect(pinRole("1234", "1234", "")).toBe("staff");
  });
});
