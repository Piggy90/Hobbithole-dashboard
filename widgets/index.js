// Widget registry — discovers adapters, caches per (appId+type), enforces TTL.
// Each adapter exports `fetchData(config)` returning a normalized data object.

const pihole = require('./pihole');
const sabnzbd = require('./sabnzbd');
const sonarr = require('./sonarr');
const radarr = require('./radarr');
const jellyfin = require('./jellyfin');
const plex = require('./plex');
const tautulli = require('./tautulli');
const overseerr = require('./overseerr');
const qbittorrent = require('./qbittorrent');
const homeassistant = require('./homeassistant');
const trailarr = require('./trailarr');
const containermanager = require('./containermanager');
const portainer = require('./portainer');
const usb = require('./usb');

const WIDGETS = {
    pihole,
    sabnzbd,
    sonarr,
    radarr,
    jellyfin,
    plex,
    tautulli,
    overseerr,
    qbittorrent,
    homeassistant,
    trailarr,
    containermanager,
    portainer,
    usb
};

// Per-widget cache TTL in ms
const WIDGET_TTL = {
    pihole:    30000,  // Pi-hole stats change quickly enough; 30s is fresh & cheap
    sonarr:    60000,  // calendar doesn't change minute-to-minute
    radarr:    60000,
    plex:      10000,  // "now playing" should feel live
    jellyfin:  10000,  // same — now playing
    tautulli:  10000,  // current activity
    overseerr: 60000,  // requests change slowly
    qbittorrent: 5000,
    sabnzbd:   5000,
    homeassistant: 15000,  // entity states change frequently
    trailarr:  60000,  // library size changes slowly
    containermanager: 15000,  // local docker stats — cheap to refresh
    portainer: 15000,   // remote API — keep modest
    usb:       3000     // USB status should be very reactive during eject
};

const DEFAULT_TTL = 60000;
const FETCH_TIMEOUT_MS = 6000;

const cache = new Map(); // key: `${appId}:${type}` → { appId, type, status, data, error, cachedAt }

function ttlFor(type) {
    return WIDGET_TTL[type] || DEFAULT_TTL;
}

async function getWidgetData(appId, widgetConfig) {
    const { type } = widgetConfig || {};
    if (!type) return null;
    if (!WIDGETS[type]) {
        return { appId, type, status: 'error', error: `unknown_widget_type:${type}`, cachedAt: Date.now() };
    }

    const key = `${appId}:${type}`;
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.cachedAt < ttlFor(type))) {
        return cached;
    }

    try {
        const data = await withTimeout(WIDGETS[type].fetchData(widgetConfig), FETCH_TIMEOUT_MS);
        const result = { appId, type, status: 'ok', data, cachedAt: Date.now() };
        cache.set(key, result);
        return result;
    } catch (err) {
        const result = {
            appId, type,
            status: 'error',
            error: err.message || String(err),
            cachedAt: Date.now()
        };
        cache.set(key, result);
        return result;
    }
}

function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
        promise.then(
            v => { clearTimeout(timer); resolve(v); },
            e => { clearTimeout(timer); reject(e); }
        );
    });
}

async function getAllWidgets(appWidgets) {
    if (!appWidgets || typeof appWidgets !== 'object') return [];
    const entries = Object.entries(appWidgets)
        .filter(([_, cfg]) => cfg && cfg.enabled && cfg.type);
    const results = await Promise.all(entries.map(([appId, cfg]) => getWidgetData(appId, cfg)));
    return results.filter(Boolean);
}

function invalidate(appId, type) {
    if (appId && type) {
        cache.delete(`${appId}:${type}`);
        return;
    }
    cache.clear();
}

function listAvailable() {
    return Object.keys(WIDGETS);
}

module.exports = { getWidgetData, getAllWidgets, invalidate, listAvailable };
