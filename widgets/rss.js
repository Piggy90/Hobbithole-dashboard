// RSS / Atom feed widget — fetches a feed URL, parses headlines, returns top items.
// Config: { feedUrl: 'https://...', count?: 5 }
// Returns: { title, items: [{ title, link, date }] }

async function fetchData(config) {
    if (!config || !config.feedUrl) throw new Error('Feed URL ontbreekt');
    const max = parseInt(config.count, 10) || 5;

    const res = await fetch(config.feedUrl, {
        headers: { 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml || xml.length < 50) throw new Error('Lege of ongeldige feed');

    const items = parseFeed(xml).slice(0, max);
    const title = extractFeedTitle(xml) || 'Feed';
    return { title, items };
}

// Mini RSS+Atom parser. Handles common shapes including CDATA blocks.
function parseFeed(xml) {
    const items = [];
    // Try RSS 2.0 first (<item>...</item>)
    const rssMatches = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi);
    if (rssMatches) {
        for (const block of rssMatches) {
            items.push(parseRssItem(block));
        }
        return items.filter(i => i.title);
    }
    // Atom (<entry>...</entry>)
    const atomMatches = xml.match(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi);
    if (atomMatches) {
        for (const block of atomMatches) {
            items.push(parseAtomEntry(block));
        }
        return items.filter(i => i.title);
    }
    return [];
}

function parseRssItem(block) {
    return {
        title: cleanText(getTagContent(block, 'title')),
        link: cleanText(getTagContent(block, 'link')),
        date: parseDate(
            getTagContent(block, 'pubDate') ||
            getTagContent(block, 'dc:date') ||
            getTagContent(block, 'published')
        )
    };
}

function parseAtomEntry(block) {
    return {
        title: cleanText(getTagContent(block, 'title')),
        link: extractAtomLink(block),
        date: parseDate(
            getTagContent(block, 'published') ||
            getTagContent(block, 'updated')
        )
    };
}

// Atom: <link href="..." rel="alternate" /> — prefer alternate, fall back to first
function extractAtomLink(block) {
    const links = block.match(/<link\b[^>]*\/?>(?:[\s\S]*?<\/link>)?/gi) || [];
    let alt = null;
    for (const tag of links) {
        const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
        if (!hrefMatch) continue;
        const href = hrefMatch[1];
        if (/rel=["']alternate["']/i.test(tag)) return href;
        if (!alt) alt = href;
    }
    return alt || null;
}

function getTagContent(block, tag) {
    // Match <tag ...>...</tag> case-insensitive
    const re = new RegExp(`<${escapeRegex(tag)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegex(tag)}>`, 'i');
    const m = re.exec(block);
    return m ? m[1] : null;
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function cleanText(s) {
    if (!s) return null;
    // Strip CDATA wrapper
    s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
    // Strip HTML tags from titles (common in feeds)
    s = s.replace(/<[^>]+>/g, '');
    // Decode common entities
    s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
         .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
         .replace(/&nbsp;/g, ' ');
    return s.trim();
}

function parseDate(s) {
    if (!s) return null;
    s = cleanText(s) || '';
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

function extractFeedTitle(xml) {
    // Pull the <title> from <channel> (RSS) or <feed> (Atom). Stop at first occurrence.
    const channel = xml.match(/<channel\b[^>]*>([\s\S]*?)<\/channel>/i);
    if (channel) return cleanText(getTagContent(channel[1], 'title'));
    const feed = xml.match(/<feed\b[^>]*>([\s\S]*?)<title\b[^>]*>([\s\S]*?)<\/title>/i);
    if (feed) return cleanText(feed[2]);
    return null;
}

module.exports = { fetchData };
