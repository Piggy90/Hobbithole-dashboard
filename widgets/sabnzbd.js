// SABnzbd widget adapter
// Config: { type: 'sabnzbd', url: 'http://nas:8080/sabnzbd', apiKey: '...', enabled: true }
// Notes: include any base path (Synology Package Center typically uses /sabnzbd) in the URL.
// We append /api?mode=queue&output=json&apikey=... to whatever you provide.

async function fetchData(config) {
    if (!config || !config.url) throw new Error('SABnzbd URL ontbreekt');
    if (!config.apiKey)      throw new Error('SABnzbd API key ontbreekt');

    const baseUrl = String(config.url).replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/api?mode=queue&output=json&apikey=${encodeURIComponent(config.apiKey)}`;

    const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    let json;
    try { json = await res.json(); }
    catch { throw new Error('Ongeldige response — verkeerde URL of pad?'); }

    if (json && json.error) throw new Error(json.error);
    if (!json || !json.queue) throw new Error('Onverwacht response-formaat');

    const q = json.queue;
    const speedKb = parseFloat(q.kbpersec || 0);
    const speed = formatSpeed(speedKb);
    const mbLeft = parseFloat(q.mbleft || 0);
    const remaining = formatSize(mbLeft);
    const status = (q.paused === true || q.status === 'Paused') ? 'Gepauzeerd'
                 : (q.status || (speedKb > 0 ? 'Downloading' : 'Idle'));

    return {
        title: 'SABnzbd',
        primary: { label: 'Snelheid', value: speed },
        secondary: [
            { label: 'In wachtrij', value: parseInt(q.noofslots || 0, 10) },
            { label: 'Resterend',   value: remaining },
            { label: 'Status',      value: status }
        ]
    };
}

function formatSpeed(kbPerSec) {
    if (!isFinite(kbPerSec) || kbPerSec <= 0) return '0 KB/s';
    if (kbPerSec >= 1024) return `${(kbPerSec / 1024).toFixed(1)} MB/s`;
    return `${kbPerSec.toFixed(0)} KB/s`;
}

function formatSize(mb) {
    if (!isFinite(mb) || mb <= 0) return '—';
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(0)} MB`;
}

module.exports = { fetchData };
