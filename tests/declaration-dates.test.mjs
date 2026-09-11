import { test } from "node:test";
import assert from "node:assert/strict";
import { toRequestedEnd, formatDeclarationDate } from "../composables/contracts.ts";
for (const [day, offset] of [
  ["2027-03-28", "+01:00"],
  ["2027-03-29", "+02:00"],
  ["2027-10-31", "+02:00"],
  ["2027-11-01", "+01:00"],
  ["2028-02-29", "+01:00"],
]) {
  test(`Berlin calendar request ${day}`, () => {
    const actual = toRequestedEnd(day);
    assert.equal(actual, `${day}T00:00:00${offset}`);
    assert.equal(formatDeclarationDate(actual, "en-CA"), day);
  });
}
