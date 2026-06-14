// qBittorrent widget — uses cookie-based auth (POST /api/v2/auth/login → SID cookie)
// Config: { type: 'qbittorrent', url: 'http://nas:8080', username: 'admin', apiKey: '<password>', enabled: true }
// Note: we re-use the apiKey field as the password to avoid changing the form schema heavily.
//       The username field is shown by the App Editor only for this widget type.

async function fetchData(config) {
    if (!config || !config.url) throw new Error('qBittorrent URL ontbreekt');
    if (!config.username)        throw new Error('qBittorrent gebruikersnaam ontbreekt');
    if (!config.apiKey)          throw new Error('qBittorrent wachtwoord ontbreekt');

    const baseUrl = String(config.url).replace(/\/+$/, '');

    // 1. Login → grab SID cookie
    const loginBody = new URLSearchParams();
    loginBody.append('username', config.username);
    loginBody.append('password', config.apiKey);

    const loginRes = await fetch(`${baseUrl}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // qBittorrent strict CSRF check requires Referer matching host
            'Referer': baseUrl
        },
        body: loginBody
    });
    if (!loginRes.ok) throw new Error(`Login HTTP ${loginRes.status}`);

    const setCookie = loginRes.headers.get('set-cookie') || '';
    const sidMatch = setCookie.match(/SID=([^;]+)/);
    if (!sidMatch) {
        // Older qBittorrent or wrong creds may return text body "Fails."
        const body = await loginRes.text();
        throw new Error(body && body !== 'Ok.' ? body : 'Geen sessie cookie ontvangen — verkeerde gebruikersnaam/wachtwoord?');
    }
    const cookie = `SID=${sidMatch[1]}`;

    // 2. Transfer info (speeds) + active torrent count in parallel
    const [transferRes, torrentsRes] = await Promise.all([
        fetch(`${baseUrl}/api/v2/transfer/info`, { headers: { Cookie: cookie } }),
        fetch(`${baseUrl}/api/v2/torrents/info?filter=downloading`, { headers: { Cookie: cookie } })
    ]);
    if (!transferRes.ok) throw new Error(`Transfer info HTTP ${transferRes.status}`);
    const info = await transferRes.json();
    const torrents = torrentsRes.ok ? await torrentsRes.json() : [];

    return {
        title: 'qBittorrent',
        primary: { label: 'Snelheid', value: formatSpeed(info.dl_info_speed || 0) },
        secondary: [
            { label: 'Downloading', value: String(torrents.length || 0) },
            { label: 'Up',          value: formatSpeed(info.up_info_speed || 0) }
        ]
    };
}

function formatSpeed(bytesPerSec) {
    const bps = Number(bytesPerSec) || 0;
    if (bps >= 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
    if (bps >= 1024)        return `${(bps / 1024).toFixed(0)} KB/s`;
    return `${Math.round(bps)} B/s`;
}

module.exports = { fetchData };
