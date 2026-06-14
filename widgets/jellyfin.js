// Jellyfin widget — active sessions / now playing
// Config: { type: 'jellyfin', url: 'http://nas:8096', apiKey: '...', enabled: true }
// API key: Jellyfin → Dashboard → API Keys → "+"

async function fetchData(config) {
    if (!config || !config.url)    throw new Error('Jellyfin URL ontbreekt');
    if (!config.apiKey)            throw new Error('Jellyfin API key ontbreekt');

    const baseUrl = String(config.url).replace(/\/+$/, '');
    const headers = {
        'Accept': 'application/json',
        'Authorization': `MediaBrowser Token="${config.apiKey}"`
    };

    const res = await fetch(`${baseUrl}/Sessions?activeWithinSeconds=900`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const sessions = await res.json();
    if (!Array.isArray(sessions)) throw new Error('Onverwacht response-formaat');

    const playing = sessions.filter(s => s.NowPlayingItem);

    if (playing.length === 0) {
        return {
            title: 'Jellyfin',
            primary: { label: 'Status', value: 'Idle' },
            secondary: [{ label: 'Sessies', value: String(sessions.length) }]
        };
    }

    const item = playing[0].NowPlayingItem;
    const user = playing[0].UserName || playing[0].UserId || 'Unknown';
    const title = formatItemTitle(item);

    return {
        title: 'Jellyfin',
        primary: { label: `${playing.length} actief`, value: title },
        secondary: [{ label: user, value: item.Type || 'Media' }]
    };
}

function formatItemTitle(item) {
    if (!item) return '—';
    if (item.Type === 'Episode') {
        const series = item.SeriesName || '';
        const s = typeof item.ParentIndexNumber === 'number' ? `S${pad(item.ParentIndexNumber)}` : '';
        const e = typeof item.IndexNumber === 'number' ? `E${pad(item.IndexNumber)}` : '';
        return [series, `${s}${e}`].filter(Boolean).join(' ');
    }
    return item.Name || '—';
}

function pad(n) { return String(n).padStart(2, '0'); }

module.exports = { fetchData };
