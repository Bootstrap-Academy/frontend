# Public feedback

`FeedbackLauncher` lives outside `NuxtLayout` in `app.vue`, alongside the single footer, so closing it or navigating between layouts preserves the in-memory draft. The separate `error.vue` entry also renders one footer and launcher. An account/session change or reload clears the draft. No draft, screenshot, account identifier or consent is stored in browser persistence.

The dialog submits through its own credential-free `POST /feedback` to `BASE_API_URL`. It does not use the authenticated API wrapper, refresh tokens or automatic retries. Optional diagnostics are collected only after the unchecked consent control is selected and are shown exactly before sending. `FEEDBACK_BUILD` is determined at build time from Git; a dirty or unavailable source is identified explicitly.

An uncertain network/server response freezes the original UUID and payload. The explicit **Check status** action sends the same request to the backend's idempotent reconciliation path. A pending submission must not be assigned a new UUID automatically. Confirmed responses link only to issues in `Bootstrap-Academy/Bootstrap-Academy`.

Images remain local until submission. PNG/JPEG file selection and paste work without tab capture. Native capture is offered only when the browser has both display capture and capture-handle APIs; a chosen source must prove it is the current browser tab. Other sources are rejected and all acquired tracks are stopped, including late results after an account switch. The browser's permission picker itself requires manual verification on the target OS/browser.

Cropping, rectangles, arrows and opaque redaction change canvas pixels. Only the explicitly attached final raster is sent. Export flattens transparency onto white and creates PNG; large images are proportionally reduced to satisfy dimensions, pixel count and a conservative byte limit. The server independently validates and reencodes. Never send the original image, editable layers or an unconfirmed preview.

Contact and privacy copy makes GitHub publication explicit and points personal requests and security reports to the email contact in the legal notice. Deployment must configure the backend's dedicated service credentials and public image origin; no GitHub token belongs in Nuxt public configuration.

## Local checks

```sh
node --test tests/feedback.test.mjs tests/update-notice.test.mjs
npx eslint utils/feedback.ts components/FeedbackLauncher.vue components/FeedbackScreenshot.vue nuxt.config.ts pages/contact.vue pages/docs/privacy.vue
```

`tests/feedback.browser.mjs` uses a dedicated Chromium debugging target and a running local Nuxt app. It intercepts the API in that target and blocks other external requests; it does not create GitHub issues. The defaults are app `127.0.0.1:56621`, API `127.0.0.1:56623`, CDP `127.0.0.1:56622`; override with `FEEDBACK_TEST_APP`, `FEEDBACK_TEST_API`, `FEEDBACK_TEST_CDP` as needed.

```sh
NUXT_PUBLIC_BASE_API_URL=http://127.0.0.1:56623 npx nuxt dev --host 127.0.0.1 --port 56621
# Start an isolated Chromium profile with --remote-debugging-port=56622, then:
node tests/feedback.browser.mjs
```

The mounted-browser checks cover text-only submission, consent withdrawal, exact explicit pending retry, local image selection/attachment, crop and opaque exported pixels, close/reopen preservation, 320px layout, Escape focus return and account-boundary cleanup. Capture checks use synthetic browser media tracks to cover cancellation, wrong-source rejection, stop-on-completion and late-result cleanup. They do not automate the OS permission UI or replace an integration check against the actual Rust router.
