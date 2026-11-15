# Hobbithole Dashboard - Zero-Config Homelab Dashboard

![Hobbithole Dashboard Showcase](https://raw.githubusercontent.com/Piggy90/Hobbithole-dashboard/main/public/images/dashboard-showcase.gif)

A blazing fast, responsive, self‑configuring dashboard for your homelab. Smart Docker auto‑detection, a cinematic weather widget, and **cross‑device settings sync** via a tiny config API.

> **v1.10.3** — **Discover containers that have no tile**, **Pinned label `hobbithole.tile=<tile id>`**, **Clock in the header**. Details below.
>
> Previously in **v1.10.2**: Bookmarks: icon from URL or slug, Edit bookmarks.
>
> **Upgrade tip:** always pull **both** images (`hobbithole-dashboard` **and** `hobbithole-config-api`) to the **same version**. The API is required for sync, wallpapers, themes, widgets, and auth.

## What's new in v1.10.3

### Added

- **Discover containers that have no tile** — on open, the dashboard looks at running containers.
- **Pinned label `hobbithole.tile=<tile id>`** — (2026-11-15) — when the container name and the port do not point at the same container, this compose label wins.
- **Clock in the header** — (2026-11-15) — time and date under the title.

## What's new in v1.10.2

### Added

- **Bookmarks: icon from URL or slug** — the icon field is no longer emoji-only (`maxlength=3` used to truncate a pasted link).
- **Edit bookmarks** — ✎ on an existing row (visible on hover) opens the same form with name/URL/icon filled in.
- **Change password** — Settings → Security while signed in (current + new).
- **Hub update check** — config-api `GET /api/updates/check` reads newest release tags for `piggyoriginal/hobbithole-dashboard` + `…-config-api` (30m cache).
- **Settings: more collapsible sections** — Apps, Docker scan, Home widgets, Backup, Search, Weather, Feedback, Benchmark (plus existing imports/integrations).

### Fixed

- **Password managers did not see the login form** — (2026-09-16) — the overlay started as `display:none` (first scan misses the fields) and the **Show** button sat on top of the password field…
- **Login cookie expired while you were still using the dashboard** — the server slid the session 14 days on every request, the browser cookie `Max-Age` did not.
- **Changelog modal: long bullets truncated** — the renderer took only the first line of each `-` item; wrapped continuation lines in CHANGELOG.md were dropped.
- **Changelog modal: dates hidden** — the version-header date (`## [vX] - YYYY-MM-DD`) and inline `(YYYY-MM-DD)` on bullets are no longer shown.
- **Weather widget: panel overlapped the weather card** — (2026-08-29) — the expanded panel used a **fixed** `top` (100px, 80px under the mobile media query) while the card above it grows with its content.
- **Rain chart: bars sat on two different baselines** — (2026-08-29) — the time label was a flex child *inside* the bar column, but only every third bar has one.
- **Radar playback frames never released their memory** — `buildWeerenradarFrameCanvases()` builds a fresh set of detached canvases on every refresh, one per timestep (`1024×639` = 2.6 MB of backing store each, up to…
- **Auth UI copy when login is off but accounts exist** — status + button say “Turn login back on” (same email/password, no new first-run); disable confirm/toast state that accounts are kept.

### Security

- **Docker socket removed from the web server** — `docker-compose.hub.yml` also mounted `/var/run/docker.sock` on the `dashboard` (nginx) service, labelled "required for Docker container auto-detection".

## Optional authentication (how to enable)

Default remains **open / zero-config**. When you want login (e.g. before nginx / NPM / Cloudflare):

1. **UI (recommended):** Settings → Security → enable “Secure this dashboard”. First browser creates the admin.
2. **Compose lock (ops):** set `AUTH_ENABLED=true` on **config-api** (optional `SESSION_SECRET`).
3. **Do not** put port `8086` on the public internet without auth (or reverse-proxy auth).

## USB Eject Configuration

The dashboard supports two methods for safely unmounting external drives:

1.  **`SIGNAL` Mode (Default)**: The container writes a signal file. A simple script on your host (provided in the GitHub repo) monitors these signals and performs the actual `umount`. This is the safest method as it doesn't require extra Docker permissions.
2.  **`NATIVE` Mode**: The dashboard performs the `umount` command directly from within the container.
    *   **Requirement**: You must add `privileged: true` to the `config-api` service in your Docker Compose.
    *   **Environment Variable**: Set `USB_EJECT_METHOD=native` on the `config-api` service.

## Install via Docker Compose

```yaml
services:
  dashboard:
    image: piggyoriginal/hobbithole-dashboard:latest
    container_name: hobbithole-dashboard
    restart: unless-stopped
    ports:
      - "8086:80"
    volumes:
      # Required for automatic Docker container detection
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - dashboard_net
    depends_on:
      - config-api

  config-api:
    image: piggyoriginal/hobbithole-config-api:latest
    container_name: hobbithole-config-api
    restart: unless-stopped
    # Optional — lock auth on (or set false to force off). Omit = UI can toggle.
    # environment:
    #   - AUTH_ENABLED=true
    #   - SESSION_SECRET=change-me-long-random   # optional; auto file if omitted when auth on
    volumes:
      # Persistent settings (cross-device sync) + auth data under data/auth/
      - ./data:/app/data
      # Optional: enables the Container Manager / Portainer "local" widget + container actions
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - dashboard_net

networks:
  dashboard_net:
    driver: bridge
```

**Before `docker compose up -d`, create the data folder:**

```
mkdir -p data && chmod 777 data
```

## Pull the images directly

```
docker pull piggyoriginal/hobbithole-dashboard
docker pull piggyoriginal/hobbithole-config-api
```

## Features

- **Discover containers that have no tile** (v1.10.3) — on open, the dashboard looks at running containers.
- **Pinned label `hobbithole.tile=<tile id>`** (v1.10.3) — (2026-11-15) — when the container name and the port do not point at the same container, this compose label…
- **Clock in the header** (v1.10.3) — (2026-11-15) — time and date under the title.
- **Bookmarks: icon from URL or slug** (v1.10.2) — the icon field is no longer emoji-only (`maxlength=3` used to truncate a pasted link).
- **Edit bookmarks** (v1.10.2) — ✎ on an existing row (visible on hover) opens the same form with name/URL/icon filled in.
- **Cross‑device wallpapers** (v1.9.10) — static image, dynamic time-of-day slots (5), and live video; files under config-api `data/wallpapers/`
- **Container quick actions** (improved v1.9.10) — Start / Stop / Restart on tiles; matches by port **or** container/compose name
- **Live weather radar** (v1.9.9+) — Weerenradar (Europe) + RainViewer global; home widget + expanded panel
- **Canvas mode** (GA) — free-place home widgets; preference synced via config-api
- **Theme engine** (v1.9.0+) — curated experiences (Classic, Glass Ocean, Midnight Neon, Nordic Frost)
- **USB & External Storage Management** (v1.9.2) — safely unmount USB / external SSDs (SIGNAL or NATIVE eject)
- **Live p95 Resource Metrics** (v1.9.2) — on-demand CPU/RAM benchmark for containers
- **Proxmox / VM control** (v1.9.4) — status + start/stop/restart for VMs and LXCs
- **First‑Run Wizard** (zero setup)
- **Smart Docker Detection** — auto‑detects containers via image name + dashboard‑icons CDN (1000+ apps)
- **Dynamic IP Auto‑Detection**
- **Customizable look** — accent color, card transparency, wallpapers, animated weather backdrop
- **Responsive UI** (desktop/mobile aware)
- **Drag & Drop** layout
- **Cross‑device settings sync** via lightweight config API
- **Cinematic Weather Widget**
  - Expandable hourly (3‑hour blocks) + 7‑day outlook
  - Search location by city name (no coordinates needed)
  - Animated backdrop: rain, snow, sun (toggle in settings)
  - Buienradar / Open‑Meteo hybrid (free; no API key for Open‑Meteo)
- **Live App Widgets** — server‑side fetched, cached per type (SABnzbd, Pi‑hole, Sonarr/Radarr, Jellyfin, Plex, …)
- **Command Palette** (`Cmd/Ctrl+K`) — fuzzy launcher for apps + actions
- **⋯ Tile menu** — pin / edit / delete
- **Live status dots** — green/red ping on every tile
