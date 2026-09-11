import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicLegalRoute } from "../composables/publicLegalRoutes.ts";

test("public declaration and document routes remain public with normal URL suffixes", () => {
  for (const path of [
    "/vertrag-kuendigen",
    "/VERTRAG-KUENDIGEN",
    "/vertrag-widerrufen",
    "/Vertrag-Widerrufen",
    "/docs",
    "/DOCS",
    "/docs/privacy",
    "/DoCs/Privacy",
    "/docs/imprint",
    "/docs/terms-and-conditions",
    "/docs/right-of-withdrawal",
    "/moderation",
    "/MODERATION",
    "/moderation/access",
  ]) {
    for (const suffix of ["", "/", "?from=footer", "/?from=footer#record", "#record"]) {
      assert.equal(isPublicLegalRoute(path + suffix), true, path + suffix);
    }
  }
});

test("exemptions do not spread to authenticated account or similarly named routes", () => {
  for (const path of [
    "/account",
    "/ACCOUNT",
    "/account/profile",
    "/Account/Profile",
    "/subscription",
    "/SuBsCrIpTiOn",
    "/dashboard",
    "/auth/login",
    "/",
    "/docs-private",
    "/moderation-private",
    "/DOCS-PRIVATE",
    "/vertrag-kuendigen-admin",
    "/VERTRAG-KUENDIGEN-ADMIN",
    "/vertrag-widerrufen/history",
    "/Vertrag-Widerrufen/History",
    "/DOCS%2Fprivacy",
    "/VERTRAG-KUENDIGEN%2F",
  ]) {
    for (const suffix of ["", "/", "?from=footer", "/?from=footer#record", "#record"]) {
      assert.equal(isPublicLegalRoute(path + suffix), false, path + suffix);
    }
  }
});
