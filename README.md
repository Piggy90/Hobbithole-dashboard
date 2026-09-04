# Hobbithole Dashboard - Zero-Config Homelab Dashboard

![Hobbithole Dashboard Showcase](https://raw.githubusercontent.com/Piggy90/Hobbithole-dashboard/main/images/dashboard-showcase.gif)

A blazing fast, responsive, self‑configuring dashboard for your homelab. Smart Docker auto‑detection, a cinematic weather widget, and **cross‑device settings sync** via a tiny config API.

> **v1.10.1** — **Status dot: Docker first, URL fallback**, **Optional `containerName` field**, **Compact service tile**, plus more. Details below.
>
> Previously in **v1.10.0**: Optional authentication (product feature), Release popup.
>
> **Upgrade tip:** always pull **both** images (`hobbithole-dashboard` **and** `hobbithole-config-api`) to the **same version**. The API is required for sync, wallpapers, themes, widgets, and auth.

## What's new in v1.10.1

### Added

- **Status dot: Docker first, URL fallback** — match on `containerName` / URL port / tile name (compose service).
- **Optional `containerName` field** — on add/edit app — explicit link for status dot and p95 when the display name differs from the container name.
- **Compact service tile** — (`compact: true`) — chip row: status dot + name + p95 RAM (no large icon, no CPU line).
- **Compact stacks in Apps** — consecutive compact tiles form a vertical column (`.compact-stack`, one grid cell).
- **Settings → Help & tips** — searchable FAQ near the top of Settings (after Language).
- **Settings: “Back to top” button** — floating control bottom-right while Settings is open (viewport-fixed).
- **Settings: jump legend (section nav)** — sticky “Jump to section” chips for all visible Settings blocks.

### Fixed

- **Docker scanner skipped host-network containers** — (2026-08-22) — Settings → Scan Docker Containers only kept containers with a `PublicPort`.
- **Wind radar (Gust) — animated white streamlines** — Weerenradar delivers base map (JPEG) + **wind vector field** (`wind:N:png` in X-Custom-Body; R/G vs offset 85) + `windvalues` JSON.
- **p95 metrics missing on tiles despite a valid benchmark** — the run measures all running Docker containers, but a tile only showed CPU/RAM when the **display name** matched after stripping spaces and `-`.
- **Compact tile looked like an empty square** — in a mixed grid: CSS grid stretched the chip to the row height of icon cards.
- **GitHub blob icon URLs** — (`/blob/…` or `?raw=true`) are rewritten in `resolveIconSrc` to `raw.githubusercontent.com` (stable `image/*`).

## What's new in v1.10.0

### Added

- **Optional authentication (product feature)** — set `AUTH_ENABLED=true` and `SESSION_SECRET` on config-api.
- **Release popup** — `optional-auth-remote-1.10.0` — optional login + safer remote access via reverse proxy (once max).
- **Auth via the UI (zero-config)** — Settings → Security → “Secure this dashboard”.
- **Login UI** — overlay for first-run setup or sign-in; **Show/Hide** password toggle.
- **Docker endpoints via config-api** — containers/info/start/stop/restart no longer hit the Docker socket from the browser nginx path.

### Fixed

- **Login loop on LAN HTTP** — session cookie was marked `Secure` because `AUTH_PUBLIC_URL` was https while logging in over `http://IP:8086`.
- **Empty dashboard without login screen** — a duplicate `const pw` in the auth overlay crashed the whole frontend (SyntaxError).

### Security

- Do not expose port 8086 to the internet without `AUTH_ENABLED=true` (or reverse-proxy auth).
- Auth status must not be treated as “auth off” on fetch failure (avoids silent empty 401 UI).

## Optional authentication (how to enable)

Default remains **open / zero-config**. When you want login (e.g. before nginx / NPM / Cloudflare):

1. **UI (recommended):** Settings → Security → enable “Secure this dashboard”. First browser creates the admin.
2. **Change password:** Settings → Security while signed in. There is **no** email reset (the email is a login name, not a mailbox we send to).
3. **Forgot password (host):** `docker exec -it hobbithole-config-api node auth.js passwd` (optional `--email`). Power users can still replace the hash in `data/auth/users.json`.
4. **Compose lock (ops):** set `AUTH_ENABLED=true` on **config-api** (optional `SESSION_SECRET`).
5. **Do not** put port `8086` on the public internet without auth (or reverse-proxy auth).

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

- **Status dot: Docker first, URL fallback** (v1.10.1) — match on `containerName` / URL port / tile name (compose service).
- **Optional `containerName` field** (v1.10.1) — on add/edit app — explicit link for status dot and p95 when the display name differs from the container name.
- **Compact service tile** (v1.10.1) — (`compact: true`) — chip row: status dot + name + p95 RAM (no large icon, no CPU line).
- **Compact stacks in Apps** (v1.10.1) — consecutive compact tiles form a vertical column (`.compact-stack`, one grid cell).
- **Optional authentication (product feature)** (v1.10.0) — set `AUTH_ENABLED=true` and `SESSION_SECRET` on config-api.
- **Release popup** (v1.10.0) — `optional-auth-remote-1.10.0` — optional login + safer remote access via reverse proxy (once max).
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
