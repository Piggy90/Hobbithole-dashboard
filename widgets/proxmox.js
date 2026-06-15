const https = require('https');

async function withTimeout(promise, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await promise(controller.signal);
    } finally {
        clearTimeout(timer);
    }
}

function normalizeUrl(url) {
    if (!url) return null;
    return String(url).replace(/\/+$/, '');
}

function httpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data || 'Geen response data'}`));
                }
            });
        });
        req.on('error', reject);
        if (options.body) {
            req.write(options.body);
        }
        if (options.signal) {
            options.signal.addEventListener('abort', () => {
                req.destroy();
                reject(new Error('Request afgebroken wegens time-out'));
            });
        }
        req.end();
    });
}

async function proxmoxRequest(config, path, method = 'GET', body = null) {
    const base = normalizeUrl(config && config.url);
    const token = config && config.token;
    const allowInsecure = config && config.allowInsecure;

    if (!base) throw new Error('Proxmox URL niet geconfigureerd');
    if (!token) throw new Error('Proxmox token niet geconfigureerd');

    const headers = {
        'Authorization': 'PVEAPIToken=' + token,
        'Accept': 'application/json'
    };
    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    const agent = new https.Agent({ rejectUnauthorized: !allowInsecure });

    const options = {
        method,
        headers,
        agent
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const url = `${base}/api2/json${path}`;

    return await withTimeout(async (signal) => {
        options.signal = signal;
        return await httpsRequest(url, options);
    }, 8000);
}

async function getStatus(config, vmId, type = 'qemu') {
    const node = (config && config.node) || 'pve';
    const path = `/nodes/${node}/${type}/${vmId}/status/current`;
    const data = await proxmoxRequest(config, path, 'GET');
    return data && data.data;
}

async function triggerAction(config, vmId, type = 'qemu', action = 'start') {
    const node = (config && config.node) || 'pve';
    const path = `/nodes/${node}/${type}/${vmId}/status/${action}`;
    const data = await proxmoxRequest(config, path, 'POST');
    return data && data.data;
}

async function testConnection(config) {
    const path = '/version';
    const data = await proxmoxRequest(config, path, 'GET');
    return data && data.data;
}

module.exports = { getStatus, triggerAction, testConnection };
