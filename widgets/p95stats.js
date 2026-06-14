const fs = require('fs');
const path = require('path');

// Pad naar de benchmark data
const STATS_DIR = '/app/data/stats';

async function fetchData() {
  const results = {};
  try {
    if (!fs.existsSync(STATS_DIR)) return results;

    // Haal alle CSV bestanden op
    const allFiles = fs.readdirSync(STATS_DIR).filter(f => f.endsWith('.csv'));
    
    // Groepeer bestanden per container en onthoud de laatste mtime
    const latestFiles = {};
    allFiles.forEach(f => {
        const parts = f.split('_stats_');
        if (parts.length < 2) return;
        const containerName = parts[0];
        const filePath = path.join(STATS_DIR, f);
        const stats = fs.statSync(filePath);
        
        if (!latestFiles[containerName] || stats.mtime > latestFiles[containerName].mtime) {
            latestFiles[containerName] = { name: f, mtime: stats.mtime };
        }
    });

    let newestMtime = 0;
    for (const containerName in latestFiles) {
        const fileData = latestFiles[containerName];
        if (fileData.mtime > newestMtime) newestMtime = fileData.mtime;
        
        const filePath = path.join(STATS_DIR, fileData.name);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        let headerIdx = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Timestamp,Name,CPUPerc')) {
                headerIdx = i;
                break;
            }
        }
        
        if (headerIdx === -1) continue;
        
        const dataLines = lines.slice(headerIdx + 1).filter(l => l.trim() !== '');
        const cpuValues = [];
        const memValues = [];
        let name = '';
        
        for (const line of dataLines) {
            const parts = line.split(',');
            if (parts.length < 6) continue;
            
            name = parts[1];
            const cpu = parseFloat(parts[2].replace('%', ''));
            const mem = parseFloat(parts[3].replace('MiB', ''));
            
            if (!isNaN(cpu)) cpuValues.push(cpu);
            if (!isNaN(mem)) memValues.push(mem);
        }
        
        if (cpuValues.length > 0) {
            cpuValues.sort((a, b) => a - b);
            memValues.sort((a, b) => a - b);
            const p95Idx = Math.min(Math.floor(cpuValues.length * 0.95), cpuValues.length - 1);
            
            results[name.replace(/[-\s]/g, "").toLowerCase()] = {
                cpu: cpuValues[p95Idx].toFixed(2) + '%',
                mem: memValues[p95Idx].toFixed(2) + ' MiB'
            };
        }
    }

    if (newestMtime) {
        results['__metadata'] = {
            lastUpdate: newestMtime
        };
    }
  } catch (err) {
    console.error('Error fetching p95 stats:', err);
  }
  return results;
}

module.exports = { fetchData };
