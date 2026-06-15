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
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'write_failed', message: err.message });
  }
});

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
