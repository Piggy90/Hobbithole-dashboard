const express = require('express');
const fs = require('fs');
const path = require('path');
const widgets = require('./widgets');
const p95stats = require('./widgets/p95stats');

const DATA_DIR = '/app/data';
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  weather: {
    enabled: false,
    lat: null,
    lon: null
  },
  appWidgets: {},
  // v1.6.1: cross-device sync for the dashboard's apps + pinned status
  categories: [],
  collapsedCategories: {},
  // v1.7.0: standalone widget blocks (clock, notes, calendar, etc.)
  // Foundation for the v2.0 customizable Home canvas.
  homeLayout: {
    blocks: []   // [{ id, type, config }]
  }
};

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

const app = express();
app.use(express.json({ limit: '64kb' }));

app.get('/api/config', (req, res) => {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'read_failed', message: err.message });
  }
});

app.post('/api/config', (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'invalid_body' });
  }
  // v1.9.10: refuse multi-MB data-URLs in config.json — use /api/wallpapers files instead.
  // Keeps config light and cross-device reliable (64kb JSON limit on this endpoint).
  try {
    const bad = findHeavyDataUrls(req.body);
    if (bad) {
      return res.status(413).json({
        error: 'payload_too_large',
        message: `Field "${bad}" contains a large data URL. Upload media via POST /api/wallpapers/:slot instead.`
      });
    }
  } catch (_) { /* non-fatal */ }
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'write_failed', message: err.message });
  }
});

/** Detect data:… base64 blobs that would bloat config.json (limit ~2KB inline). */
function findHeavyDataUrls(obj, prefix = '') {
  if (obj == null) return null;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:') && obj.length > 2048) return prefix || 'value';
    return null;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const hit = findHeavyDataUrls(obj[i], `${prefix}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const hit = findHeavyDataUrls(obj[k], prefix ? `${prefix}.${k}` : k);
      if (hit) return hit;
    }
  }
  return null;
}

const { exec } = require('child_process');

// ... (existing code)

app.get('/api/p95stats', async (req, res) => { try { const data = await p95stats.fetchData(); res.json(data); } catch (err) { res.status(500).json({ error: 'fetch_failed' }); } });

// v1.9.2: Start on-demand benchmark (5 minutes snapshot)
app.post('/api/benchmark/start', (req, res) => {
  // Omdat de container geen Python/Docker op de host kan draaien zonder complexe mounts,
  // gebruiken we een 'signal file' die een cronjob op de host oppikt.
  const signalFile = '/app/data/.benchmark_pending';
  try {
      fs.writeFileSync(signalFile, Date.now().toString());
      res.json({ status: 'started', message: 'Benchmark signal sent to host. Results in 5 min.' });
  } catch (err) {
      res.status(500).json({ error: 'signal_failed', message: err.message });
  }
});

// === USB BEHEER (v1.9.2+) ===
const USB_PATH = process.env.USB_PATH || '/usb';
const USB_EJECT_METHOD = process.env.USB_EJECT_METHOD || 'signal'; // 'signal' of 'native'

app.get('/api/usb/list', (req, res) => {
    try {
        if (!fs.existsSync(USB_PATH)) return res.json({ devices: [] });
        const items = fs.readdirSync(USB_PATH);
        const devices = items
            .filter(item => !item.startsWith('.')) 
            .filter(item => {
                try {
                    return fs.statSync(path.join(USB_PATH, item)).isDirectory();
                } catch (e) { return false; }
            })
            .map(item => ({
                id: item,
                name: item,
                path: path.join(USB_PATH, item),
                ejecting: fs.existsSync(path.join(USB_PATH, item, '.eject_requested'))
            }));
        
        const ejectedFlags = items.filter(f => f.startsWith('.ejected_')).map(f => f.replace('.ejected_', ''));
        res.json({ devices, ejected: ejectedFlags });
    } catch (err) {
        res.status(500).json({ error: 'list_failed', message: err.message });
    }
});

app.post('/api/usb/eject', (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'missing_deviceId' });

    if (USB_EJECT_METHOD === 'native') {
        // Methode 2: Direct ontkoppelen vanuit de container (vereist privileged: true)
        const mountPath = path.join(USB_PATH, deviceId);
        console.log(`[USB] Native eject requested for ${mountPath}`);
        
        exec(`sync && umount -l "${mountPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`[USB] Native eject failed: ${stderr}`);
                return res.status(500).json({ error: 'native_eject_failed', message: stderr });
            }
            // Maak een succes-vlaggetje aan voor de frontend
            const flagFile = path.join(USB_PATH, `.ejected_${deviceId}`);
            fs.writeFileSync(flagFile, Date.now().toString());
            res.json({ status: 'success', message: `Device ${deviceId} unmounted natively.` });
        });
    } else {
        // Methode 1: Signalering (Standaard Hobbithole flow via host watcher)
        const signalFolder = path.join(USB_PATH, '.eject_signals', deviceId);
        try {
            if (!fs.existsSync(path.dirname(signalFolder))) {
                fs.mkdirSync(path.dirname(signalFolder), { recursive: true });
            }
            fs.mkdirSync(signalFolder, { recursive: true });
            res.json({ status: 'eject_requested', message: `Eject signal sent for ${deviceId}` });
        } catch (err) {
            res.status(500).json({ error: 'signal_failed', message: err.message });
        }
    }
});

app.post('/api/usb/clear-ejected', (req, res) => {
    const { deviceId } = req.body;
    const flagFile = path.join(USB_PATH, `.ejected_${deviceId}`);
    try {
        if (fs.existsSync(flagFile)) fs.unlinkSync(flagFile);
        res.json({ status: 'ok' });
    } catch (err) {
        res.status(500).json({ error: 'clear_failed' });
    }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// === CALENDAR (v1.7.1) ===
// Server-side ICS feed fetch + parse — avoids CORS, gives consistent caching,
// keeps the frontend lightweight. Cached per URL for 10 minutes.
const calendarAdapter = require('./widgets/calendar');
const calendarCache = new Map();
const CALENDAR_TTL = 10 * 60 * 1000;

// === RSS / ATOM (v1.7.2) ===
const rssAdapter = require('./widgets/rss');
const rssCache = new Map();
const RSS_TTL = 30 * 60 * 1000;

app.get('/api/rss', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'missing_url' });
  // v1.8.2: ?refresh=1 bypasses cache for force-refresh button
  const bypass = req.query.refresh === '1';
  const cached = rssCache.get(url);
  if (!bypass && cached && (Date.now() - cached.t < RSS_TTL)) {
    return res.json(cached.data);
  }
  try {
    const data = await rssAdapter.fetchData({ feedUrl: url, count: 20 });
    rssCache.set(url, { t: Date.now(), data });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed', message: err.message });
  }
});

// === QUICK STAT (v1.7.3) ===
const quickstatAdapter = require('./widgets/quickstat');
const quickstatCache = new Map();
const QS_TTL = 5 * 60 * 1000;

app.get('/api/quickstat', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'missing_url' });
  const bypass = req.query.refresh === '1';
  const cached = quickstatCache.get(url);
  if (!bypass && cached && (Date.now() - cached.t < QS_TTL)) {
    return res.json(cached.data);
  }
  try {
    const data = await quickstatAdapter.fetchData({ url });
    quickstatCache.set(url, { t: Date.now(), data });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed', message: err.message });
  }
});

app.get('/api/calendar', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'missing_url' });
  const bypass = req.query.refresh === '1';
  const cached = calendarCache.get(url);
  if (!bypass && cached && (Date.now() - cached.t < CALENDAR_TTL)) {
    return res.json(cached.data);
  }
  try {
    const data = await calendarAdapter.fetchData({ icsUrl: url });
    calendarCache.set(url, { t: Date.now(), data });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed', message: err.message });
  }
});

// === WIDGETS ===
// List all enabled widgets with their (cached) data — frontend renders these under tiles.
app.get('/api/widgets', async (req, res) => {
  try {
    const config = readConfig();
    const result = await widgets.getAllWidgets(config.appWidgets || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'widgets_failed', message: err.message });
  }
});

// Force refresh a single widget (skips cache)
app.post('/api/widgets/:appId/refresh', async (req, res) => {
  try {
    const config = readConfig();
    const cfg = config.appWidgets && config.appWidgets[req.params.appId];
    if (!cfg) return res.status(404).json({ error: 'not_configured' });
    widgets.invalidate(req.params.appId, cfg.type);
    const data = await widgets.getWidgetData(req.params.appId, cfg);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'refresh_failed', message: err.message });
  }
});

// List supported widget types (for the App Editor dropdown)
app.get('/api/widgets/types', (req, res) => {
  res.json({ types: widgets.listAvailable() });
});

// === WATCHTOWER (v1.8.4) ===
// Standalone widget — manual update trigger + metrics for the Watchtower auto-updater.
// URL + token live in config.json under 'watchtower'. Frontend triggers via these endpoints
// so the token never leaves the server (and we don't need CORS gymnastics).
const watchtowerAdapter = require('./widgets/watchtower');

app.post('/api/watchtower/scan', async (req, res) => {
  try {
    const cfg = readConfig();
    const result = await watchtowerAdapter.triggerScan(cfg.watchtower);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'scan_failed', message: err.message });
  }
});

app.get('/api/watchtower/metrics', async (req, res) => {
  try {
    const cfg = readConfig();
    const metrics = await watchtowerAdapter.fetchMetrics(cfg.watchtower);
    res.json({ metrics: metrics || null, available: metrics !== null });
  } catch (err) {
    res.status(500).json({ error: 'metrics_failed', message: err.message });
  }
});

// === VM & SERVICE INTEGRATIE (v1.9.4) ===
const vmserviceAdapter = require('./widgets/vmservice');

app.post('/api/vmservice/test/proxmox', async (req, res) => {
  try {
    const { url, token, node, allowInsecure } = req.body;
    const testConfig = { url, token, node, allowInsecure };
    const versionInfo = await vmserviceAdapter.testProxmox(testConfig);
    res.json({ status: 'ok', version: versionInfo });
  } catch (err) {
    res.status(500).json({ error: 'test_failed', message: err.message });
  }
});

app.post('/api/vmservice/test/ssh', async (req, res) => {
  try {
    const { host, port, user, key, password } = req.body;
    const testConfig = { host, port, user, key, password };
    const result = await vmserviceAdapter.testSsh(testConfig);
    res.json({ status: 'ok', data: result });
  } catch (err) {
    res.status(500).json({ error: 'test_failed', message: err.message });
  }
});

app.get('/api/vmservice/status/:blockId', async (req, res) => {
  try {
    const cfg = readConfig();
    const block = (cfg.homeLayout && cfg.homeLayout.blocks || []).find(b => b.id === req.params.blockId);
    if (!block) return res.status(404).json({ error: 'block_not_found' });
    
    const status = await vmserviceAdapter.getStatus(cfg, block.config || {});
    res.json({ status: 'ok', data: status });
  } catch (err) {
    res.status(500).json({ error: 'status_failed', message: err.message });
  }
});

app.post('/api/vmservice/action/:blockId', async (req, res) => {
  try {
    const cfg = readConfig();
    const block = (cfg.homeLayout && cfg.homeLayout.blocks || []).find(b => b.id === req.params.blockId);
    if (!block) return res.status(404).json({ error: 'block_not_found' });

    const { action, vmId } = req.body;
    const result = await vmserviceAdapter.triggerAction(cfg, block.config || {}, action, vmId);
    res.json({ status: 'ok', data: result });
  } catch (err) {
    res.status(500).json({ error: 'action_failed', message: err.message });
  }
});

// === WALLPAPERS (v1.9.10) ===
// Files under /app/data/wallpapers/; config.json only stores light refs
// (e.g. "/api/wallpapers/static.jpg") — never multi-MB base64.
const WALLPAPERS_DIR = path.join(DATA_DIR, 'wallpapers');
if (!fs.existsSync(WALLPAPERS_DIR)) fs.mkdirSync(WALLPAPERS_DIR, { recursive: true });

const WALLPAPER_SLOT_RE = /^(static|live|dynamic-[0-4])$/;
const WALLPAPER_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm'
};
const WALLPAPER_MAX = {
  static: 4 * 1024 * 1024,      // compressed JPEG typically <1MB
  live: 20 * 1024 * 1024,       // short loop video
  'dynamic-0': 4 * 1024 * 1024,
  'dynamic-1': 4 * 1024 * 1024,
  'dynamic-2': 4 * 1024 * 1024,
  'dynamic-3': 4 * 1024 * 1024,
  'dynamic-4': 4 * 1024 * 1024
};

function wallpaperFilesForSlot(slot) {
  try {
    return fs.readdirSync(WALLPAPERS_DIR).filter(f =>
      f === slot || f.startsWith(slot + '.')
    );
  } catch {
    return [];
  }
}

function clearWallpaperSlot(slot) {
  for (const f of wallpaperFilesForSlot(slot)) {
    try { fs.unlinkSync(path.join(WALLPAPERS_DIR, f)); } catch (_) {}
  }
}

function publicWallpaperUrl(filename) {
  // cache-bust so browsers pick up replacements immediately
  try {
    const st = fs.statSync(path.join(WALLPAPERS_DIR, filename));
    return `/api/wallpapers/${filename}?v=${Math.floor(st.mtimeMs)}`;
  } catch {
    return `/api/wallpapers/${filename}`;
  }
}

// GET /api/wallpapers/:file — serve uploaded media
app.get('/api/wallpapers/:file', (req, res) => {
  const file = path.basename(req.params.file || '');
  if (!file || file.includes('..') || !/^[a-z0-9._-]+$/i.test(file)) {
    return res.status(400).json({ error: 'invalid_file' });
  }
  const full = path.join(WALLPAPERS_DIR, file);
  if (!full.startsWith(WALLPAPERS_DIR) || !fs.existsSync(full)) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(full);
});

// POST /api/wallpapers/:slot — raw body, Content-Type = image/* or video/*
app.post(
  '/api/wallpapers/:slot',
  express.raw({ type: () => true, limit: '22mb' }),
  (req, res) => {
    const slot = req.params.slot;
    if (!WALLPAPER_SLOT_RE.test(slot)) {
      return res.status(400).json({ error: 'invalid_slot', message: 'Use static, live, or dynamic-0..4' });
    }
    const ctype = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const ext = WALLPAPER_MIME[ctype];
    if (!ext) {
      return res.status(415).json({
        error: 'unsupported_media',
        message: `Content-Type must be one of: ${Object.keys(WALLPAPER_MIME).join(', ')}`
      });
    }
    if (slot === 'live' && !ctype.startsWith('video/')) {
      return res.status(415).json({ error: 'unsupported_media', message: 'live slot requires video/*' });
    }
    if (slot !== 'live' && !ctype.startsWith('image/')) {
      return res.status(415).json({ error: 'unsupported_media', message: 'image slots require image/*' });
    }
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);
    if (!buf.length) {
      return res.status(400).json({ error: 'empty_body' });
    }
    const max = WALLPAPER_MAX[slot] || WALLPAPER_MAX.static;
    if (buf.length > max) {
      return res.status(413).json({
        error: 'too_large',
        message: `Max ${Math.round(max / (1024 * 1024))}MB for slot ${slot} (got ${(buf.length / (1024 * 1024)).toFixed(1)}MB)`
      });
    }
    try {
      clearWallpaperSlot(slot);
      const filename = `${slot}${ext}`;
      fs.writeFileSync(path.join(WALLPAPERS_DIR, filename), buf);
      const url = publicWallpaperUrl(filename);
      console.log(`[wallpapers] saved ${filename} (${buf.length} bytes)`);
      res.json({ status: 'ok', slot, filename, url, bytes: buf.length });
    } catch (err) {
      res.status(500).json({ error: 'write_failed', message: err.message });
    }
  }
);

// DELETE /api/wallpapers/:slot
app.delete('/api/wallpapers/:slot', (req, res) => {
  const slot = req.params.slot;
  if (!WALLPAPER_SLOT_RE.test(slot)) {
    return res.status(400).json({ error: 'invalid_slot' });
  }
  try {
    clearWallpaperSlot(slot);
    res.json({ status: 'ok', slot });
  } catch (err) {
    res.status(500).json({ error: 'delete_failed', message: err.message });
  }
});

// === THEMES (v1.9.0) ===
const THEMES_DIR = path.join(__dirname, 'themes');
if (!fs.existsSync(THEMES_DIR)) fs.mkdirSync(THEMES_DIR);

const THEME_ID_RE = /^[a-z0-9-]+$/;

app.get('/api/themes', (req, res) => {
  try {
    const files = fs.readdirSync(THEMES_DIR).filter(f => f.endsWith('.json'));
    const themes = [];
    files.forEach(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, f), 'utf8'));
        if (data && data.id && data.name) {
          themes.push({ id: data.id, name: data.name, author: data.author });
        }
      } catch (e) {
        console.warn(`Skipping malformed theme file ${f}: ${e.message}`);
      }
    });
    res.json(themes);
  } catch (err) {
    res.status(500).json({ error: 'read_failed', message: err.message });
  }
});

app.get('/api/themes/:id', (req, res) => {
  const id = req.params.id;
  if (!THEME_ID_RE.test(id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }
  const themePath = path.join(THEMES_DIR, `${id}.json`);
  if (!fs.existsSync(themePath)) {
    return res.status(404).json({ error: 'not_found' });
  }
  let raw;
  try {
    raw = fs.readFileSync(themePath, 'utf8');
  } catch (err) {
    return res.status(500).json({ error: 'read_failed', message: err.message });
  }
  try {
    res.json(JSON.parse(raw));
  } catch (err) {
    return res.status(500).json({ error: 'parse_failed', message: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Config API listening on :${PORT}, config at ${CONFIG_PATH}`);
});
