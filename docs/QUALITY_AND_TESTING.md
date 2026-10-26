# Development, Testing, and Security Guide

CircleUp Connect is a community-oriented application. Treat the current source and package manifests as the authority for implemented features; do not assume that every planned social workflow is complete.

## Prerequisites and setup

Install a supported Node.js version and npm. From the repository root:

```bash
npm install
```

Create local environment configuration only for variables referenced by the current server or frontend. Never commit `.env` files, credentials, tokens, real user data, or production logs.

## Development commands

The current package scripts include:

```bash
npm run dev
npm run server
```

Use `npm run dev` for the Vite frontend and `npm run server` to start the Express server. Check `package.json` for the current port and environment requirements before running both services.

## Validation

Run the repository's declared test and build scripts:

```bash
npm test
npm run build
npm run test:e2e
```

The test command runs Vitest tests under `src` and `server`; the E2E command runs Playwright. If browser dependencies are missing, install the Playwright browser required by the project and record that limitation.

Prioritize tests for:
- Authentication and session expiry, if implemented
- Profile and group operations that exist in source
- Invalid, missing, and boundary input
- Unauthorized reads/writes and cross-user access
- Empty/loading/error states and repeated submissions
- Responsive layouts, keyboard navigation, and accessible labels

## Security and privacy expectations

- Enforce authorization in the server, not only in the UI.
- Validate request bodies and parameters on the server.
- Keep private messages, credentials, and personal information out of logs.
- Use safe password handling and session/token configuration already supported by the app.
- Configure CORS narrowly for the intended deployment.
- Do not claim a security control is present until its implementation and tests have been reviewed.

## Pull-request checklist

- [ ] Include reproduction steps for bug fixes.
- [ ] Add or update a focused regression test.
- [ ] Run `npm test`, `npm run build`, and relevant E2E tests.
- [ ] Report commands that could not be run.
- [ ] Avoid unrelated formatting or dependency changes.
- [ ] Do not claim unimplemented features or production readiness.
