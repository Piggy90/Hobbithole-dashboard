// Home Assistant widget — counts of "on" entities by common domain
// Config: { type: 'homeassistant', url: 'http://nas:8123', apiKey: '<long-lived-access-token>', enabled: true }
// Token: HA → Profile → Long-lived access tokens → Create.

async function fetchData(config) {
    if (!config || !config.url)    throw new Error('Home Assistant URL ontbreekt');
    if (!config.apiKey)            throw new Error('Long-lived access token ontbreekt');

    const baseUrl = String(config.url).replace(/\/+$/, '');
    const url = `${baseUrl}/api/states`;

    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Accept': 'application/json'
        }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const states = await res.json();
    if (!Array.isArray(states)) throw new Error('Onverwacht response-formaat');

    let lightsOn = 0, switchesOn = 0, mediaActive = 0;
    let totalActive = 0;
    for (const s of states) {
        const id = String(s.entity_id || '');
        const state = String(s.state || '').toLowerCase();
        const domain = id.split('.')[0];
        if (state === 'on' || state === 'open' || state === 'home' || state === 'playing') totalActive++;
        if (domain === 'light' && state === 'on') lightsOn++;
        if (domain === 'switch' && state === 'on') switchesOn++;
        if (domain === 'media_player' && state === 'playing') mediaActive++;
    }

    return {
        title: 'Home Assistant',
        primary: { label: 'Active', value: String(totalActive) },
        secondary: [
            { label: '💡 Lights',  value: String(lightsOn) },
            { label: '🔌 Switches', value: String(switchesOn) },
            { label: '🎬 Playing',  value: String(mediaActive) }
        ]
    };
}

module.exports = { fetchData };
