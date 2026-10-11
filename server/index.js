import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { Server as SocketServer } from 'socket.io';

const { Pool } = pg;
const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*', methods: ['GET', 'POST'] }
});
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) : null;
const PORT = Number(process.env.PORT || 10000);
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CLIENT_ORIGIN ? CLIENT_ORIGIN.split(',').map(x => x.trim()) : true }));
app.use(express.json({ limit: '32kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));
// LLM calls can incur provider costs; keep a stricter per-IP limit on AI requests.
app.use('/api/ai', rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const requireDb = (req, res, next) => {
  if (!pool) return res.status(503).json({ error: 'Database is not configured. Set DATABASE_URL.' });
  next();
};
const requireAuth = (req, res, next) => {
  if (!JWT_SECRET) return res.status(503).json({ error: 'Authentication is not configured. Set JWT_SECRET.' });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Session expired. Please sign in again.' }); }
};

async function initializeDatabase() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY, name VARCHAR(80) NOT NULL,
      email VARCHAR(254) UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      interests TEXT[] NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS posts (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body VARCHAR(500) NOT NULL CHECK (length(trim(body)) > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS post_likes (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (user_id, post_id)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id BIGSERIAL PRIMARY KEY, post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body VARCHAR(1000) NOT NULL CHECK (length(trim(body)) > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS communities (
      id BIGSERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS community_members (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (user_id, community_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY, sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body VARCHAR(2000) NOT NULL CHECK (length(trim(body)) > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id, created_at);
    CREATE INDEX IF NOT EXISTS messages_pair_idx ON messages(sender_id, recipient_id, created_at);
  `);
  await pool.query(`INSERT INTO communities(name, description) VALUES
    ('AI Builders', 'Share experiments, ship projects, and learn AI together.'),
    ('Frontend Friends', 'React, CSS, design systems, and all things frontend.'),
    ('Build In Public', 'Show your progress, get feedback, and celebrate small wins.'),
    ('Creative Corner', 'A friendly home for designers, makers, and curious minds.')
    ON CONFLICT(name) DO NOTHING`);
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  let database = 'not_configured';
  if (pool) { await pool.query('SELECT 1'); database = 'connected'; }
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  const configured = database === 'connected' && aiConfigured;
  res.status(database === 'connected' ? 200 : 503).json({
    status: configured ? 'ok' : 'degraded',
    service: 'circleup-connect-api', database, aiConfigured,
    missingConfiguration: [!pool && 'DATABASE_URL', !aiConfigured && 'OPENAI_API_KEY'].filter(Boolean),
    timestamp: new Date().toISOString()
  });
}));

app.post('/api/auth/register', requireDb, (req, res, next) => JWT_SECRET ? next() : res.status(503).json({ error: 'Authentication is not configured. Set JWT_SECRET.' }), asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Name must be 2–80 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 10 || password.length > 128) return res.status(400).json({ error: 'Password must be 10–128 characters.' });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email,interests,created_at', [name, email, passwordHash]);
    const user = rows[0];
    const token = jwt.sign({ sub: String(user.id), email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
    throw e;
  }
}));

app.post('/api/auth/login', requireDb, (req, res, next) => JWT_SECRET ? next() : res.status(503).json({ error: 'Authentication is not configured. Set JWT_SECRET.' }), asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const { rows } = await pool.query('SELECT id,name,email,password_hash,interests FROM users WHERE email=$1', [email]);
  if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const user = rows[0]; delete user.password_hash;
  const token = jwt.sign({ sub: String(user.id), email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user, token });
}));

app.get('/api/auth/me', requireAuth, requireDb, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT id,name,email,interests,created_at FROM users WHERE id=$1', [req.user.sub]);
  if (!rows[0]) return res.status(404).json({ error: 'Account not found.' });
  res.json({ user: rows[0] });
}));

app.get('/api/posts', requireDb, asyncRoute(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const { rows } = await pool.query(`
    SELECT p.id,p.body,p.created_at,u.id AS user_id,u.name,u.email,
      COUNT(DISTINCT l.user_id)::int AS likes, COUNT(DISTINCT c.id)::int AS comments
    FROM posts p JOIN users u ON u.id=p.user_id
    LEFT JOIN post_likes l ON l.post_id=p.id LEFT JOIN comments c ON c.post_id=p.id
    GROUP BY p.id,u.id ORDER BY p.created_at DESC LIMIT $1`, [limit]);
  res.json({ posts: rows });
}));

app.post('/api/posts', requireAuth, requireDb, asyncRoute(async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body || body.length > 500) return res.status(400).json({ error: 'Post must contain 1–500 characters.' });
  const { rows } = await pool.query('INSERT INTO posts(user_id,body) VALUES($1,$2) RETURNING id,body,created_at', [req.user.sub, body]);
  res.status(201).json({ post: rows[0] });
}));

app.post('/api/posts/:id/like', requireAuth, requireDb, asyncRoute(async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isSafeInteger(postId) || postId < 1) return res.status(400).json({ error: 'Invalid post ID.' });
  const exists = await pool.query('SELECT id FROM posts WHERE id=$1', [postId]);
  if (!exists.rowCount) return res.status(404).json({ error: 'Post not found.' });
  const existing = await pool.query('SELECT 1 FROM post_likes WHERE user_id=$1 AND post_id=$2', [req.user.sub, postId]);
  if (existing.rowCount) await pool.query('DELETE FROM post_likes WHERE user_id=$1 AND post_id=$2', [req.user.sub, postId]);
  else await pool.query('INSERT INTO post_likes(user_id,post_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [req.user.sub, postId]);
  res.json({ liked: !existing.rowCount });
}));

app.get('/api/posts/:id/comments', requireDb, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT c.id,c.body,c.created_at,u.id AS user_id,u.name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created_at ASC', [req.params.id]);
  res.json({ comments: rows });
}));
app.post('/api/posts/:id/comments', requireAuth, requireDb, asyncRoute(async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body || body.length > 1000) return res.status(400).json({ error: 'Comment must contain 1–1000 characters.' });
  const { rows } = await pool.query('INSERT INTO comments(post_id,user_id,body) SELECT p.id,$2,$3 FROM posts p WHERE p.id=$1 RETURNING id,post_id,body,created_at', [req.params.id, req.user.sub, body]);
  if (!rows[0]) return res.status(404).json({ error: 'Post not found.' });
  res.status(201).json({ comment: rows[0] });
}));

app.get('/api/communities', requireDb, asyncRoute(async (_req, res) => {
  const { rows } = await pool.query('SELECT c.id,c.name,c.description,COUNT(cm.user_id)::int AS members FROM communities c LEFT JOIN community_members cm ON cm.community_id=c.id GROUP BY c.id ORDER BY c.name');
  res.json({ communities: rows });
}));
app.post('/api/communities/:id/join', requireAuth, requireDb, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('INSERT INTO community_members(user_id,community_id) SELECT $1,id FROM communities WHERE id=$2 ON CONFLICT DO NOTHING RETURNING community_id', [req.user.sub, req.params.id]);
  if (!rows[0]) {
    const exists = await pool.query('SELECT id FROM communities WHERE id=$1', [req.params.id]);
    if (!exists.rowCount) return res.status(404).json({ error: 'Community not found.' });
    await pool.query('DELETE FROM community_members WHERE user_id=$1 AND community_id=$2', [req.user.sub, req.params.id]);
    return res.json({ joined: false });
  }
  res.json({ joined: true });
}));

app.get('/api/messages/:userId', requireAuth, requireDb, asyncRoute(async (req, res) => {
  const otherId = Number(req.params.userId);
  if (!Number.isSafeInteger(otherId) || otherId < 1) return res.status(400).json({ error: 'Invalid recipient.' });
  const { rows } = await pool.query(`
    SELECT id,sender_id,recipient_id,body,created_at FROM messages
    WHERE (sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1)
    ORDER BY created_at ASC LIMIT 200`, [req.user.sub, otherId]);
  res.json({ messages: rows });
}));
app.post('/api/messages/:userId', requireAuth, requireDb, asyncRoute(async (req, res) => {
  const recipientId = Number(req.params.userId);
  const body = String(req.body.body || '').trim();
  if (!Number.isSafeInteger(recipientId) || recipientId < 1 || !body || body.length > 2000) return res.status(400).json({ error: 'Provide a valid recipient and a message of 1–2000 characters.' });
  const { rows } = await pool.query('INSERT INTO messages(sender_id,recipient_id,body) SELECT $1,id,$3 FROM users WHERE id=$2 RETURNING id,sender_id,recipient_id,body,created_at', [req.user.sub, recipientId, body]);
  if (!rows[0]) return res.status(404).json({ error: 'Recipient not found.' });
  io.to('user:' + recipientId).emit('message:new', rows[0]);
  res.status(201).json({ message: rows[0] });
}));

app.post('/api/ai/chat', asyncRoute(async (req, res) => {
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI is not configured yet. Add GEMINI_API_KEY to the Render API service environment.' });
  const message = String(req.body.message || '').trim();
  const history = Array.isArray(req.body.history) ? req.body.history.slice(-8) : [];
  if (!message || message.length > 4000) return res.status(400).json({ error: 'Message must contain 1–4000 characters.' });
  const systemInstruction = 'You are CircleUp AI, a helpful, safe community assistant. Help users discover communities, improve posts, learn software development, brainstorm projects, and connect respectfully. Never claim to perform actions in CircleUp. Be concise and useful.';
  const historyMessages = history.filter(m => ['user','assistant'].includes(m?.role) && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    if (process.env.GEMINI_API_KEY) {
      const contents = [
        { role: 'user', parts: [{ text: systemInstruction }] },
        { role: 'model', parts: [{ text: 'Understood. I am CircleUp AI and will follow those instructions.' }] },
        ...historyMessages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: message }] }
      ];
      const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 700 } })
      });
      const payload = await response.json();
      if (!response.ok) return res.status(response.status === 429 ? 429 : 502).json({ error: payload.error?.message || 'Gemini provider request failed.' });
      const answer = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
      return res.json({ answer: answer || 'I could not generate a response just now.', model });
    }
    const messages = [
      { role: 'system', content: systemInstruction },
      ...historyMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages, temperature: 0.7, max_tokens: 700 })
    });
    const payload = await response.json();
    if (!response.ok) return res.status(response.status === 429 ? 429 : 502).json({ error: payload.error?.message || 'AI provider request failed.' });
    res.json({ answer: payload.choices?.[0]?.message?.content || 'I could not generate a response just now.', model: payload.model });
  } finally { clearTimeout(timeout); }
}));

io.use((socket, next) => {
  if (!JWT_SECRET) return next(new Error('Authentication is not configured.'));
  try { socket.user = jwt.verify(socket.handshake.auth?.token || '', JWT_SECRET); next(); }
  catch { next(new Error('Unauthorized')); }
});
io.on('connection', socket => {
  socket.join('user:' + socket.user.sub);
});

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((err, _req, res, _next) => {
  console.error('API error:', err.message);
  if (err.name === 'AbortError') return res.status(504).json({ error: 'AI request timed out. Please retry.' });
  res.status(500).json({ error: 'Unexpected server error.' });
});

initializeDatabase().then(() => {
  server.listen(PORT, '0.0.0.0', () => console.log('CircleUp Connect API listening on ' + PORT));
}).catch(err => {
  console.error('Database initialization failed:', err.message);
  process.exit(1);
});
