// Pi-hole widget adapter
// Config: { type: 'pihole', url: 'http://pihole.local', apiKey?: '...', enabled: true }
// Returns normalized stats: blocked today, percentage blocked, total queries.

async function fetchData(config) {
    if (!config || !config.url) {
        throw new Error('Pi-hole URL ontbreekt');
    }
    const baseUrl = String(config.url).replace(/\/+$/, '');
    const auth = config.apiKey ? `&auth=${encodeURIComponent(config.apiKey)}` : '';
    const apiUrl = `${baseUrl}/admin/api.php?summaryRaw${auth}`;

    const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    let json;
    try { json = await res.json(); }
    catch { throw new Error('Ongeldige response (geen JSON) — controleer URL en API key'); }

    // Pi-hole returns an empty array for unauthenticated requests on locked dashboards
    if (Array.isArray(json) || !json || typeof json !== 'object' || !('ads_blocked_today' in json)) {
        throw new Error('Geen data — auth vereist of API blocked');
    }

    return {
        title: 'Pi-hole',
        primary: {
            label: 'Geblokkeerd vandaag',
            value: formatNumber(json.ads_blocked_today)
        },
        secondary: [
            { label: '% geblokkeerd', value: `${parseFloat(json.ads_percentage_today || 0).toFixed(1)}%` },
            { label: 'Queries vandaag', value: formatNumber(json.dns_queries_today) }
        ]
    };
}

function formatNumber(n) {
    const num = Number(n);
    if (!isFinite(num)) return String(n);
    return num.toLocaleString('nl-NL');
}

module.exports = { fetchData };
