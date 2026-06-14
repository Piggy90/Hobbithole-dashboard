// Container Manager / Local Docker widget
// Reads stats from the local Docker socket — no URL, no auth needed.
// Requires /var/run/docker.sock to be mounted into the config-api container.
// Config: { type: 'containermanager', enabled: true } — URL/apiKey ignored.

const http = require('http');

const SOCKET_PATH = '/var/run/docker.sock';

function dockerGet(path) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            socketPath: SOCKET_PATH,
            path,
            method: 'GET',
            headers: { 'Host': 'localhost' }
        }, (res) => {
            let buf = '';
            res.on('data', c => buf += c);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(buf)); }
                    catch (e) { reject(new Error(`Bad JSON from docker.sock: ${e.message}`)); }
                } else {
                    reject(new Error(`docker.sock ${res.statusCode}: ${buf.slice(0, 80)}`));
                }
            });
        });
        req.on('error', err => {
            // Friendlier error if the socket isn't mounted (most common reason it fails)
            if (err.code === 'ENOENT' || /no such file/i.test(err.message)) {
                reject(new Error('docker.sock niet gemount in config-api — voeg `/var/run/docker.sock:/var/run/docker.sock:ro` toe aan je compose'));
            } else {
                reject(new Error(`docker.sock niet bereikbaar: ${err.message}`));
            }
        });
        req.end();
    });
}

async function fetchData(_config) {
    // Get full container list (including stopped) and live info
    const [containers, info] = await Promise.all([
        dockerGet('/containers/json?all=1'),
        dockerGet('/info')
    ]);

    if (!Array.isArray(containers)) throw new Error('Onverwacht response (containers)');

    const total = containers.length;
    const running = containers.filter(c => c.State === 'running').length;
    const stopped = total - running;

    // Most recently started container (excluding ourselves where possible)
    const sorted = [...containers].sort((a, b) => (b.Created || 0) - (a.Created || 0));
    const last = sorted[0];
    const lastName = last && Array.isArray(last.Names) && last.Names.length
        ? last.Names[0].replace(/^\//, '')
        : '—';

    return {
        title: 'Container Manager',
        primary: { label: 'Running', value: `${running}` },
        secondary: [
            { label: 'Stopped', value: String(stopped) },
            { label: 'Total',   value: String(total) },
            { label: 'Recent',  value: lastName }
        ]
    };
}

module.exports = { fetchData };
