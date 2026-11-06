import test from "node:test";
import assert from "node:assert/strict";
import {
  ageFromBirthDate,
  birthDateSchema,
  handleSchema,
  newPasswordSchema,
  bioSchema,
  passwordChangeSchema,
  safeNextPath,
  signUpSchema,
} from "../lib/community-validation";

test("handles are trimmed, lowercased and limited to safe characters", () => {
  assert.equal(handleSchema.parse("  Lucia_VC "), "lucia_vc");
  for (const bad of ["ab", "has space", "dash-name", "x".repeat(25), "émile"]) {
    assert.equal(handleSchema.safeParse(bad).success, false, bad);
  }
});

test("reserved handles cannot be claimed in any case", () => {
  for (const reserved of ["admin", "VICECITYFEED", "Support"]) {
    assert.equal(handleSchema.safeParse(reserved).success, false, reserved);
  }
});

test("sign-up normalises email and enforces password length", () => {
  const ok = signUpSchema.parse({
    birthYear: "1990",
    birthMonth: "6",
    birthDay: "15",
    email: " Jason@Example.com ",
    password: "longenough",
    handle: "jason",
    displayName: " Jason ",
  });
  assert.equal(ok.email, "jason@example.com");
  assert.equal(ok.displayName, "Jason");
  assert.equal(
    signUpSchema.safeParse({ ...ok, password: "short" }).success,
    false,
  );
  assert.equal(
    signUpSchema.safeParse({ ...ok, email: "not-an-email" }).success,
    false,
  );
});

test("profile bio is capped at 280 characters", () => {
  assert.equal(bioSchema.parse("  hi  "), "hi");
  assert.equal(bioSchema.safeParse("x".repeat(281)).success, false);
});

test("password change needs the current password and a new, matching one", () => {
  const ok = { currentPassword: "oldpassword", password: "newpassword", confirmPassword: "newpassword" };
  assert.equal(passwordChangeSchema.safeParse(ok).success, true);
  assert.equal(passwordChangeSchema.safeParse({ ...ok, confirmPassword: "nope12345" }).success, false);
  assert.equal(passwordChangeSchema.safeParse({ ...ok, password: "oldpassword", confirmPassword: "oldpassword" }).success, false);
  assert.equal(passwordChangeSchema.safeParse({ ...ok, currentPassword: "" }).success, false);
});

test("post-login redirects stay on this site", () => {
  assert.equal(safeNextPath("/settings/profile/"), "/settings/profile/");
  for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "settings", undefined, "/a\nb"]) {
    assert.equal(safeNextPath(bad), "/", String(bad));
  }
});

test("avatar type comes from file bytes, not the declared MIME type", async () => {
  const { sniffImageType } = await import("../lib/image-sniff");
  const bytes = (...values: number[]) => new Uint8Array(values);
  const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));
  assert.equal(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
  assert.equal(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
  assert.equal(sniffImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP"))), "image/webp");
  assert.equal(sniffImageType(bytes(...ascii("<svg onload=alert(1)>"))), null);
  assert.equal(sniffImageType(bytes()), null);
});

test("age is computed in whole years and rejects impossible dates", () => {
  const today = new Date(Date.UTC(2026, 10, 6));
  assert.equal(ageFromBirthDate(2013, 11, 6, today), 13);
  assert.equal(ageFromBirthDate(2013, 11, 7, today), 12);
  assert.equal(ageFromBirthDate(2001, 2, 29, today), null);
  assert.equal(ageFromBirthDate(2000, 2, 29, today), 26);
});

test("sign-up requires a real date of birth and a minimum age of 13", () => {
  const year = new Date().getUTCFullYear();
  assert.equal(birthDateSchema.safeParse({ birthYear: year - 20, birthMonth: 1, birthDay: 1 }).success, true);
  const young = birthDateSchema.safeParse({ birthYear: year - 5, birthMonth: 1, birthDay: 1 });
  assert.equal(young.success, false);
  assert.match(young.error?.issues[0].message ?? "", /at least 13/);
  assert.equal(birthDateSchema.safeParse({ birthYear: 1990, birthMonth: 2, birthDay: 31 }).success, false);
  assert.equal(birthDateSchema.safeParse({ birthYear: "", birthMonth: "", birthDay: "" }).success, false);
});

test("new passwords must match", () => {
  assert.equal(newPasswordSchema.safeParse({ password: "longenough", confirmPassword: "longenough" }).success, true);
  assert.equal(newPasswordSchema.safeParse({ password: "longenough", confirmPassword: "different1" }).success, false);
});

test("session-only sign-in strips cookie lifetimes but keeps deletes", async () => {
  const { withSessionLifetime } = await import("../lib/session-cookie");
  assert.deepEqual(withSessionLifetime({ path: "/", maxAge: 400 }, true), { path: "/" });
  assert.deepEqual(withSessionLifetime({ path: "/", maxAge: 0 }, true), { path: "/", maxAge: 0 });
  assert.deepEqual(withSessionLifetime({ path: "/", maxAge: 400 }, false), { path: "/", maxAge: 400 });
});
