import { test } from "node:test";
import assert from "node:assert/strict";
import passwordStrength from "./passwordStrength.js";

test("password strength hint", () => {
  assert.equal(passwordStrength("").label, "Too short");
  assert.equal(passwordStrength("abc12").score, 0, "under 6 characters");
  assert.equal(passwordStrength("Password").label, "Too common", "common passwords, any case");
  assert.equal(passwordStrength("aaaaaaaaaa").label, "Too common", "one repeated character");
  assert.equal(passwordStrength("sunset").label, "Weak");
  assert.equal(passwordStrength("sunsetbeach").label, "Fair", "10+ characters");
  assert.equal(passwordStrength("Sunset-beach7").label, "Good", "10+ and three kinds of characters");
  assert.equal(passwordStrength("Sunset-beach-17-blue").label, "Strong", "14+ and three kinds");
  assert.equal(passwordStrength("sunset beach at noon").label, "Good", "a long passphrase");
  for (const value of ["", "abc12", "sunset", "Sunset-beach-17-blue"]) assert.ok(passwordStrength(value).tip.length > 0, `a tip for "${value}"`);
});
