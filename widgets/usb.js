const fs = require('fs');
const path = require('path');

const USB_PATH = '/usb';

async function fetchData(config) {
    try {
        if (!fs.existsSync(USB_PATH)) return { devices: [], ejected: [] };
        
        const items = fs.readdirSync(USB_PATH);
        const devices = [];
        const ejected = [];

        for (const item of items) {
            const fullPath = path.join(USB_PATH, item);
            if (item.startsWith('.ejected_')) {
                ejected.push(item.replace('.ejected_', ''));
                continue;
            }
            if (item === '.eject_signals') continue;
            
            try {
                if (fs.statSync(fullPath).isDirectory()) {
                    devices.push({
                        id: item,
                        name: item,
                        ejecting: fs.existsSync(path.join(USB_PATH, '.eject_signals', item))
                    });
                }
            } catch (e) {
                // Skip if stat fails (might be unmounting)
            }
        }
        
        return { devices, ejected };
    } catch (err) {
        throw new Error(`USB fetch failed: ${err.message}`);
    }
}

module.exports = { fetchData };
