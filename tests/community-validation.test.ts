import test from "node:test";
import assert from "node:assert/strict";
import {
  handleSchema,
  profileUpdateSchema,
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
  const base = { handle: "lucia", displayName: "Lucia" };
  assert.equal(profileUpdateSchema.parse(base).bio, "");
  assert.equal(
    profileUpdateSchema.safeParse({ ...base, bio: "x".repeat(281) }).success,
    false,
  );
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
