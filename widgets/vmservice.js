const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const SSH_KEY_PATH = '/app/data/ssh_key';

// === HELPER FUNCTIES ===

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

// Executed een shell-commando lokaal of remote via SSH
async function runCmd(config, cmd, forceSsh = false) {
    const useSsh = forceSsh || (config && config.useSsh);
    if (!useSsh) {
        // Lokaal uitvoeren binnen de container / LXC
        return new Promise((resolve) => {
            exec(cmd, (error, stdout, stderr) => {
                resolve({ code: error ? (error.code || 1) : 0, stdout: stdout.trim(), stderr: stderr.trim() });
            });
        });
    }

    // Remote via SSH uitvoeren
    const host = config && config.host;
    const port = (config && config.port) || 22;
    const user = (config && config.user) || 'root';
    const key = config && config.key;
    const password = config && config.password;

    if (!host) {
        throw new Error('SSH host niet geconfigureerd in instellingen');
    }

    if (key) {
        try {
            fs.writeFileSync(SSH_KEY_PATH, key.trim() + '\n', { mode: 0o600 });
        } catch (err) {
            console.error('[SSH] Fout bij schrijven SSH key:', err.message);
        }
    }

    let sshCmd = '';
    if (key && fs.existsSync(SSH_KEY_PATH)) {
        sshCmd = `ssh -i ${SSH_KEY_PATH} -o StrictHostKeyChecking=no -o ConnectTimeout=5 -p ${port} ${user}@${host} "${cmd.replace(/"/g, '\\"')}"`;
    } else if (password) {
        sshCmd = `sshpass -p '${password.replace(/'/g, "'\\''")}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -p ${port} ${user}@${host} "${cmd.replace(/"/g, '\\"')}"`;
    } else {
        sshCmd = `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -p ${port} ${user}@${host} "${cmd.replace(/"/g, '\\"')}"`;
    }

    return new Promise((resolve) => {
        exec(sshCmd, (error, stdout, stderr) => {
            resolve({ code: error ? (error.code || 1) : 0, stdout: stdout.trim(), stderr: stderr.trim() });
        });
    });
}

// === PROXMOX API DRIVER ===

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

// === HOOFD DRIVERS & API EXPORTS ===

async function getStatus(globalConfig, widgetConfig) {
    const provider = widgetConfig.provider || 'proxmox';
    
    if (provider === 'proxmox') {
        const pveConfig = globalConfig.proxmox;
        const vmIdInput = String(widgetConfig.vmId || '');
        if (!vmIdInput) throw new Error('VM/LXC ID niet geconfigureerd in widget');

        const targetIds = vmIdInput.split(',').map(s => parseInt(s.trim(), 10)).filter(id => !isNaN(id));
        if (targetIds.length === 0) throw new Error('Geen geldige VM/LXC IDs geconfigureerd');

        const res = await proxmoxRequest(pveConfig, '/cluster/resources', 'GET');
        const resources = (res && res.data) || [];

        const matched = resources.filter(r => targetIds.includes(r.vmid) && (r.type === 'qemu' || r.type === 'lxc'));

        const items = targetIds.map(id => {
            const r = matched.find(item => item.vmid === id);
            if (!r) {
                return { vmid: id, status: 'unknown', name: `VM ${id}`, cpu: 0, memUsed: 0, memMax: 0, uptime: 0 };
            }
            return {
                vmid: r.vmid,
                status: r.status,
                type: r.type,
                node: r.node,
                name: r.name || `VM ${id}`,
                cpu: r.cpu ? Math.round(r.cpu * 100) : 0,
                memUsed: r.mem || 0,
                memMax: r.maxmem || 0,
                uptime: r.uptime || 0
            };
        });

        if (items.length === 1) {
            return items[0]; // Behoud achterwaartse compatibiliteit voor enkele widgets
        }

        return {
            isList: true,
            items: items
        };
    } 
    
    if (provider === 'systemd') {
        const sshConfig = globalConfig.ssh;
        const serviceName = widgetConfig.serviceName;
        const useSsh = widgetConfig.useSsh === 'true' || widgetConfig.useSsh === true;

        if (!serviceName) throw new Error('Systemd service-naam niet geconfigureerd');

        const cmd = `systemctl is-active ${serviceName}`;
        const res = await runCmd(useSsh ? sshConfig : null, cmd, useSsh);
        const isActive = res.stdout === 'active';

        // Systeemonderzoek via systemctl status voor uptime/naam
        const detailCmd = `systemctl show ${serviceName} --property=ActiveEnterTimestamp,Id,Description`;
        const details = await runCmd(useSsh ? sshConfig : null, detailCmd, useSsh);
        
        let uptime = 0;
        let description = serviceName;
        
        details.stdout.split('\n').forEach(line => {
            if (line.startsWith('ActiveEnterTimestamp=')) {
                const tsString = line.split('=')[1];
                if (tsString && tsString !== 'no') {
                    const ts = Date.parse(tsString);
                    if (!isNaN(ts)) uptime = Math.floor((Date.now() - ts) / 1000);
                }
            }
            if (line.startsWith('Description=')) {
                description = line.split('=')[1] || serviceName;
            }
        });

        return {
            status: isActive ? 'running' : 'stopped',
            name: description,
            cpu: 0, // Systemd resource metrics vereisen cgroupsv2 en is erg complex lokaal/remote
            memUsed: 0,
            memMax: 0,
            uptime: isActive ? uptime : 0
        };
    }

    if (provider === 'command') {
        const sshConfig = globalConfig.ssh;
        const statusCmd = widgetConfig.statusCmd;
        const useSsh = widgetConfig.useSsh === 'true' || widgetConfig.useSsh === true;
        const name = widgetConfig.title || 'Custom Command';

        if (!statusCmd) throw new Error('Status commando niet geconfigureerd');

        const res = await runCmd(useSsh ? sshConfig : null, statusCmd, useSsh);
        
        return {
            status: res.code === 0 ? 'running' : 'stopped',
            name: name,
            cpu: 0,
            memUsed: 0,
            memMax: 0,
            uptime: 0
        };
    }

    throw new Error('Onbekende provider: ' + provider);
}

async function triggerAction(globalConfig, widgetConfig, action, targetVmId = null) {
    // action: 'start' | 'stop' | 'reboot'
    const provider = widgetConfig.provider || 'proxmox';

    if (provider === 'proxmox') {
        const pveConfig = globalConfig.proxmox;
        const vmId = targetVmId ? parseInt(targetVmId, 10) : parseInt(widgetConfig.vmId, 10);
        if (isNaN(vmId)) throw new Error('VM/LXC ID niet geconfigureerd');

        // Bepaal node en type dynamisch via /cluster/resources
        const res = await proxmoxRequest(pveConfig, '/cluster/resources', 'GET');
        const resources = (res && res.data) || [];
        const r = resources.find(item => item.vmid === vmId && (item.type === 'qemu' || item.type === 'lxc'));
        if (!r) throw new Error(`VM/LXC met ID ${vmId} niet gevonden op Proxmox host`);

        const node = r.node || 'pve';
        const type = r.type || 'qemu';

        // Proxmox actie mapping
        let pveAction = action;
        if (action === 'reboot') pveAction = 'reboot';
        if (action === 'stop') pveAction = 'stop'; // of 'shutdown'

        const path = `/nodes/${node}/${type}/${vmId}/status/${pveAction}`;
        const actionRes = await proxmoxRequest(pveConfig, path, 'POST');
        return actionRes && actionRes.data;
    }

    if (provider === 'systemd') {
        const sshConfig = globalConfig.ssh;
        const serviceName = widgetConfig.serviceName;
        const useSsh = widgetConfig.useSsh === 'true' || widgetConfig.useSsh === true;

        if (!serviceName) throw new Error('Systemd service-naam niet geconfigureerd');

        let serviceCmd = '';
        if (action === 'start') serviceCmd = `systemctl start ${serviceName}`;
        if (action === 'stop') serviceCmd = `systemctl stop ${serviceName}`;
        if (action === 'reboot') serviceCmd = `systemctl restart ${serviceName}`;

        const res = await runCmd(useSsh ? sshConfig : null, serviceCmd, useSsh);
        if (res.code !== 0) {
            throw new Error(`Systemd actie mislukt: ${res.stderr || 'exit code ' + res.code}`);
        }
        return { success: true };
    }

    if (provider === 'command') {
        const sshConfig = globalConfig.ssh;
        const useSsh = widgetConfig.useSsh === 'true' || widgetConfig.useSsh === true;
        
        let cmd = '';
        if (action === 'start') cmd = widgetConfig.startCmd;
        if (action === 'stop') cmd = widgetConfig.stopCmd;
        
        if (!cmd) throw new Error(`Geen commando geconfigureerd voor actie: ${action}`);

        const res = await runCmd(useSsh ? sshConfig : null, cmd, useSsh);
        if (res.code !== 0) {
            throw new Error(`Commando actie mislukt: ${res.stderr || 'exit code ' + res.code}`);
        }
        return { success: true };
    }

    throw new Error('Onbekende provider: ' + provider);
}

async function testProxmox(config) {
    const path = '/version';
    const res = await proxmoxRequest(config, path, 'GET');
    return res && res.data;
}

async function testSsh(config) {
    // Voert een simpele "whoami" status check uit over SSH om credentials te testen
    const cmd = 'whoami';
    const res = await runCmd(config, cmd, true);
    if (res.code !== 0) {
        throw new Error(res.stderr || 'Onbekende SSH fout');
    }
    return { user: res.stdout.trim() };
}

module.exports = { getStatus, triggerAction, testProxmox, testSsh };
