import test from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "../src/lib/auth/redirect";
import { safeSignInReturn } from "../src/lib/auth-redirect";

test("safeNextPath keeps internal paths and query strings", () => {
  assert.equal(safeNextPath("/"), "/");
  assert.equal(safeNextPath("/projects"), "/projects");
  assert.equal(safeNextPath("/projects?tab=one#result"), "/projects?tab=one#result");
  assert.equal(safeNextPath("/auth/confirm?error=expired"), "/auth/confirm?error=expired");
});

test("safeNextPath rejects redirects away from this app", () => {
  assert.equal(safeNextPath(undefined), "/");
  assert.equal(safeNextPath(""), "/");
  assert.equal(safeNextPath("projects"), "/");
  assert.equal(safeNextPath("https://example.com"), "/");
  assert.equal(safeNextPath("//example.com"), "/");
  assert.equal(safeNextPath("/\\example.com"), "/");
  assert.equal(safeNextPath("//example.com", "/projects"), "/projects");
});

test("safeSignInReturn matches the shared redirect policy", () => {
  assert.equal(safeSignInReturn("/courses"), "/courses");
  assert.equal(safeSignInReturn("//evil.example"), "/");
});
