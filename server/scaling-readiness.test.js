import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

let child;
let baseUrl;

async function getFreePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error('API server exited before becoming ready.');
    try {
      const response = await fetch(url);
      if (response.status) return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
  throw new Error('API server did not start within the expected time.');
}

beforeAll(async () => {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      JWT_SECRET: 'ci-only-test-secret-do-not-use-in-production',
      DATABASE_URL: '',
      OPENAI_API_KEY: '',
      CLIENT_ORIGIN: 'http://localhost:5173',
      NODE_ENV: 'test'
    },
    stdio: 'ignore'
  });
  await waitForServer(baseUrl + '/api/health/live');
}, 10_000);

afterAll(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, 3000);
      child.once('exit', () => { clearTimeout(timeout); resolve(); });
    });
  }
});

describe('CircleUp health and readiness endpoints', () => {
  it('keeps liveness healthy when optional dependencies are not configured', async () => {
    const response = await fetch(baseUrl + '/api/health/live');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok', service: 'circleup-connect-api' });
  });

  it('does not mark the service ready when PostgreSQL is not configured', async () => {
    const response = await fetch(baseUrl + '/api/health/ready');
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: 'not_ready', database: 'not_configured' });
  });

  it('preserves the existing dependency-aware health contract', async () => {
    const response = await fetch(baseUrl + '/api/health');
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.missingConfiguration).toContain('DATABASE_URL');
    expect(body.missingConfiguration).toContain('GEMINI_API_KEY or OPENAI_API_KEY');
  });

  it('returns a clear service-unavailable response for database-backed routes without a database', async () => {
    const response = await fetch(baseUrl + '/api/posts');
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/DATABASE_URL/);
  });
});
