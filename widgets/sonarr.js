// Sonarr widget — upcoming episodes (next 7 days)
// Config: { type: 'sonarr', url: 'http://nas:8989', apiKey: '...', enabled: true }

async function fetchData(config) {
    if (!config || !config.url)    throw new Error('Sonarr URL ontbreekt');
    if (!config.apiKey)            throw new Error('Sonarr API key ontbreekt');

    const baseUrl = String(config.url).replace(/\/+$/, '');
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 7);

    const url = `${baseUrl}/api/v3/calendar`
        + `?start=${start.toISOString()}`
        + `&end=${end.toISOString()}`
        + `&includeSeries=true`
        + `&apikey=${encodeURIComponent(config.apiKey)}`;

    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items)) throw new Error('Onverwacht response-formaat');

    const next = items[0];
    let nextLabel = '—';
    if (next) {
        const date = new Date(next.airDateUtc || next.airDate);
        const day = date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
        const title = (next.series && next.series.title) || next.seriesTitle || 'Episode';
        const ep = (typeof next.seasonNumber === 'number' && typeof next.episodeNumber === 'number')
            ? ` S${pad(next.seasonNumber)}E${pad(next.episodeNumber)}` : '';
        nextLabel = `${title}${ep} — ${day}`;
    }

    return {
        title: 'Sonarr',
        primary: { label: 'Komende 7 dagen', value: String(items.length) },
        secondary: [{ label: 'Volgende', value: nextLabel }]
    };
}

function pad(n) { return String(n).padStart(2, '0'); }

module.exports = { fetchData };
