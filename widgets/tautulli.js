// Tautulli widget — Plex stats / current activity
// Config: { type: 'tautulli', url: 'http://nas:8181', apiKey: '...', enabled: true }
// API key: Tautulli → Settings → Web Interface → API → "API Key".

async function fetchData(config) {
    if (!config || !config.url)    throw new Error('Tautulli URL ontbreekt');
    if (!config.apiKey)            throw new Error('Tautulli API key ontbreekt');

    const baseUrl = String(config.url).replace(/\/+$/, '');
    const url = `${baseUrl}/api/v2?apikey=${encodeURIComponent(config.apiKey)}&cmd=get_activity`;

    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (!json.response || json.response.result !== 'success') {
        throw new Error((json.response && json.response.message) || 'Tautulli API fout');
    }

    const data = json.response.data || {};
    const streams = data.stream_count || 0;
    const transcode = data.stream_count_transcode || 0;
    const bandwidthKbps = parseFloat(data.total_bandwidth || 0); // kbps
    const bandwidth = bandwidthKbps >= 1024
        ? `${(bandwidthKbps / 1024).toFixed(1)} Mbps`
        : `${Math.round(bandwidthKbps)} kbps`;

    return {
        title: 'Tautulli',
        primary: { label: 'Streams', value: String(streams) },
        secondary: [
            { label: 'Transcoding', value: String(transcode) },
            { label: 'Bandbreedte', value: streams > 0 ? bandwidth : '—' }
        ]
    };
}

module.exports = { fetchData };
