const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const ts = require(path.join(root, "node_modules/typescript"));
const fetchCode = fs
  .readFileSync(path.join(root, "composables/fetch.js"), "utf8")
  .replace(/^import .*;\n/gm, "")
  .replace(/\bexport /g, "");
const context = {
  exports: {},
  Mutex: class {},
  useRuntimeConfig: () => ({ public: { NODE_ENV: "production" } }),
  console,
};
vm.runInNewContext(fetchCode + "\nexports.hook=onResponseError;", context);
(async () => {
  const receipt = {
    code: "EventSettlementPending",
    cancellation_committed: true,
    pending_operations: 1,
  };
  const response = { status: 503, _data: { detail: receipt } };
  await context.exports.hook({ options: {}, response });
  assert.equal(response._data.detail, receipt);
  const t7 =
    "Your payment is still being checked. Please retry this order later; do not place a second order.";
  const paypal = { status: 503, _data: { detail: t7 } };
  await context.exports.hook({ options: {}, response: paypal });
  assert.equal(paypal._data.detail, t7);
  const declarations = fs.readFileSync(path.join(root, "composables/contracts.ts"), "utf8");
  const code = ts.transpileModule(declarations, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const calls = [];
  const confirmation = {
    declaration: { id: "synthetic-receipt", received_at: "2026-09-07T12:00:00Z" },
    confirmation_email_sent: false,
  };
  const publicContext = {
    exports: {},
    useRuntimeConfig: () => ({ public: { BASE_API_URL: "http://localhost.invalid" } }),
    $fetch: async (...args) => {
      calls.push(args);
      return confirmation;
    },
    refresh: () => {
      throw Error("must not refresh");
    },
    useRouter: () => {
      throw Error("must not navigate");
    },
    Date,
    Intl,
    crypto: require("node:crypto").webcrypto,
  };
  vm.runInNewContext(code, publicContext);
  for (const fn of ["declareCancellation", "declareWithdrawal"]) {
    const [result, error] = await publicContext.exports[fn]({ email: "synthetic@example.invalid" });
    assert.equal(result.declaration.id, confirmation.declaration.id);
    assert.equal(result.declaration.received_at, confirmation.declaration.received_at);
    assert.equal(result.confirmation_email_sent, false);
    assert.equal(error, null);
  }
  for (const [url, options] of calls) {
    assert(url.startsWith("/contracts/"));
    assert.equal(options.credentials, "omit");
    assert.equal(options.retry, 0);
    assert.equal(options.method, "POST");
    assert(!("headers" in options));
    assert(!("onResponseError" in options));
  }
  console.log(
    "PASS: T9 structured pending receipt; T7 exact pending-payment string; T5 both anonymous declarations retain receipt including failed email flag, omit credentials, do not retry, refresh or navigate."
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
