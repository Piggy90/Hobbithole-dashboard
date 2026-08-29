/**
 * Optional authentication for Hobbithole config-api (product feature).
 *
 * Enable paths (zero-config friendly):
 *   1) Compose/env: AUTH_ENABLED=true  (+ optional SESSION_SECRET)
 *   2) UI / API:    data/auth/settings.json { "enabled": true }
 *      + auto-generated data/auth/session.secret if SESSION_SECRET unset
 *
 * AUTH_ENABLED=false forces off (ignores file). Unset = file controls (default off).
 * Storage: users.json, sessions.json, settings.json, session.secret — no native deps.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.AUTH_DATA_DIR || path.join(process.env.DATA_DIR || '/app/data', 'auth');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const SECRET_PATH = path.join(DATA_DIR, 'session.secret');
const COOKIE_NAME = 'hh_session';
const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 20;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const envFlag = (name) => /^(1|true|yes|on)$/i.test(String(process.env[name] || '').trim());
const envFlagFalse = (name) => /^(0|false|no|off)$/i.test(String(process.env[name] || '').trim());

function loadSettings() {
  return readJson(SETTINGS_PATH, { enabled: false });
}

function saveSettings(settings) {
  writeJson(SETTINGS_PATH, {
    enabled: Boolean(settings.enabled),
    updatedAt: new Date().toISOString(),
  });
}

/** env | file | off — who decides auth is on */
function authSource() {
  if (envFlagFalse('AUTH_ENABLED')) return 'off';
  if (envFlag('AUTH_ENABLED')) return 'env';
  if (loadSettings().enabled) return 'file';
  return 'off';
}

function canToggleViaUi() {
  // Compose lock: explicit true or false means UI cannot change policy
  if (envFlag('AUTH_ENABLED') || envFlagFalse('AUTH_ENABLED')) return false;
  return true;
}

function ensureSessionSecret() {
  const fromEnv = String(process.env.SESSION_SECRET || '').trim();
  if (fromEnv.length >= 16) return fromEnv;
  ensureDir();
  try {
    if (fs.existsSync(SECRET_PATH)) {
      const s = fs.readFileSync(SECRET_PATH, 'utf8').trim();
      if (s.length >= 16) return s;
    }
  } catch (_) { /* ignore */ }
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(SECRET_PATH, generated + '\n', { mode: 0o600 });
  } catch (e) {
    console.error('[auth] cannot write session.secret:', e.message);
  }
  return generated;
}

function sessionSecret() {
  return ensureSessionSecret();
}

function authEnabled() {
  const src = authSource();
  if (src === 'off') return false;
  const secret = sessionSecret();
  if (secret.length < 16) {
    if (!authEnabled._warned) {
      console.error('[auth] auth requested but no usable SESSION_SECRET — auth disabled');
      authEnabled._warned = true;
    }
    return false;
  }
  return true;
}

function setAuthEnabledFile(enabled) {
  if (!canToggleViaUi()) {
    const err = new Error('auth_locked_by_env');
    err.code = 'auth_locked_by_env';
    throw err;
  }
  ensureSessionSecret();
  saveSettings({ enabled: Boolean(enabled) });
  return authEnabled();
}

function publicUrl() {
  return String(process.env.AUTH_PUBLIC_URL || process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
}

/**
 * Secure cookie flag.
 * - AUTH_COOKIE_SECURE=true|false forces
 * - auto (default): Secure only when THIS request is HTTPS
 *   (x-forwarded-proto / req.secure). Never use AUTH_PUBLIC_URL alone —
 *   that broke LAN login over http:// while PUBLIC_URL was https://.
 */
function cookieSecure(req) {
  const v = String(process.env.AUTH_COOKIE_SECURE || 'auto').toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  if (!req) return false;
  const xf = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  if (xf === 'https') return true;
  if (xf === 'http') return false;
  if (req.secure) return true;
  return false;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDir();
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function loadUsers() {
  const data = readJson(USERS_PATH, { users: [] });
  if (!Array.isArray(data.users)) data.users = [];
  return data;
}

function saveUsers(data) {
  writeJson(USERS_PATH, data);
}

const MIN_PASSWORD_LEN = 8;

function setPasswordForUserId(userId, newPassword) {
  if (!newPassword || String(newPassword).length < MIN_PASSWORD_LEN) {
    const err = new Error('invalid_credentials');
    err.code = 'invalid_credentials';
    throw err;
  }
  const data = loadUsers();
  const u = data.users.find((x) => x.id === userId && !x.disabled);
  if (!u) {
    const err = new Error('not_found');
    err.code = 'not_found';
    throw err;
  }
  u.passwordHash = hashPassword(newPassword);
  u.passwordChangedAt = new Date().toISOString();
  saveUsers(data);
  return u;
}

function destroySessionsForUser(userId, { exceptId } = {}) {
  const store = loadSessions();
  let n = 0;
  for (const [id, s] of Object.entries(store.sessions)) {
    if (s && s.userId === userId && id !== exceptId) {
      delete store.sessions[id];
      n += 1;
    }
  }
  if (n) saveSessions(store);
  return n;
}

function loadSessions() {
  const data = readJson(SESSIONS_PATH, { sessions: {} });
  if (!data.sessions || typeof data.sessions !== 'object') data.sessions = {};
  return data;
}

function saveSessions(data) {
  writeJson(SESSIONS_PATH, data);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password, saltBuf) {
  const salt = saltBuf || crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  try {
    const salt = Buffer.from(parts[1], 'base64');
    const expected = Buffer.from(parts[2], 'base64');
    const hash = crypto.scryptSync(String(password), salt, expected.length, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName || u.email,
    role: u.role || 'user',
  };
}

function findUserByEmail(email) {
  const e = normalizeEmail(email);
  return loadUsers().users.find((u) => u.email === e && !u.disabled) || null;
}

function findUserById(id) {
  return loadUsers().users.find((u) => u.id === id && !u.disabled) || null;
}

function userCount() {
  return loadUsers().users.filter((u) => !u.disabled).length;
}

function createUser({ email, password, displayName, role }) {
  const data = loadUsers();
  const e = normalizeEmail(email);
  if (!e || !password || String(password).length < 8) {
    const err = new Error('invalid_credentials');
    err.code = 'invalid_credentials';
    throw err;
  }
  if (data.users.some((u) => u.email === e)) {
    const err = new Error('email_exists');
    err.code = 'email_exists';
    throw err;
  }
  const user = {
    id: crypto.randomUUID(),
    email: e,
    displayName: (displayName && String(displayName).trim()) || e.split('@')[0],
    role: role === 'admin' ? 'admin' : data.users.length === 0 ? 'admin' : 'user',
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    disabled: false,
  };
  // first user always admin
  if (data.users.length === 0) user.role = 'admin';
  data.users.push(user);
  saveUsers(data);
  return user;
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i === -1) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function purgeExpiredSessions(store) {
  const now = Date.now();
  let changed = false;
  for (const [id, s] of Object.entries(store.sessions)) {
    if (!s || !s.expiresAt || s.expiresAt < now) {
      delete store.sessions[id];
      changed = true;
    }
  }
  return changed;
}

function createSession(userId) {
  const store = loadSessions();
  purgeExpiredSessions(store);
  const id = crypto.randomBytes(32).toString('hex');
  store.sessions[id] = {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MS,
  };
  saveSessions(store);
  return id;
}

function destroySession(sessionId) {
  if (!sessionId) return;
  const store = loadSessions();
  if (store.sessions[sessionId]) {
    delete store.sessions[sessionId];
    saveSessions(store);
  }
}

function getSessionUser(req, res) {
  if (!authEnabled()) return null;
  const cookies = parseCookies(req);
  const sid = cookies[COOKIE_NAME];
  if (!sid) return null;
  const store = loadSessions();
  if (purgeExpiredSessions(store)) saveSessions(store);
  const sess = store.sessions[sid];
  if (!sess || sess.expiresAt < Date.now()) return null;
  // sliding expiry — also refresh the browser cookie (Max-Age is otherwise stuck at login)
  sess.expiresAt = Date.now() + SESSION_MS;
  store.sessions[sid] = sess;
  saveSessions(store);
  if (res) setSessionCookie(res, sid, req);
  const user = findUserById(sess.userId);
  if (!user) return null;
  return { sessionId: sid, user };
}

function setSessionCookie(res, sessionId, req) {
  const maxAge = Math.floor(SESSION_MS / 1000);
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (cookieSecure(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res, req) {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (cookieSecure(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// simple IP rate limit for login/setup
const attemptBuckets = new Map();

function rateLimitOk(key) {
  const now = Date.now();
  let b = attemptBuckets.get(key);
  if (!b || now - b.start > LOGIN_WINDOW_MS) {
    b = { start: now, count: 0 };
    attemptBuckets.set(key, b);
  }
  b.count += 1;
  return b.count <= MAX_LOGIN_ATTEMPTS;
}

function clientKey(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

function statusPayload(req, res) {
  const enabled = authEnabled();
  const source = authSource();
  const providers = {
    password: true,
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoft: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    passkey: false,
  };
  if (!enabled) {
    return {
      enabled: false,
      authenticated: true,
      setupRequired: false,
      user: null,
      source,
      canToggle: canToggleViaUi(),
      hasUsers: userCount() > 0,
      providers,
    };
  }
  const sess = getSessionUser(req, res);
  const setupRequired = userCount() === 0;
  return {
    enabled: true,
    authenticated: Boolean(sess),
    setupRequired,
    user: sess ? publicUser(sess.user) : null,
    source,
    canToggle: canToggleViaUi(),
    hasUsers: userCount() > 0,
    providers,
  };
}

/**
 * Express middleware: 401 when auth on and no valid session.
 * Skips /api/health and /api/auth/*
 */
function requireAuth(req, res, next) {
  if (!authEnabled()) return next();
  const p = req.path || '';
  if (p === '/api/health' || p === '/health') return next();
  if (p.startsWith('/api/auth/')) return next();
  const sess = getSessionUser(req, res);
  if (!sess) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
  }
  req.user = publicUser(sess.user);
  req.sessionId = sess.sessionId;
  return next();
}

function requireAdmin(req, res, next) {
  if (!authEnabled()) return next();
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Admin only' });
  }
  return next();
}

function mountRoutes(app) {
  // Always register routes so frontend can probe status; handlers no-op appropriately.

  app.get('/api/auth/status', (req, res) => {
    res.json(statusPayload(req, res));
  });

  app.post('/api/auth/setup', (req, res) => {
    if (!authEnabled()) {
      return res.status(400).json({ error: 'auth_disabled' });
    }
    if (userCount() > 0) {
      return res.status(409).json({ error: 'already_initialized' });
    }
    if (!rateLimitOk(`setup:${clientKey(req)}`)) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    const { email, password, displayName } = req.body || {};
    try {
      const user = createUser({ email, password, displayName, role: 'admin' });
      const sid = createSession(user.id);
      setSessionCookie(res, sid, req);
      res.json({ status: 'ok', user: publicUser(user) });
    } catch (e) {
      const code = e.code || 'setup_failed';
      res.status(400).json({ error: code, message: e.message });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    if (!authEnabled()) {
      return res.status(400).json({ error: 'auth_disabled' });
    }
    if (!rateLimitOk(`login:${clientKey(req)}`)) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    const { email, password } = req.body || {};
    const user = findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    const sid = createSession(user.id);
    setSessionCookie(res, sid, req);
    res.json({ status: 'ok', user: publicUser(user) });
  });

  /**
   * Change own password (logged-in). Other sessions for this user are dropped.
   * There is no unauthenticated email-reset: the email is a login name, not a mailbox we send to.
   * Locked-out break-glass: `node auth.js passwd --email you@x.com` on the host.
   */
  app.post('/api/auth/password', (req, res) => {
    if (!authEnabled()) {
      return res.status(400).json({ error: 'auth_disabled' });
    }
    if (!rateLimitOk(`passwd:${clientKey(req)}`)) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    const sess = getSessionUser(req);
    if (!sess) return res.status(401).json({ error: 'unauthorized' });
    const { currentPassword, newPassword } = req.body || {};
    if (!verifyPassword(currentPassword, sess.user.passwordHash)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    if (!newPassword || String(newPassword).length < MIN_PASSWORD_LEN) {
      return res.status(400).json({
        error: 'invalid_credentials',
        message: `Password must be at least ${MIN_PASSWORD_LEN} characters`,
      });
    }
    if (String(currentPassword) === String(newPassword)) {
      return res.status(400).json({ error: 'same_password' });
    }
    try {
      setPasswordForUserId(sess.user.id, newPassword);
      destroySessionsForUser(sess.user.id, { exceptId: sess.sessionId });
      setSessionCookie(res, sess.sessionId, req);
      return res.json({ status: 'ok' });
    } catch (e) {
      return res.status(400).json({ error: e.code || 'password_failed', message: e.message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const sess = getSessionUser(req);
    if (sess) destroySession(sess.sessionId);
    clearSessionCookie(res, req);
    res.json({ status: 'ok' });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!authEnabled()) {
      return res.json({ enabled: false, user: null });
    }
    const sess = getSessionUser(req);
    if (!sess) return res.status(401).json({ error: 'unauthorized' });
    res.json({ enabled: true, user: publicUser(sess.user) });
  });

  // Admin: list / create users (fase 1 minimal)
  app.get('/api/auth/users', (req, res, next) => {
    if (!authEnabled()) return res.status(400).json({ error: 'auth_disabled' });
    const sess = getSessionUser(req);
    if (!sess) return res.status(401).json({ error: 'unauthorized' });
    if (sess.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    const users = loadUsers().users.map(publicUser);
    res.json({ users });
  });

  app.post('/api/auth/users', (req, res) => {
    if (!authEnabled()) return res.status(400).json({ error: 'auth_disabled' });
    const sess = getSessionUser(req);
    if (!sess) return res.status(401).json({ error: 'unauthorized' });
    if (sess.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    const { email, password, displayName, role } = req.body || {};
    try {
      const user = createUser({
        email,
        password,
        displayName,
        role: role === 'admin' ? 'admin' : 'user',
      });
      res.status(201).json({ user: publicUser(user) });
    } catch (e) {
      res.status(400).json({ error: e.code || 'create_failed', message: e.message });
    }
  });

  /**
   * Zero-config enable: no compose edit required.
   * - No users yet: body { email, password, displayName? } creates admin + enables
   * - Users exist: body { email, password } must match an existing user, then enables
   * Locked when AUTH_ENABLED is set in environment.
   */
  app.post('/api/auth/enable', (req, res) => {
    if (!canToggleViaUi()) {
      return res.status(403).json({
        error: 'auth_locked_by_env',
        message: 'Auth is controlled by AUTH_ENABLED in the environment (compose).',
      });
    }
    if (!rateLimitOk(`enable:${clientKey(req)}`)) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    const { email, password, displayName } = req.body || {};
    try {
      ensureSessionSecret();
      if (userCount() === 0) {
        if (!email || !password) {
          return res.status(400).json({ error: 'invalid_credentials', message: 'Email and password required' });
        }
        setAuthEnabledFile(true);
        const user = createUser({ email, password, displayName, role: 'admin' });
        const sid = createSession(user.id);
        setSessionCookie(res, sid, req);
        return res.json({ status: 'ok', enabled: true, user: publicUser(user), setup: true });
      }
      // re-enable: prove identity
      const user = findUserByEmail(email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'invalid_credentials' });
      }
      setAuthEnabledFile(true);
      const sid = createSession(user.id);
      setSessionCookie(res, sid, req);
      return res.json({ status: 'ok', enabled: true, user: publicUser(user), setup: false });
    } catch (e) {
      return res.status(400).json({ error: e.code || 'enable_failed', message: e.message });
    }
  });

  /** Disable auth (file mode only). Requires admin session while auth is on. */
  app.post('/api/auth/disable', (req, res) => {
    if (!canToggleViaUi()) {
      return res.status(403).json({
        error: 'auth_locked_by_env',
        message: 'Auth is controlled by AUTH_ENABLED in the environment (compose).',
      });
    }
    if (!authEnabled()) {
      return res.json({ status: 'ok', enabled: false });
    }
    const sess = getSessionUser(req);
    if (!sess) return res.status(401).json({ error: 'unauthorized' });
    if (sess.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    try {
      setAuthEnabledFile(false);
      destroySession(sess.sessionId);
      clearSessionCookie(res, req);
      return res.json({ status: 'ok', enabled: false });
    } catch (e) {
      return res.status(400).json({ error: e.code || 'disable_failed', message: e.message });
    }
  });
}

/** Optional env bootstrap when DB empty (container start). */
function tryEnvBootstrap() {
  if (!authEnabled()) return;
  if (userCount() > 0) return;
  const email = process.env.AUTH_BOOTSTRAP_EMAIL;
  const password = process.env.AUTH_BOOTSTRAP_PASSWORD;
  if (!email || !password) return;
  try {
    createUser({
      email,
      password,
      displayName: process.env.AUTH_BOOTSTRAP_NAME || 'Admin',
      role: 'admin',
    });
    console.log(`[auth] bootstrapped admin from env: ${normalizeEmail(email)}`);
  } catch (e) {
    console.error('[auth] bootstrap failed:', e.message);
  }
}

function parsePasswdArgs(argv) {
  const out = { email: null, password: null, help: false };
  const args = argv.slice(3);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--email' || a === '-e') out.email = args[++i];
    else if (a && a.startsWith('--email=')) out.email = a.slice(8);
    else if (a === '--password' || a === '-p') out.password = args[++i];
    else if (a && a.startsWith('--password=')) out.password = a.slice(11);
  }
  return out;
}

function readLineFromStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => resolve(chunks.join('').replace(/\r?\n$/, '').trim()));
  });
}

async function runPasswdCli() {
  const opts = parsePasswdArgs(process.argv);
  if (opts.help) {
    process.stdout.write(
      'Usage: node auth.js passwd [--email ADDR] [--password NEW]\n' +
        '  Locked-out break-glass (host / docker exec). No email is sent.\n' +
        '  Password: --password, AUTH_NEW_PASSWORD, or one line on stdin.\n' +
        '  --email can be omitted when there is only one user.\n'
    );
    return;
  }
  const users = loadUsers().users.filter((u) => u && !u.disabled);
  if (!users.length) {
    console.error('No users in data/auth/users.json');
    process.exitCode = 1;
    return;
  }
  const user = opts.email
    ? users.find((u) => u.email === normalizeEmail(opts.email))
    : (users.length === 1 ? users[0] : null);
  if (!user) {
    console.error(opts.email
      ? `No user for ${opts.email}`
      : 'Multiple users — pass --email');
    process.exitCode = 1;
    return;
  }
  let password = opts.password || process.env.AUTH_NEW_PASSWORD || '';
  if (!password) {
    if (process.stdin.isTTY) {
      process.stderr.write(`New password for ${user.email} (min ${MIN_PASSWORD_LEN}): `);
    }
    password = await readLineFromStdin();
  }
  if (!password || String(password).length < MIN_PASSWORD_LEN) {
    console.error(`Password must be at least ${MIN_PASSWORD_LEN} characters`);
    process.exitCode = 1;
    return;
  }
  setPasswordForUserId(user.id, password);
  const n = destroySessionsForUser(user.id);
  console.log(`Password updated for ${user.email} (${n} other session(s) dropped).`);
}

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'passwd' || cmd === 'password') {
    runPasswdCli().catch((e) => {
      console.error(e && e.message ? e.message : e);
      process.exit(1);
    });
  } else {
    console.error('Usage: node auth.js passwd [--email ADDR] [--password NEW]');
    process.exit(2);
  }
}

module.exports = {
  authEnabled,
  authSource,
  canToggleViaUi,
  requireAuth,
  requireAdmin,
  mountRoutes,
  tryEnvBootstrap,
  getSessionUser,
  publicUser,
  statusPayload,
  setAuthEnabledFile,
  createUser,
  setPasswordForUserId,
  verifyPassword,
  hashPassword,
  findUserByEmail,
};
