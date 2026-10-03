# Bootstrap Academy Frontend

The official frontend of [Bootstrap Academy](https://bootstrap.academy/).

If you would like to submit a bug report or feature request, or are looking for general information about the project or the publicly available instances, please refer to the [Bootstrap-Academy repository](https://github.com/Bootstrap-Academy/Bootstrap-Academy).

## Development Setup

1. Clone this repository and `cd` into it.
2. Install the exact [Node.js](https://nodejs.org/) version in [`.node-version`](.node-version). With nvm, run `nvm install "$(cat .node-version)"` and `nvm use "$(cat .node-version)"`.
3. Run `npm ci` to install the locked dependencies.
4. Run `npm run dev` to start a development server listening on http://localhost:3000/.

`.node-version` is the shared version pin for local work, GitHub Actions and Cloudflare Pages. Installation, development and build commands check it automatically; `npm run check:node` checks the current shell. The Nix/direnv environment selects the corresponding Node major and verifies the exact version. If its nixpkgs provides a different patch version, select the pinned Node version before running these commands.

## Code Quality

- Run `npm run format` to apply the enforced Prettier style (CI runs `npm run format:check`).
- Run `npm run lint` to ensure the code passes the ESLint rules.
- Run `node --test tests/*.test.mjs` for the behavior tests and `bash build.sh` for the deployment build, using the pinned Node version.

## Documentation

- [`docs/CONSUMER_UI.md`](docs/CONSUMER_UI.md): the terms gate, the order summary with the withdrawal declarations, and the permanent cancellation/withdrawal bar.
- [`docs/DEPLOYMENT_RUNBOOK.md`](docs/DEPLOYMENT_RUNBOOK.md): shipping `develop` to production.

## Note on Account Creation

You need to create separate accounts for test instances (localhost, [https://test.bootstrap.academy](https://test.bootstrap.academy), PullRequest-preview pages) and live instances ([https://bootstrap.academy](https://bootstrap.academy)). These are two separate database systems.
