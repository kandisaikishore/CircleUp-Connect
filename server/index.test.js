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
  await waitForServer(baseUrl + '/api/health');
}, 10_000);

afterAll(() => {
  if (child && child.exitCode === null) child.kill('SIGTERM');
});

describe('CircleUp API configuration smoke tests', () => {
  it('reports degraded health and names missing production secrets', async () => {
    const response = await fetch(baseUrl + '/api/health');
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.missingConfiguration).toContain('DATABASE_URL');
    expect(body.missingConfiguration).toContain('GEMINI_API_KEY or OPENAI_API_KEY');
  });


  it('allows the configured Vite origin through a CORS preflight', async () => {
    const response = await fetch(baseUrl + '/api/posts', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    expect(response.headers.get('access-control-allow-methods')).toMatch(/POST/);
  });

  it('returns a clear service-unavailable response when the database is absent', async () => {
    const response = await fetch(baseUrl + '/api/posts');
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/DATABASE_URL/);
  });

  it('does not pretend that the LLM works without a provider key', async () => {
    const response = await fetch(baseUrl + '/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello CircleUp AI' })
    });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/GEMINI_API_KEY/);
  });

  it('rejects unknown routes with JSON 404 responses', async () => {
    const response = await fetch(baseUrl + '/api/this-route-does-not-exist');
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('Route not found.');
  });
});
