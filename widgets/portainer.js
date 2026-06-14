// Portainer widget — uses Portainer's REST API
// Config: { type: 'portainer', url: 'http://nas:9000', apiKey: '...', enabled: true }
// API key: Portainer → User Settings → Access tokens → Add access token.

async function fetchData(config) {
    if (!config || !config.url)    throw new Error('Portainer URL ontbreekt');
    if (!config.apiKey)            throw new Error('Portainer API key (access token) ontbreekt');

    const baseUrl = String(config.url).replace(/\/+$/, '');
    const headers = {
        'Accept': 'application/json',
        'X-API-Key': config.apiKey
    };

    // 1. List endpoints to find a Docker endpoint we can query
    const epRes = await fetch(`${baseUrl}/api/endpoints`, { headers });
    if (!epRes.ok) throw new Error(`Endpoints HTTP ${epRes.status}`);
    const endpoints = await epRes.json();
    if (!Array.isArray(endpoints) || endpoints.length === 0) {
        throw new Error('Geen endpoints gevonden in Portainer');
    }

    // Pick the first reachable Docker endpoint (Type 1 = Docker)
    const ep = endpoints.find(e => e.Type === 1) || endpoints[0];

    // 2. Fetch container list for that endpoint
    const cRes = await fetch(`${baseUrl}/api/endpoints/${ep.Id}/docker/containers/json?all=1`, { headers });
    if (!cRes.ok) throw new Error(`Containers HTTP ${cRes.status}`);
    const containers = await cRes.json();
    if (!Array.isArray(containers)) throw new Error('Onverwacht response (containers)');

    const total = containers.length;
    const running = containers.filter(c => c.State === 'running').length;
    const stopped = total - running;
    const epName = ep.Name || `endpoint #${ep.Id}`;

    return {
        title: 'Portainer',
        primary: { label: 'Running', value: String(running) },
        secondary: [
            { label: 'Stopped',  value: String(stopped) },
            { label: 'Total',    value: String(total) },
            { label: 'Endpoint', value: epName }
        ]
    };
}

module.exports = { fetchData };
