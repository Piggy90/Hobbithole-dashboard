// Radarr widget — upcoming movie releases (next 30 days)
// Config: { type: 'radarr', url: 'http://nas:7878', apiKey: '...', enabled: true }

async function fetchData(config) {
    if (!config || !config.url)    throw new Error('Radarr URL ontbreekt');
    if (!config.apiKey)            throw new Error('Radarr API key ontbreekt');

    const baseUrl = String(config.url).replace(/\/+$/, '');
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 30);

    const url = `${baseUrl}/api/v3/calendar`
        + `?start=${start.toISOString()}`
        + `&end=${end.toISOString()}`
        + `&apikey=${encodeURIComponent(config.apiKey)}`;

    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items)) throw new Error('Onverwacht response-formaat');

    const next = items[0];
    let nextLabel = '—';
    if (next) {
        const dateStr = next.digitalRelease || next.physicalRelease || next.inCinemas;
        const day = dateStr
            ? new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
            : 'binnenkort';
        nextLabel = `${next.title || 'Movie'} — ${day}`;
    }

    return {
        title: 'Radarr',
        primary: { label: 'Komende 30 dagen', value: String(items.length) },
        secondary: [{ label: 'Volgende', value: nextLabel }]
    };
}

module.exports = { fetchData };
