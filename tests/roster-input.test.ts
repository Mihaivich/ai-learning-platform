import test from "node:test";
import assert from "node:assert/strict";
import { MAX_ROSTER_TEXT, parseRoster } from "../src/lib/roster-input";

test("email lists normalise case, report bad entries, and ignore duplicates", () => {
  assert.deepEqual(parseRoster("Alex@Example.com; sam@example.com\nALEX@example.com,invalid", "emails"), {
    emails: ["alex@example.com", "sam@example.com"], duplicates: 1, invalid: [{ row: 4, value: "invalid" }],
  });
});

test("CSV supports BOM, CRLF, extra columns, quoted commas, newlines and escaped quotes", () => {
  const text = '\uFEFFname, Email ,notes\r\n"Lee, Alex", ALEX@example.com,"say ""hello"""\r\n"Sam\nSmith",sam@example.com,ok\r\nNobody,,missing\r\n\r\n';
  assert.deepEqual(parseRoster(text, "csv"), {
    emails: ["alex@example.com", "sam@example.com"], duplicates: 0, invalid: [{ row: 4, value: "" }],
  });
});

test("CSV requires one email header and refuses malformed quoting", () => {
  for (const text of ["name,address\nAlex,alex@example.com", "email,email\na@example.com,b@example.com", 'email\n"a@example.com', 'email\n"a@example.com"oops', 'email\na"@example.com']) {
    assert.throws(() => parseRoster(text, "csv"));
  }
  assert.throws(() => parseRoster("email\n\n", "csv"), /at least one/);
});

test("rosters bound input size and rows before deduplication", () => {
  assert.throws(() => parseRoster("x".repeat(MAX_ROSTER_TEXT + 1), "emails"), /too large/);
  assert.throws(() => parseRoster(Array(501).fill("a@example.com").join("\n"), "emails"), /500/);
  assert.equal(parseRoster(Array(500).fill("a@example.com").join("\n"), "emails").duplicates, 499);
  assert.deepEqual(parseRoster("email\nnot-an-email", "csv").emails, []);
});
