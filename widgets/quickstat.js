// Quick Stat widget — proxies a custom URL and returns its body verbatim.
// The frontend extracts the value via configurable JSON path. Server-side fetch
// avoids CORS and lets us cache. Body is returned as text; if it's JSON the
// frontend parses it.
// Config: { url: '...' }

async function fetchData(config) {
    if (!config || !config.url) throw new Error('URL ontbreekt');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(config.url, {
            headers: { 'Accept': 'application/json, text/plain, */*' },
            signal: controller.signal
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.text();
        return { body };
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { fetchData };
