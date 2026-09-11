# Frontend deployment and recovery

Select the exact frontend revision together with the compatible backend and service releases. Follow the infrastructure repository's [release and recovery procedure](../../infrastructure/docs/COMPLIANCE-RELEASE.md) and record the selected configuration, source revision, build and Pages deployment ID in the release record.

A push to a configured Cloudflare Pages deployment branch can activate the frontend automatically. Verify the actual project and branch mapping before pushing. Admit the compatible backend and service interfaces first; keep public access controlled until the selected frontend and dashboard are ready.

## Source and production configuration

The source repository is `Bootstrap-Academy/frontend`; the separately configured production repository is `Bootstrap-Academy/frontend-prod`. Inspect their actual remote branches and deployment configuration for the release. Do not treat an old branch name, commit hash or previous merge result as the current production selection.

Preserve the intended `BASE_API_URL` and `BASE_WEB_URL` for the deployment environment when integrating source changes. Review configuration conflicts explicitly; do not restore removed integrations or historical configuration keys. Use the release's pinned dependencies and normal build checks, and verify the resulting API/web destinations before activation.

## Verification and recovery

Record the actual deployed revision and Pages deployment ID, then check the compatible login, purchase, retained-rights and original-document paths. Keep existing saved operation identities and uncertain outcomes intact. Do not restore an older frontend that discards unresolved order IDs or offers replacement purchases; retain the compatible recovery UI or close the affected checkout while investigating.

Repository references and a successful build do not establish that the expected deployment is serving users. Verify the actual deployment separately. This document describes the procedure; each release requires its own selected revisions and operating decision.
