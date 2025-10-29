# Bootstrap Academy Frontend

The official frontend of [Bootstrap Academy](https://bootstrap.academy/).

If you would like to submit a bug report or feature request, or are looking for general information about the project or the publicly available instances, please refer to the [Bootstrap-Academy repository](https://github.com/Bootstrap-Academy/Bootstrap-Academy).

## Development Setup

1. Install [Node.js and npm](https://nodejs.org/)
2. Clone this repository and `cd` into it.
3. Run `npm install` to install the dependencies.
4. Run `npm run dev` to start a development server listening on http://localhost:3000/.

## Code Quality

- Run `npm run format` to apply the enforced Prettier style (CI runs `npm run format:check`).
- Run `npm run lint` to ensure the code passes the ESLint rules.

## Note on Account Creation

You need to create separate accounts for test instances (localhost, [https://test.bootstrap.academy](https://test.bootstrap.academy), PullRequest-preview pages) and live instances ([https://bootstrap.academy](https://bootstrap.academy)). These are two separate database systems.
