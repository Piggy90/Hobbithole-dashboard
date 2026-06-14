// Calendar widget — fetches an ICS feed (Google Calendar, iCloud, Synology, Nextcloud, etc.)
// Config: { type: 'calendar', icsUrl: 'https://...', enabled: true }
// Returns next 5 upcoming events.
//
// MVP scope: parses VEVENT blocks with DTSTART/DTEND/SUMMARY only.
// Out of scope (planned for v1.7.2): RRULE recurring events, TZID lookup, EXDATE.

async function fetchData(config) {
    if (!config || !config.icsUrl) throw new Error('ICS feed URL ontbreekt');

    const res = await fetch(config.icsUrl, { headers: { 'Accept': 'text/calendar, */*' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ics = await res.text();
    if (!/BEGIN:VCALENDAR/i.test(ics)) throw new Error('Antwoord is geen geldig ICS bestand');

    const events = parseIcs(ics);
    const now = Date.now();
    const upcoming = events
        .filter(e => e.start && e.start.getTime() >= now - 60 * 60 * 1000) // include events that started in last hour
        .sort((a, b) => a.start - b.start)
        .slice(0, 5)
        .map(e => ({
            title: e.summary || '(geen titel)',
            start: e.start.toISOString(),
            end:   e.end ? e.end.toISOString() : null,
            allDay: !!e.allDay,
            location: e.location || null
        }));

    return {
        title: 'Agenda',
        events: upcoming,
        total: upcoming.length
    };
}

// Minimal ICS parser — VEVENT blocks → events array.
// Handles line continuation (lines starting with space/tab) and the basic date forms.
function parseIcs(ics) {
    const lines = unfoldLines(ics.split(/\r?\n/));
    const events = [];
    let current = null;

    for (const line of lines) {
        if (line === 'BEGIN:VEVENT') {
            current = {};
            continue;
        }
        if (line === 'END:VEVENT') {
            if (current) events.push(current);
            current = null;
            continue;
        }
        if (!current) continue;

        const sepIdx = line.indexOf(':');
        if (sepIdx === -1) continue;
        const keyPart = line.slice(0, sepIdx);
        const value = line.slice(sepIdx + 1);
        const [keyName] = keyPart.split(';'); // strip parameters like ;TZID=...

        switch (keyName.toUpperCase()) {
            case 'SUMMARY':     current.summary  = unescapeIcs(value); break;
            case 'LOCATION':    current.location = unescapeIcs(value); break;
            case 'DTSTART':     current.start    = parseIcsDate(value, keyPart); current.allDay = isAllDayValue(value); break;
            case 'DTEND':       current.end      = parseIcsDate(value, keyPart); break;
            case 'UID':         current.uid      = value; break;
        }
    }
    return events;
}

// ICS allows folded lines: any line starting with space or tab continues the previous one.
function unfoldLines(lines) {
    const out = [];
    for (const line of lines) {
        if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
            out[out.length - 1] += line.slice(1);
        } else {
            out.push(line);
        }
    }
    return out;
}

// ICS escape sequences: \n → newline, \, → comma, \; → semicolon, \\ → backslash
function unescapeIcs(s) {
    return s.replace(/\\([nN,;\\])/g, (_, ch) => (ch === 'n' || ch === 'N') ? '\n' : ch);
}

function isAllDayValue(value) {
    return /^\d{8}$/.test(value);
}

// Parses ICS dates with the four common formats:
//   20260508T140000Z              (UTC)
//   DTSTART;TZID=Europe/Amsterdam:20260508T140000  (named timezone via TZID param)
//   20260508T140000               (floating local time — fallback)
//   20260508                      (date-only)
function parseIcsDate(value, keyWithParams) {
    if (/^\d{8}$/.test(value)) {
        const y = +value.slice(0, 4), m = +value.slice(4, 6) - 1, d = +value.slice(6, 8);
        return new Date(y, m, d);
    }
    const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
    if (!m) return null;
    const [_, y, mo, d, h, mi, s, z] = m;
    if (z === 'Z') {
        return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
    }
    // Look for TZID=... in the parameter portion
    const tzMatch = (keyWithParams || '').match(/TZID=([^;:]+)/);
    if (tzMatch) {
        return parseInTimezone(+y, +mo - 1, +d, +h, +mi, +s, tzMatch[1]);
    }
    // Floating local time — server's local zone
    return new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

// Convert "wall time" in a named IANA timezone to a UTC Date.
// Uses Intl.DateTimeFormat to detect the offset for the given moment (handles DST automatically).
// Example: parseInTimezone(2026, 4, 8, 14, 0, 0, 'Europe/Amsterdam') → 2026-05-08T12:00:00Z (CEST = UTC+2)
function parseInTimezone(year, month, day, hour, min, sec, tzid) {
    try {
        const utcGuess = Date.UTC(year, month, day, hour, min, sec);
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: tzid,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hourCycle: 'h23'
        });
        const parts = fmt.formatToParts(new Date(utcGuess));
        const get = t => +parts.find(p => p.type === t).value;
        const tzAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'),
                                 get('hour'), get('minute'), get('second'));
        const offset = tzAsUtc - utcGuess;
        return new Date(utcGuess - offset);
    } catch {
        // Unknown TZID — fall back to floating local time
        return new Date(year, month, day, hour, min, sec);
    }
}

module.exports = { fetchData };
