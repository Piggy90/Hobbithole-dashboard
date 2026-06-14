// Watchtower widget (v1.8.4) — manual scan trigger + metrics for the auto-updater.
// User needs WATCHTOWER_HTTP_API_UPDATE=true + WATCHTOWER_HTTP_API_TOKEN=<token> in their compose.
// Optional: WATCHTOWER_HTTP_API_METRICS=true for richer info (scans/updates/skipped counts).
// Config: { url: 'http://watchtower:8080', token: '...' }

async function withTimeout(promise, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await promise(controller.signal);
    } finally {
        clearTimeout(timer);
    }
}

function normalizeBase(url) {
    if (!url) return null;
    return String(url).replace(/\/+$/, '');
}

async function triggerScan(config) {
    const base = normalizeBase(config && config.url);
    const token = config && config.token;
    if (!base) throw new Error('Watchtower URL niet geconfigureerd');
    if (!token) throw new Error('Watchtower token niet geconfigureerd');

    // Watchtower's POST /v1/update blocks until the scan completes (can be minutes
    // when checking many images against Docker Hub). We can't make the user wait.
    // Strategy: race the fetch against a 2s timer. If Watchtower returns within 2s,
    // surface its real response (incl. auth errors). Otherwise return optimistically
    // — the scan IS running, frontend can poll /metrics to see progress.
    const scanPromise = fetch(base + '/v1/update', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
    }).then(async res => {
        if (res.status === 204) return { ok: true, status: 204 };
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Watchtower HTTP ${res.status}${text ? ': ' + text.slice(0, 120) : ''}`);
        }
        return { ok: true, status: res.status };
    });

    // Swallow any later error so we don't leave an unhandled rejection floating
    // (frontend will see scan via metrics regardless).
    scanPromise.catch(err => {
        if (typeof console !== 'undefined') console.error('[watchtower] background scan error:', err.message);
    });

    const earlyResult = await Promise.race([
        scanPromise,
        new Promise(resolve => setTimeout(() => resolve({ ok: true, status: 'pending', pending: true }), 2000))
    ]);
    return earlyResult;
}

async function fetchMetrics(config) {
    const base = normalizeBase(config && config.url);
    const token = config && config.token;
    if (!base || !token) return null;

    try {
        return await withTimeout(async (signal) => {
            const res = await fetch(base + '/v1/metrics', {
                headers: { 'Authorization': 'Bearer ' + token },
                signal
            });
            if (!res.ok) return null;
            const text = await res.text();
            // Parse Prometheus text format: lines like 'watchtower_containers_scanned 23'
            const out = {};
            text.split('\n').forEach(line => {
                if (!line || line.startsWith('#')) return;
                const m = line.match(/^(watchtower_\w+)\s+([\d.eE+-]+)/);
                if (m) out[m[1]] = parseFloat(m[2]);
            });
            return out;
        }, 5000);
    } catch {
        return null; // metrics is best-effort; widget still works without it
    }
}

module.exports = { triggerScan, fetchMetrics };
