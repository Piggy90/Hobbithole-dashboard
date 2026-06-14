# Hobbithole Config API

Tiny Node.js / Express service that backs the **[Hobbithole Dashboard](https://hub.docker.com/r/piggyoriginal/hobbithole-dashboard)** with cross-device settings sync **and live app widgets**. Reads/writes `config.json` in a mounted volume + fetches widget data from your apps (11 types: SABnzbd, Pi-hole, Sonarr, Radarr, Jellyfin, Plex, Tautulli, Overseerr/Jellyseerr, qBittorrent, Home Assistant, Trailarr) so API keys stay server-side.

## What it does

**Settings sync**
- `GET /api/config` → returns the current `config.json` contents
- `POST /api/config` → overwrites `config.json` with the request body (JSON)

**App widgets** (v1.4.0+)
- `GET /api/widgets` → list of cached widget data per configured app
- `POST /api/widgets/:appId/refresh` → force-refresh a single widget
- `GET /api/widgets/types` → supported widget types

**Health**
- `GET /api/health`

The dashboard talks to this service through nginx (proxied internally), so users only ever hit the dashboard URL. API keys for Sonarr/Radarr/Jellyfin/etc. are stored in `config.json` (mounted volume) and never exposed to the browser.

## Usage

This image is meant to be deployed alongside the Hobbithole Dashboard. See the dashboard's compose example for the full setup:

➡ **[piggyoriginal/hobbithole-dashboard](https://hub.docker.com/r/piggyoriginal/hobbithole-dashboard)**

Quick excerpt:

```yaml
services:
  config-api:
    image: piggyoriginal/hobbithole-config-api:latest
    container_name: hobbithole-config-api
    restart: unless-stopped
    volumes:
      - ./data:/app/data
    networks:
      - dashboard_net
```

**Important**: create the `data` folder before first start:

```
mkdir -p data && chmod 777 data
```

## Why a separate service?

The dashboard itself is static HTML served by nginx — no backend. To get cross-device settings sync (so your weather widget, theme, and apps look the same on phone, tablet and desktop), we needed a tiny endpoint that can write a JSON file to disk. This is that endpoint.

Made with ❤️ using LokaiOS.
