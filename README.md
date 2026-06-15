# Hobbithole Dashboard — Zero‑Config Homelab Dashboard

A blazing fast, responsive, self‑configuring dashboard for your homelab. Smart Docker auto‑detection, a cinematic weather widget, and **cross‑device settings sync** via a tiny config API.

> 🆕 **v1.9.2** — **⏏️ USB Beheer & Eject Flow**: Manage and safely unmount USB drives and external SSDs directly from your dashboard with real-time feedback. + **📊 Live p95 Resource Metrics**: Real-time CPU and RAM usage under each app tile via a 5-minute benchmarking system. + **📦 Node.js 18 Compatibility**: Reverted API to Node 18 for broad server support.
>
> Previously in **v1.9.1**: Wallpaper Cross-Device Sync. **v1.9.0**: Theme Engine (4 built-in themes) + Canvas Mode GA. **v1.8.4**: Watchtower widget + External Services Settings section.

## ⏏️ USB Eject Configuration

The dashboard supports two methods for safely unmounting external drives:

1.  **`SIGNAL` Mode (Default)**: The container writes a signal file. A simple script on your host (provided in the GitHub repo) monitors these signals and performs the actual `umount`. This is the safest method as it doesn't require extra Docker permissions.
2.  **`NATIVE` Mode**: The dashboard performs the `umount` command directly from within the container.
    *   **Requirement**: You must add `privileged: true` to the `config-api` service in your Docker Compose.
    *   **Environment Variable**: Set `USB_EJECT_METHOD=native` on the `config-api` service.

## 🚀 Install via Docker Compose

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
    volumes:
      # Persistent settings (cross-device sync)
      - ./data:/app/data
      # Optional: enables the Container Manager / Portainer "local" widget
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

## 📦 Pull the images directly

```
docker pull piggyoriginal/hobbithole-dashboard
docker pull piggyoriginal/hobbithole-config-api
```

## ✨ Features

- **⏏️ USB & External Storage Management** (v1.9.2) — Manage and safely unmount USB drives and external SSDs with real-time feedback and data integrity protection
- **📊 Live p95 Resource Metrics** (v1.9.2) — Real-time CPU and RAM usage display for containers via on-demand benchmarking
- **First‑Run Wizard** (zero setup)
- **Smart Docker Detection** — auto‑detects containers via image name + dashboard‑icons CDN (1000+ apps), skips background services automatically
- **Dynamic IP Auto‑Detection**
- **Customizable look** — accent color picker, background image upload, card transparency slider, animated weather backdrop
- **Responsive UI** (desktop/mobile aware)
- **Drag & Drop** layout
- **Cross‑device settings sync** via lightweight config API
- **Cinematic Weather Widget**
  - Click to expand — hourly forecast (3‑hour blocks) + 7‑day outlook
  - Click any day → see that day's hourly breakdown
  - Search location by city name (no coordinates needed)
  - Wind, rain probability, min/max temp shown when relevant
  - Animated backdrop: rain, snow, sun (toggle in settings)
  - Powered by open‑meteo (free, no API key)
- **Live App Widgets** (v1.4.0+) — server‑side fetched, cached per type:
  - SABnzbd (download speed + queue)
  - Pi‑hole (DNS stats)
  - Sonarr / Radarr (upcoming TV/movies)
  - Jellyfin (now playing)
  - Extensible: drop a new adapter in `widgets/` to add more
- **Command Palette** (`Cmd/Ctrl+K`) — fuzzy launcher for apps + actions
- **⋯ Tile menu** — pin / edit / delete via clean popover
- **Live status dots** — green/red ping on every tile
- **Pinned favorites strip** — top apps highlighted with gold border
- **Fuzzy Search** across all your tiles
- **Backup & Restore** settings as JSON
- **Screensaver Mode** — fullscreen clock when idle
- **Multi‑language** (NL / EN / DE / FR / ES)

## 🏡 Perfect for

NAS systems, homelabs, Docker users, and anyone who wants a clean, self‑configuring dashboard without hassle.

Made with ❤️ using LokaiOS — the AI‑native operating system.
