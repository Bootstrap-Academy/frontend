# Frontend deployment and recovery

Select the exact frontend revision together with the compatible backend and service releases. Follow the infrastructure repository's [release and recovery procedure](../../infrastructure/docs/COMPLIANCE-RELEASE.md) and record the selected configuration, source revision, build and Pages deployment ID in the release record.

A push to a configured Cloudflare Pages deployment branch can activate the frontend automatically. Verify the actual project and branch mapping before pushing. Admit the compatible backend and service interfaces first; keep public access controlled until the selected frontend and dashboard are ready.

## Source and production configuration

The source repository is `Bootstrap-Academy/frontend`; the separately configured production repository is `Bootstrap-Academy/frontend-prod`. Inspect their actual remote branches and deployment configuration for the release. Do not treat an old branch name, commit hash or previous merge result as the current production selection.

Preserve the intended `BASE_API_URL` and `BASE_WEB_URL` for the deployment environment when integrating source changes. Review configuration conflicts explicitly; do not restore removed integrations or historical configuration keys. Use the release's pinned dependencies and normal build checks, and verify the resulting API/web destinations before activation.

## Static asset errors

Nuxt builds assets under the permanent `app.buildAssetsDir` path `/_assets/`. This replaces `/_nuxt/` so old cached SPA responses cannot break new bundle imports. Both Test and the production frontend use this setting when built from this source; do not override it per environment.

Keep `public/_assets/404.html` and `public/_nuxt/404.html` in the generated bundle. Cloudflare Pages uses the directory's [nearest 404 page](https://developers.cloudflare.com/pages/configuration/serving-pages/#not-found-behavior) for missing files. Native 404 responses use `Cache-Control: no-store`, including when the Cloudflare build generates immutable cache rules for existing assets. `build.sh` removes only the root `404.html`, preserving Pages' single-page application routing for course URLs and other client routes.

After deployment, check existing JavaScript and CSS content types, missing files under both asset paths returning 404 with `no-store`, and a direct client route loading the app. Repeat asset checks with the browser's `Origin` header and play a lesson in a real browser. Asset scanners must check status and content type: the Monaco configuration key `editor.experimental.preferTreeSitter.css` is not a stylesheet URL. Changing the path bypasses old cache entries; it does not purge them.

## Verification and recovery

Record the actual deployed revision and Pages deployment ID, then check the compatible login, purchase, retained-rights and original-document paths. Keep existing saved operation identities and uncertain outcomes intact. Do not restore an older frontend that discards unresolved order IDs or offers replacement purchases; retain the compatible recovery UI or close the affected checkout while investigating.

Repository references and a successful build do not establish that the expected deployment is serving users. Verify the actual deployment separately. This document describes the procedure; each release requires its own selected revisions and operating decision.
