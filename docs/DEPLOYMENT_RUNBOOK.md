# Frontend deployment and recovery

Select the exact frontend revision together with the compatible backend and service releases. Follow the infrastructure repository's [release and recovery procedure](../../infrastructure/docs/COMPLIANCE-RELEASE.md) and record the selected configuration, source revision, build and Pages deployment ID in the release record.

A push to a configured Cloudflare Pages deployment branch can activate the frontend automatically. Verify the actual project and branch mapping before pushing. Admit the compatible backend and service interfaces first; keep public access controlled until the selected frontend and dashboard are ready.

## Source and production configuration

The source repository is `Bootstrap-Academy/frontend`; the separately configured production repository is `Bootstrap-Academy/frontend-prod`. Inspect their actual remote branches and deployment configuration for the release. Do not treat an old branch name, commit hash or previous merge result as the current production selection.

Preserve the intended `BASE_API_URL` and `BASE_WEB_URL` for the deployment environment when integrating source changes. Review configuration conflicts explicitly; do not restore removed integrations or historical configuration keys. Use the release's pinned dependencies and normal build checks, and verify the resulting API/web destinations before activation.

## Static asset errors

Keep `public/_nuxt/404.html` in the generated bundle. Cloudflare Pages uses this directory's [nearest 404 page](https://developers.cloudflare.com/pages/configuration/serving-pages/#not-found-behavior) for missing JavaScript, CSS and other files under `/_nuxt/`. Existing assets are served normally. `build.sh` removes only the root `404.html`, preserving Pages' single-page application routing for course URLs and other client routes.

After deployment, verify that an existing JavaScript and CSS file return their expected content types, missing files under `/_nuxt/` return 404, and a direct visit to a client route still loads the app. Asset scanners must check response status and content type: a Monaco configuration key such as `editor.experimental.preferTreeSitter.css` is not a stylesheet URL.

## Verification and recovery

Record the actual deployed revision and Pages deployment ID, then check the compatible login, purchase, retained-rights and original-document paths. Keep existing saved operation identities and uncertain outcomes intact. Do not restore an older frontend that discards unresolved order IDs or offers replacement purchases; retain the compatible recovery UI or close the affected checkout while investigating.

Repository references and a successful build do not establish that the expected deployment is serving users. Verify the actual deployment separately. This document describes the procedure; each release requires its own selected revisions and operating decision.
