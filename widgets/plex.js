// Plex widget — active streams via /status/sessions
// Config: { type: 'plex', url: 'http://nas:32400', apiKey: '<X-Plex-Token>', enabled: true }
// Token: in Plex web → settings → Authorized Devices, or extract from a request URL.

async function fetchData(config) {
    if (!config || !config.url)    throw new Error('Plex URL ontbreekt');
    if (!config.apiKey)            throw new Error('X-Plex-Token ontbreekt');

    const baseUrl = String(config.url).replace(/\/+$/, '');
    const url = `${baseUrl}/status/sessions?X-Plex-Token=${encodeURIComponent(config.apiKey)}`;

    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const container = data.MediaContainer || {};
    const sessions = container.Metadata || [];
    const count = sessions.length;

    if (count === 0) {
        return {
            title: 'Plex',
            primary: { label: 'Status', value: 'Idle' },
            secondary: [{ label: 'Sessies', value: '0' }]
        };
    }

    const item = sessions[0];
    const user = (item.User && item.User.title) || 'Unknown';

    return {
        title: 'Plex',
        primary: { label: `${count} actief`, value: formatTitle(item) },
        secondary: [{ label: user, value: item.type || 'media' }]
    };
}

function formatTitle(item) {
    if (!item) return '—';
    if (item.type === 'episode') {
        const series = item.grandparentTitle || '';
        const s = item.parentIndex ? `S${pad(item.parentIndex)}` : '';
        const e = item.index ? `E${pad(item.index)}` : '';
        return [series, `${s}${e}`].filter(Boolean).join(' ');
    }
    return item.title || '—';
}

function pad(n) { return String(n).padStart(2, '0'); }

module.exports = { fetchData };
