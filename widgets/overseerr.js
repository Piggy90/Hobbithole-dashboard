// Overseerr / Jellyseerr widget — pending requests + most recent
// Config: { type: 'overseerr', url: 'http://nas:5055', apiKey: '...', enabled: true }
// API key: Overseerr → Settings → General → API Key.

async function fetchData(config) {
    if (!config || !config.url)    throw new Error('Overseerr URL ontbreekt');
    if (!config.apiKey)            throw new Error('Overseerr API key ontbreekt');

    const baseUrl = String(config.url).replace(/\/+$/, '');
    const headers = {
        'Accept': 'application/json',
        'X-Api-Key': config.apiKey
    };

    const [pendingRes, recentRes] = await Promise.all([
        fetch(`${baseUrl}/api/v1/request/count`, { headers }),
        fetch(`${baseUrl}/api/v1/request?take=1&sort=added`, { headers })
    ]);

    if (!pendingRes.ok) throw new Error(`HTTP ${pendingRes.status}`);
    const counts = await pendingRes.json();

    const pending = counts.pending || 0;
    const approved = counts.approved || 0;
    const total = counts.total || 0;

    let latestLabel = '—';
    if (recentRes.ok) {
        const recent = await recentRes.json();
        const item = (recent.results || [])[0];
        if (item && item.media) {
            const title = item.media.title || item.media.name || 'Request';
            const status = ['', 'Pending', 'Approved', 'Declined'][item.status] || 'Unknown';
            latestLabel = `${title} — ${status}`;
        }
    }

    return {
        title: 'Overseerr',
        primary: { label: 'Pending', value: String(pending) },
        secondary: [
            { label: 'Approved', value: String(approved) },
            { label: 'Totaal', value: String(total) },
            { label: 'Recent', value: latestLabel }
        ]
    };
}

module.exports = { fetchData };
