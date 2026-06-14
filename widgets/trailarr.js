// Trailarr widget — total media tracked + downloaded trailers
// Config: { type: 'trailarr', url: 'http://nas:7889', apiKey: '...', enabled: true }
// API key: Trailarr → Settings → Settings → API Key.

async function fetchData(config) {
    if (!config || !config.url)    throw new Error('Trailarr URL ontbreekt');
    if (!config.apiKey)            throw new Error('Trailarr API key ontbreekt');

    const baseUrl = String(config.url).replace(/\/+$/, '');
    const headers = {
        'Accept': 'application/json',
        'X-API-KEY': config.apiKey
    };

    const [mediaRes, downloadsRes] = await Promise.all([
        fetch(`${baseUrl}/api/v1/media/all_raw`, { headers }),
        fetch(`${baseUrl}/api/v1/media/downloads_raw`, { headers })
    ]);

    if (!mediaRes.ok) throw new Error(`Media HTTP ${mediaRes.status}`);
    const media = await mediaRes.json();
    if (!Array.isArray(media)) throw new Error('Onverwacht response-formaat');

    const downloads = downloadsRes.ok ? await downloadsRes.json() : [];

    const monitored = media.filter(m => m && m.monitor !== false).length;
    const movies = media.filter(m => m && (m.is_movie === true || m.media_type === 'movie')).length;
    const series = media.length - movies;
    const downloadedCount = Array.isArray(downloads) ? downloads.length : 0;

    return {
        title: 'Trailarr',
        primary: { label: 'Tracked', value: String(media.length) },
        secondary: [
            { label: '🎬 Movies', value: String(movies) },
            { label: '📺 Series', value: String(series) },
            { label: '📥 Trailers', value: String(downloadedCount) }
        ]
    };
}

module.exports = { fetchData };
