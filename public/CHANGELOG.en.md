# Hobbithole Cinema Dashboard — Changelog

## [v1.10.3-dev] - 2026-10-04
### Added
- **Discover containers that have no tile** — on open, the dashboard looks at running
  containers. If one has a reachable port (published, or host-network with a known port) and
  no tile yet, a quiet footer notice appears: `N without a tile`. No popup. Click opens
  Settings → Docker Scanner with the list: add one, add all, or **Not now**. Not now hides
  exactly those containers until a new one shows up (this browser and the server config, so a
  second browser does not nag again). A tile counts as a match on container name, compose
  service, the Docker container-name field, or the port in the URL — also when a host-network
  container publishes no port. A generic base image (nginx, node, …) uses the container name
  as the tile name, not "Nginx". The dashboard itself and
  config-api are skipped. Databases and sidecars without a port stay off the list. A port
  published only on 127.0.0.1 gets `127.0.0.1` in the URL, not the LAN address. Adding a tile
  also stores the container name.
- **Pinned label `hobbithole.tile=<tile id>`** (2026-11-15) — when the container name and the
  port do not point at the same container, this compose label wins. A container pinned to
  another tile no longer matches this one by port or name. If two containers carry the same
  label, the running one wins. The id is on App edit, in the Pinned label field
  (`hobbithole.tile=app-…`); click selects the line to copy. Discover skips a container once
  its label points at an existing tile.

## [v1.10.2] - 2026-09-16

### Security
- **Docker socket removed from the web server** — `docker-compose.hub.yml` also mounted
  `/var/run/docker.sock` on the `dashboard` (nginx) service, labelled "required for Docker
  container auto-detection". That has not been true since **v1.10**: container endpoints go
  through config-api (`/api/containers*`) and `location /docker/` returns `404` in nginx. The
  mount was a leftover and was never used — `default.conf` references no socket at all, only
  `proxy_pass` to `config-api:3000`. Even read-only, that socket exposes every container, image
  and log on the host. **The socket now lives only on config-api**, where it belongs. No action
  needed when upgrading; auto-detection keeps working.

### Added
- **Bookmarks: icon from URL or slug** — the icon field is no longer emoji-only
  (`maxlength=3` used to truncate a pasted link). Same resolver as manual app tiles:
  `https://…` / data URL, a dashboard-icons slug (`github`, `jellyfin`), or an emoji.
  Empty = 🔗. Re-save any bookmark that stored a truncated URL.
- **Edit bookmarks** — ✎ on an existing row (visible on hover) opens the same form with
  name/URL/icon filled in. No more delete-then-re-add.
- **Change password** — Settings → Security while signed in (current + new). Other sessions
  for the same account are dropped. No email reset on the login screen (email is only a login
  name). Locked out: on the host `docker exec -it hobbithole-config-api node auth.js passwd`.
  Power users can still replace the hash in `data/auth/users.json`.
- **Hub update check** — config-api `GET /api/updates/check` reads newest release tags for
  `piggyoriginal/hobbithole-dashboard` + `…-config-api` (30m cache). Quiet footer **Update**
  badge + Settings → Help panel when Hub is newer than `APP_VERSION`. Dismiss until the next
  newer tag; always pull **both** images to the same version. No popup. If Hub tags for the
  two images differ, the panel shows a stronger **skew** warning and points both at the newer tag.
- **Settings: more collapsible sections** — Apps, Docker scan, Home widgets, Backup, Search,
  Weather, Feedback, Benchmark (plus existing imports/integrations). Jump legend still reaches
  them; Dashboard / Language / Help / Security / Customize / Display / Danger stay open.

### Changed
- **Weather overlay: one rAF, two canvases** (2026-08-29) — `animateCinematicFx` (sky) and
  `animateWeatherFx` (rain/snow) did not share a frame: two callbacks, and the layers could
  drift a tick apart. Now `tickWeatherOverlay`: one loop, both paint routines. It stops only
  when **both** are done (otherwise the rain freezes when the sky stops, or the other way
  round). Step 2 (a single canvas) was not done. Headless rAF counts are inflated; on a real
  display this is ~60 fps for the *combined* loop instead of ~60+60.
- **Weather overlay at 30 fps** (2026-08-29) — that same loop now waits out the remainder of
  33 ms after each frame, like the radar wind flow already did. Halves the drawing work versus
  vsync; clouds, sun glow and rain are unchanged. **Confirmed in practice:** with the dashboard
  open a laptop's fan used to spin up and no longer does, and the page feels smoother. Nobody
  noticed the difference with 60 fps — which was the assumption, so it held.
- **Weather overlay: motion decoupled from the frame rate** (2026-08-29) — particles and clouds
  moved **per frame** (`p.y += p.speed`, `c.x += c.speed`), not per second. Going from 60 to
  30 fps therefore silently halved the falling and drifting speed too. Nobody noticed, and the
  current look was signed off, so that is now the reference: a step factor normalised to 30 fps
  (exactly 1 at 30, so unchanged) derived from the time actually elapsed, clamped to 0.25–3× so
  a hitch or a returning tab cannot shoot the rain across the screen. The frame rate now governs
  only smoothness and cost, not speed — which is what makes an honest 30-vs-24 comparison
  possible. Adjust without touching the code: **`?fxfps=24`** on the URL, or
  `setWeatherOverlayFps(24)` in the console.
- **Hub update-check hardening** — 5 min negative cache on Hub failures; `?refresh=1` throttled
  to ≥60s; tag pagination truncation is logged + flagged in the API response (`truncated`).
- **Release hygiene** — lab `docker-compose.yml` is not shipped to GitHub. The showcase GIF
  (~54 MB) lives on GitHub for the README animation, **not** in the Docker image. Hub README
  keeps `dashboard-home.png`.

### Fixed
- **Password managers did not see the login form** (2026-09-16) — the overlay started as
  `display:none` (first scan misses the fields) and the **Show** button sat on top of the
  password field (KeePassXC-Browser then treats it as hidden). The overlay is now re-inserted
  into the DOM once visible, **Show** sits beside the field, and the form is a real POST login
  (`autocomplete` username / current-password). **Confirmed in practice** with Edge +
  KeePassXC-Browser.
- **Login cookie expired while you were still using the dashboard** — the server slid the
  session 14 days on every request, the browser cookie `Max-Age` did not. After two weeks you
  had to sign in again. The cookie now slides with the session.
- **Changelog modal: long bullets truncated** — the renderer took only the first line of each
  `-` item; wrapped continuation lines in CHANGELOG.md were dropped. Continuations now belong
  to the item, so the full sentence is visible.
- **Changelog modal: dates hidden** — the version-header date (`## [vX] - YYYY-MM-DD`) and
  inline `(YYYY-MM-DD)` on bullets are no longer shown. They stay in the markdown file
  (Keep a Changelog / GitHub Release).
- **Weather widget: panel overlapped the weather card** (2026-08-29) — the expanded panel used a
  **fixed** `top` (100px, 80px under the mobile media query) while the card above it grows with
  its content. In a narrow window "Zwaar bewolkt en regen" wrapped onto two lines, the card grew
  to 92px, and the panel covered it by 12px. The panel now measures the card's real bottom edge
  when it opens (`positionExpandedWeather()`, also on `resize`) and keeps a 10px gap. A larger
  fixed number would not have fixed it — it just moves the problem to the next long description.
  A `max-height` came with it, since the panel now shifts further down.
- **Rain chart: bars sat on two different baselines** (2026-08-29) — the time label was a flex
  child *inside* the bar column, but only every third bar has one. Those columns reserved ~18px
  for text and the rest reserved none; since bar height is a percentage of the whole column,
  bars with a label under them were pushed **18px upwards**. The result was two baselines instead
  of one, with the times sitting among the neighbouring columns' short bars. Labels are now
  absolutely positioned below the chart and no longer count towards column height.
- **Radar playback frames never released their memory** — `buildWeerenradarFrameCanvases()`
  builds a fresh set of detached canvases on every refresh, one per timestep (`1024×639` =
  2.6 MB of backing store each, up to 24 of them). That backing store does **not** count
  towards the JS heap, so V8 only sees a few hundred bytes per canvas and never has a reason
  to run a GC — the bitmaps stayed until something else happened to create memory pressure.
  Measured: JS heap flat at 3.5 MB while the renderer process climbed to 800 MB, and
  `querySelectorAll('canvas')` stayed at 4 because these frames are never in the DOM.
  New `releaseRadarFrameCanvases()` sets each canvas to `0×0` — the only deterministic way —
  called in three places: `ctrl.destroy()`, `applyPack()` before the old set is replaced, and
  `ensureFrames()` for a set that finishes loading *after* the controller was already replaced
  (previously dropped on the floor in full). Measured live: one call per cycle, 52 canvases
  = 145 MB returned over 6 minutes.
- **Auth UI copy when login is off but accounts exist** — status + button say “Turn login back
  on” (same email/password, no new first-run); disable confirm/toast state that accounts are kept.

## [v1.10.1] - 2026-08-16
### Added
- **Status dot: Docker first, URL fallback** — match on `containerName` / URL port /
  tile name (compose service). Tooltip shows container state. No more false “offline”
  for localhost-only LAPIs (e.g. CrowdSec) while the container is `running`. Without a
  Docker match, the browser URL ping remains (bookmarks, external sites).
- **Optional `containerName` field** on add/edit app — explicit link for status dot and
  p95 when the display name differs from the container name.
- **Compact service tile** (`compact: true`) — chip row: status dot + name + p95 RAM
  (no large icon, no CPU line). For infra without a web UI. Toggle in add/edit app.
  URL may be empty/`#` (no link). Lab dogfood: CrowdSec compact.
- **Compact stacks in Apps** — consecutive compact tiles form a vertical column
  (`.compact-stack`, one grid cell). Drag chips under each other or out next to large
  tiles; move the whole stack as a block. Order stored in `categories`. Nested Sortable
  + parent grid; DOM order written back on drop.
- **Settings → Help & tips** — searchable FAQ near the top of Settings (after Language).
  Topics: icons, tiles, status/Docker/stacking, p95 benchmark, login/auth, widgets,
  wallpapers, Docker scan, home/canvas. Quick links: Changelog, GitHub README, Security.
  i18n `help.*` (full NL/EN; DE/FR/ES chrome localized, topic bodies EN until translated).
- **Settings: “Back to top” button** — floating control bottom-right while Settings is
  open (viewport-fixed). Appears after ~280px scroll in `#settings-view`, smooth-scrolls
  to the header with **Close**. i18n NL/EN/DE/FR/ES (`settings.backToTop`).
- **Settings: jump legend (section nav)** — sticky “Jump to section” chips for all
  visible Settings blocks. Click scrolls to the section (expands collapsibles, brief
  highlight). Hidden feature sections (USB/benchmark) stay out of the legend.
  i18n `settings.tocTitle`.

### Fixed
- **Docker scanner skipped host-network containers** (2026-08-22) — Settings → Scan
  Docker Containers only kept containers with a `PublicPort`. With `network_mode: host`
  Docker returns `Ports: []`, so **scrypted**, jellyfin, Home Assistant, qBittorrent
  never appeared. `pickEndpoint()` now uses `HOST_ENDPOINT_HINTS` (scrypted →
  `https://…:10443`). Already-added tiles are skipped; host-mode rows show · host · port.
  Wizard scan uses the same path.
- **Wind radar (Gust) — animated white streamlines:** Weerenradar delivers base map
  (JPEG) + **wind vector field** (`wind:N:png` in X-Custom-Body; R/G vs offset 85) +
  `windvalues` JSON. The white streaks on weerenradar.nl are a **particle animation**
  (~30 fps, overlay canvas) — not the PNG painted on the map (that broke the base map).
  Now: base map + km/u labels above particles + animation (dogfood OK).
- **p95 metrics missing on tiles despite a valid benchmark:** the run measures all running
  Docker containers, but a tile only showed CPU/RAM when the **display name** matched after
  stripping spaces and `-`. **Underscores (`_`) were left in place**, so e.g. *Immich Server*
  (`immichserver`) ≠ `immich_server`. API (`widgets/p95stats.js`) and frontend
  (`normalizeP95Key`) now share the same normalizer: strip spaces, `-`, and `_`, then
  lowercase. Divergent labels: set `containerName` (or compact + containerName).
- **Compact tile looked like an empty square** in a mixed grid: CSS grid stretched the chip
  to the row height of icon cards. Fix: `align-self: start`, `align-items: start` on the
  grid, status/menu/pin `position: static` in compact mode.
- **GitHub blob icon URLs** (`/blob/…` or `?raw=true`) are rewritten in `resolveIconSrc` to
  `raw.githubusercontent.com` (stable `image/*`). Icon-field helper mentions PNG/SVG/GIF/WebP
  + raw-URL tip (URL icons already worked; it was unclear).

## [v1.10.0] - 2026-08-15
### Added
- **Optional authentication (product feature):** set `AUTH_ENABLED=true` and `SESSION_SECRET` on
  config-api. First visit creates the admin account (email + password; Apple Passwords-friendly
  fields). Unauthenticated clients get **401** on `/api/*` (except `/api/health` and `/api/auth/*`).
  Multi-user per install: admin can `POST /api/auth/users`. Google/Microsoft/passkeys next.
  Default remains **off** so existing installs are unchanged.
- **Release popup** `optional-auth-remote-1.10.0` — optional login + safer remote access via reverse proxy (once max).
- **Auth via the UI (zero-config):** Settings → Security → “Secure this dashboard”. No compose edit; `SESSION_SECRET` auto-generated under `data/auth/`. Compose `AUTH_ENABLED=true|false` still works and locks the toggle.
- **Login UI:** overlay for first-run setup or sign-in; **Show/Hide** password toggle.
- **Docker endpoints via config-api:** containers/info/start/stop/restart no longer hit the Docker
  socket from the browser nginx path. Raw `/docker/` returns 404 so auth can protect actions.

### Fixed
- **Login loop on LAN HTTP:** session cookie was marked `Secure` because `AUTH_PUBLIC_URL` was
  https while logging in over `http://IP:8086`. Browsers drop that cookie → Enter returns to the
  login screen. `Secure` now follows the **request** (`X-Forwarded-Proto` / TLS), not only the
  public URL. Override with `AUTH_COOKIE_SECURE=true|false` if needed.
- **Empty dashboard without login screen:** a duplicate `const pw` in the auth overlay crashed the
  whole frontend (SyntaxError). No gate, no apps; `/api/config` returned 401. Fixed; a 401 on
  config now opens the login overlay instead of an empty “offline” config.

### Security
- Do not expose port 8086 to the internet without `AUTH_ENABLED=true` (or reverse-proxy auth).
- Auth status must not be treated as “auth off” on fetch failure (avoids silent empty 401 UI).

### Fixed — earlier bugs in (pre) 1.9.10, removed in 1.10.0
- **Docker scan produced unusable URLs (2026-08-12):** two bugs in one line.
  **(1) Wrong host** — the host came from `localStorage.hobbithole_nas_ip`, a key written by the
  Synology app-adder. Anyone who had ever added Synology apps got their NAS IP baked into every
  scanned tile, even though the container list comes from `/api/containers` on the dashboard host
  itself. That fallback is gone: explicit field, otherwise `window.location.hostname`.
  **(2) Wrong port + scheme** — `Ports.find(p => p.PublicPort)` took the first port from the Docker
  API and always prefixed `http://`. That array is not in compose order and lists every port twice
  (IPv4 + IPv6), so for images publishing both HTTP and HTTPS (linuxserver/kasm: 3000 + 3001) which
  one you got was chance — and `http://` against the TLS port returns `400 Bad Request`, which reads
  as "the tile is broken". New `pickEndpoint()` de-duplicates on `PublicPort` and **prefers the TLS
  port whenever the container publishes one** (`https://`), otherwise the lowest port over `http://`.
  HTTPS wins on purpose: such a link works from both an http and an https dashboard, whereas an http
  link from an https page dies as mixed content — the status ping first, so the tile reads offline
  while the container is running. Cost: one browser warning for self-signed certificates. Concretely,
  webtop now yields `https://host:3021` instead of `http://host:3020`.
- **Docker scan warns on a domain host:** when tiles are built on a hostname that is not an IP
  address they point at your reverse proxy rather than the container ports — the scan cannot know
  this, since Docker only reports port numbers. Instead of silently producing broken tiles, the
  scan result now carries a notice asking for the LAN IP.
- **Deleting a tile left its widget behind — API key included:** `deleteApp()` removed the app from
  its category and nothing else. `serverConfig.appWidgets[app.id]` stayed, an orphaned configuration
  you can no longer see or edit, holding that app's API key. Over a long-lived install these pile
  up — four here (sabnzbd, radarr, sonarr, jellyfin) belonging to a retired NAS. `deleteApp()` now
  clears the matching widget; it rides along in the same POST, so no extra round trip.
- **Existing orphans are cleaned up automatically:** the fix above prevents new ones, but anyone
  running an older install already has them and cannot reach them through the UI — no tile, no
  button. `pruneOrphanWidgets()` removes every widget whose tile no longer exists at startup, and
  only saves when something actually had to go. Deliberately in-app rather than a separate cleanup
  script: users would have to find and run that themselves, and the ones who need it most never
  hear about it. Safety brake: with no apps in any category, or a config that failed to load, it
  does nothing — otherwise a half-loaded config would wipe every widget.
- **A deleted tile could return after a refresh:** `pushCategoriesToServer()` opened with
  `if (!serverConfig) return;` — a silent skip. If the config API was not ready yet or briefly
  unreachable, the change landed in localStorage only, while on load the server wins
  (`syncCategoriesWithServer`). The tile was back after a refresh and nothing had ever been
  reported. The config is now loaded on demand, and if that fails a toast says the change is on
  this device only. Init is exempt via `_categorieSyncKlaar`, so the local cache cannot overwrite
  the server copy before the sync has decided.
- **App URL field (`//` / bare IP):** Add/Edit App modals used `input type="url"`, which blocked typing `//` mid-entry in many browsers. Now `type="text"` + `inputmode="url"`. On save (and when opening tiles) `http://` is prepended if no scheme is present — bare `192.168.x.x:port` no longer opens as a relative path on the dashboard host.
- **`/` shortcut ate slashes in URL fields:** global “press `/` → focus search” called `preventDefault` on every `/` except the search box itself. You could not type `http://` in Add/Edit App (or any other input). Shortcut now skips all `input`/`textarea`/`select`/contenteditable.

### Changed — lab/release tooling
- **Docker Hub README sync** — `hub-readme-sync.sh` updates full + short description via the free Hub API (dashboard + config-api). Invoked by `push.sh` after image push; can run standalone for README-only updates. Auth: `docker login` or `DOCKERHUB_*`.
- **Pre-build changelog** — strips the default “In progress” stub from the *release* section (keeps it only under `*-dev`).


## [v1.9.10] - 2026-08-06

### Added
- **Backgrounds via config-api (cross-device)** — Static, dynamic (5 slots) and live wallpaper stored as **files** under `/app/data/wallpapers/` via `POST /api/wallpapers/:slot`. `config.json` keeps only light URL refs. Domain/IP/browsers share the same look. Migration: existing localStorage data-URLs are uploaded once.
- **Wallpaper sync status** in Settings — “synced” vs “this device only” when config-api is offline.
- **Config-api release popup** — Announcement `config-api-required-1.9.10` for early installs missing the API (once max).
- **Live wallpaper GA** — Flag on by default; video max ~20MB on the server (no more base64 in localStorage).

### Fixed
- **Container buttons missing on many tiles** — Start/Stop/Restart only appeared when the host port from the tile URL showed up in Docker's port list. Second step: match on container name or compose service label (works while stopped / host network / domain tiles).
- **Weather-radar widget: CSS stretch on size change** — `ResizeObserver` + `onResize` → full re-paint.
- **Release popup kept reappearing** — (from 1.9.9-build-1) important updates at most once.

### Changed
- **Weather-radar widget layout (large)** — Map fills body, overlay layer chips, tighter zoom; S emoji-only.
- **Config POST guard** — Large `data:` URLs in config.json rejected (413); use `/api/wallpapers`.

## [v1.9.9-build-1] - 2026-08-01

### Fixed
- **Release popup kept reappearing** — The weather-backdrop announcement (v1.8.5) kept showing for some users. That is over: important updates/fixes now appear **at most once**, are marked seen immediately, and will not return (also after refresh, another device, or domain vs IP).

## [v1.9.9] - 2026-08-01

### Added
- **Canvas mode cross-device** — `canvasMode` now lives in server config (not only localStorage). Domain vs IP / browsers share the same toggle; existing localStorage preference migrates on first load.
- **Changelog i18n** — English UI loads `CHANGELOG.en.md`; Dutch stays on `CHANGELOG.md`. Other languages fall back English → NL.
- **Global radar (RainViewer)** — Outside Europe (and when Weerenradar fails), Live Radar / the home widget load worldwide precipitation via the [RainViewer](https://www.rainviewer.com/) tile API. Auto-select: Europe → Weerenradar first; elsewhere → RainViewer first. Uses your configured lat/lon (US, Asia, AU, …).
- **Weerenradar overlay set** — Live Radar uses the same snippet layer groups as [weerenradar.nl](https://www.weerenradar.nl): **Rain** (`RegenRadar`), **Clouds** (`CloudRadar`), **Temp** (`Temperature`), **Wind** (`Gust`), **Lightning** (`Lightning`), **Weather** (`WetterRadar`). API: `tiles.wo-cloud.com/snippet-tiles`.
- **Temperature labels on the Weather map** — On the **Weather** layer (and **Temp**) city markers, place names and **°C** are drawn at the official `cities[]` positions. Temperatures come from composite-tile metadata (`X-Custom-Body: temperature:N:json`), same as on weerenradar.nl.
- **Zoom UI** — Dedicated zoom controls (`+` / level / `−`, range 5–10) with a live zoom label; default zoom ≈ 7 (like the weerenradar URL).
- **Home widget “Weather Radar”** — Standalone home widget (`weather-radar`) with the same Weerenradar engine: layer switching, zoom, 5‑min auto-refresh. Add via **Settings → Home Widgets**. Config: default layer, zoom, map height. Shared engine: `paintRadarView()` (expanded panel + widget).

### Fixed
- **Layer toggles not visible live** — Stale Docker bind-mount (old inode of `index.html`); container restart remounted the current file. Tab selector scoped to `.weather-tab-buttons` so layer active state is no longer cleared.
- **Clouds “not supported”** — RainViewer infrared feed was empty; replaced by **Weerenradar CloudRadar**, fallback **Buienradar** NL satellite (`processing-cdn.buienradar.nl/.../satellite/europe/combined/NL/`).
- **Zoom buttons broken** — `+`/`−` accidentally used `.btn-action` (`width: 100%` meant for form buttons). Replaced with `.radar-zoom-btn`.
- **Radar render** — Loading overlay no longer blocks buttons (`pointer-events: none`); race guard on fast zoom/layer switches; composite tiles load via `fetch` + metadata strip so trailing JSON does not break image decode.

### Changed
- **Precipitation engine** — Europe: Weerenradar snippet → XYZ → RainViewer. Worldwide: RainViewer first. Zoom 5–11.
- **Map height** — Live Radar panel ~300px for more room for overlay chips + labels.
- **Dynamic canvas height** — In canvas mode `#standalone-widgets` grows with the lowest widget so the footer (Powered by / version changelog) is no longer covered by absolute widgets.

## [v1.9.8] - 2026-08-01

### Added
- **Buienradar JSON Integration** — Support for the official Buienradar feed (`data.buienradar.nl/2.0/feed/json`). Automatically fetches current station readings from the nearest weather station (e.g. Berkhout for Hoorn/West-Friesland) for temperature, feels-like, wind and weather description.
- **2-hour precipitation chart widget** — Expandable 2-hour precipitation forecast in the weather panel via the Buienradar GPS endpoint (`gps.buienradar.nl/getrr.php`). Renders a clean glassmorphic bar chart with intensity in mm/h and a forecast summary.
- **Live High-Res Tile Radar Canvas** — Integrated HTML5 Canvas radar engine that loads live precipitation tiles from Weerenradar.nl (`cdn.weerenradar.nl/radar/tiles/periodCurrentHighRes/`). Includes CartoDB Dark basemap, zoom buttons and an exact GPS location marker.
- **Live satellite & cloud layer** — Layer selector buttons (`[ Precipitation ]` vs `[ Clouds ]`) on the radar canvas to switch between precipitation intensity and a live infrared satellite cloud layer.
- **Provider selector in Settings** — Choose in weather settings between `Automatic (Buienradar for NL + Open-Meteo fallback)`, `Buienradar JSON` or `Open-Meteo API`.

### Changed
- **Symmetric segmented header** — Header of the expanded Weather & Radar card redesigned as a clean, symmetric 3-column segmented control (`7-day` | `2h Rain` | `Live Radar`).

## [v1.9.6] - 2026-06-30

### Added
- **USB eject host documentation** — Added a detailed guide (`docs/USB_EJECT.md`) for configuring the host-side watcher in SIGNAL mode on different platforms (Debian/Ubuntu/Proxmox met Systemd, en Synology DSM met de Task Scheduler). The main README.md was also updated with a direct link.
- **Theme home layouts** — Each theme now ships its own widget layout (`homeLayout`) for the Home tab. When switching themes the user is asked whether to adopt that layout. Your own layout is backed up and restored when returning to "My own style". The 4 bundled themes each have a distinct character:
 - Classic Tiles: Balanced (clock, bookmarks, notes, system-info).
 - Glass Ocean: Living room (large clock, calendar, bookmarks, notes) with immersive weather.
 - Midnight Neon: Monitoring-first (large system-info, watchtower, quickstats, compact clock).
 - Nordic Frost: Minimal (clock, bookmarks, calendar — few widgets, more calm).

## [v1.9.5] - 2026-06-17
### Added
- **Showcase media & documentation** — Fully updated documentation with GIFs and screenshots of cinematic weather effects, lightning and widgets.
- **Command mapping** — Stop action for Proxmox VMs/containers mapped to graceful shutdown.

### Changed
- **i18n synchronization** — Further alignment and sync of all i18n translation files.
- **Healthcheck** — API container healthcheck port mapping corrected to port 3000.

## [v1.9.4] - 2026-06-16
### Added
- **VM & Service Control Widget** — A fully generic widget replacing the old Proxmox widget. Now supports Proxmox VE API, systemd services and custom commands (local or remote via SSH).
- **Multi-VM & Container Lijst** — Support for multiple Proxmox VM/LXC IDs (comma-separated). Shows a compact status list with individual Start/Stop buttons, uptime and CPU/RAM stats per machine in one widget.
- **Nginx API Proxying** — Routing added for the `/api/vmservice/` endpoints in the reverse proxy.
- **Command Palette Snelkoppelingen** — 'Edit home layout (Canvas mode)' and 'Manage home widgets' added to the Command Palette (Cmd+K / Ctrl+K) for easier discovery of edit options.
- **Global language switcher** — A floating language button in the top-left of the dashboard. Users can switch language (Dutch, English, German, French, Spanish) without opening Settings. Syncs with the active language.

### Changed
- **Dashboard-wide internationalization (i18n)** — All remaining hardcoded strings in `index.html` (app picker, Docker scanner, calendar, bookmarks, RSS feed, VM actions, USB management and system benchmarks) replaced with dynamic `t()` calls.
- **Translation file synchronization** — All translation files (`nl.json`, `en.json`, `de.json`, `fr.json`, `es.json`) fully synced and filled with missing settings and USB/service keys. Each file now has exactly 308 keys.

### Fixed
- **Dynamic canvas height** — Fixed widgets on the Home tab overflowing the parent container and overlapping lower elements. Container height is now computed dynamically from widget positions and heights (via `ResizeObserver` and drag listeners).
- **Home widgets translation** — Title and description of the Home Widgets section in Settings were hardcoded Dutch (with broken multi-language). Moved to the i18n system (`data-i18n`) and translated for all supported languages (NL, EN, DE, FR, ES), including a grammar fix ("synced across all your devices").

## [v1.9.3] - 2026-06-14
### Added
- **Universal USB eject architecture** — Support for multiple eject methods via `USB_EJECT_METHOD`. 
 - `signal` (default): Safe async system via host scripts.
 - `native`: Direct unmount from the container (requires `privileged: true`).
- **Automated GitHub pipeline** — New `./github-push.sh` script and release-flow integration. Syncs source, tags and docs to GitHub automatically.
- **Auto-sync footer version** — The footer in `index.html` now auto-syncs with the `APP_VERSION` constant in JavaScript.

### Changed
- **Repository cleanup** — .gitignore optimized to keep management scripts and roadmap private on GitHub while source stays public.

## [v1.9.2] - 2026-06-14
### Added
- **USB management widget** — New standalone widget for safely managing USB sticks and external SSDs. Realtime feedback while ejecting ("Busy...") and a success message ("Safely removed").
- **Safe USB eject architecture** — Async signal system between container and host. Runs `sync`, `umount` and `udisksctl power-off` on the Proxmox host for data integrity.
- **Live p95 resource metrics** — Each container tile now shows p95 CPU and RAM from the latest system benchmark. Use `?ff=metricsP95` to test.
- **Standardized monitoring tooling** — New monitoring framework writing to a central stats directory. Feeds the new metrics section on the dashboard.
- **USB API Endpoints** — New backend endpoints: `GET /api/usb/list`, `POST /api/usb/eject` en `POST /api/usb/clear-ejected`.

### Changed
- **Node.js compatibility** — `config-api` now runs on Node 18 (`node:18-alpine`) for compatibility with older server environments.
- **Healthcheck update** — API container healthcheck corrected to the right internal port (3000).
- **Storage conventions** — Benchmark results and logs moved to a standardized location to keep the host clean.

## [v1.9.1] - 2026-05-17
### Fixed
- **Static wallpaper cross-device sync** — `hobbithole_bg` is now also stored in `serverConfig.wallpaper` via `/api/config`. After clearing site data or on a new device the wallpaper is restored from the backend instead of "no background". Dynamic + live wallpapers stay localStorage-only until v2.0 (too large for JSON config sync; separate endpoint planned).
- **Default IP fallbacks removed** — Hardcoded `192.168.1.169` fallbacks replaced with `window.location.hostname`. Placeholders are generic (`192.168.1.x`, `your-server`). Works out of the box on any host without first setting Docker IP.

## [v1.9.0] - 2026-05-16
### Added
- **Theme Engine (achter `?ff=themeEngine`)** — first step toward v2.0 "Home Experiences". Themes are JSON presets in `themes/<id>.json` applied as a CSS overlay on `<html>`. User accent/transparency in localStorage stays untouched, so "My own style" always restores correctly. Active theme is cross-device synced via `serverConfig.themeId` — pick on desktop, see it on mobile. Enable via Settings → Appearance → **Theme Experience**.
- **4 first-party themes** — `Classic Tiles` (the v1.x baseline look, familiar for existing users), `Glass Ocean` (deep blue with lots of blur and rounded corners), `Midnight Neon` (dark with pink accent and sharp edges), `Nordic Frost` (minimal grey-blue with extra-large rounded corners).
- **`themes/SCHEMA.md`** — full schema docs for community contributors: all fields, CSS variables, weatherBackdrop enum, validation rules, sample theme. Prep for the v2.0.D community theme ecosystem.
- **Theme API endpoints** — `GET /api/themes` (list, skip malformed) and `GET /api/themes/:id` (full theme). Both proxied via nginx to config-api.
- **Canvas Mode is now GA** — `?ff=canvasMode` is gone; the Canvas Mode toggle is always visible in Settings. Smart placement (v1.8.5) and size buttons (v1.8.2) made the feature production-ready.

### Changed
- **Schema-veld `weatherBackdrop` is now a strict string enum** (`"off"` / `"subtle"` / `"standard"` / `"immersive"`) instead of mixed boolean/string. Schema contract for v2.0.D community themes is now clear.
- **Reserved fields in theme schema** — `homeLayout`, `liveWallpaper`, `widgetVariants` are now `null` placeholders in each theme so v2.0 can fill them without breaking existing community themes.

### Security
- **Path-traversal hardening** on `/api/themes/:id` — id validated against `^[a-z0-9-]+$` (else 400 `invalid_id`), separate error paths for read/parse failures, malformed theme files no longer crash the listing.

### Fixed
- **Show-stopper: missing comma in FEATURE_FLAGS object** caused a SyntaxError in the whole inline script — dashboard rendered nothing. Comma restored; parse check passes.
- **Theme-engine plumbing** — `themes/` directory was not bind-mounted into the config-api container and `/api/themes` had no nginx proxy block (404). Both wired in `docker-compose.yml`, `default.conf` and `Dockerfile.config-api` so the feature works end-to-end.

## [v1.8.6] - 2026-05-16
### Added
- **Dynamic wallpapers (macOS-style)** — Support for 5 image slots that switch automatically by time of day (Early Morning, Day, Sunset, Evening, Night). Build your own Dynamic Desktop feel in the homelab.
- **Wallpaper-aware cinematic FX** — When a wallpaper (static, dynamic or video) is active, the dashboard hides the sky gradient. Only weather elements (clouds, rain, snow, lightning) are composited over your wallpaper for a seamless cinematic look.
- **Toggle: weather elements** — New master toggle in Settings to enable/disable weather effects (clouds, rain, snow, lightning) separately from the sky gradient.
- **Toggle: sky layer** — The Cinematic Backdrop toggle now specifically controls the sky layer (gradients, stars, sun and moon).

### Changed
- **Refactoring: UI/sky layering** — Sky and weather layer code fully rewritten to work better with the new wallpaper options. Better performance and fewer glitches when switching themes.
- **Smart backdrop logic** — Smarter detection of active backgrounds to avoid unnecessary canvas work.

## [v1.8.5] - 2026-05-12
### Added
- **Cinematic weather backdrop is now GA** — Apple Weather-style backdrop is out of feature flag and on by default. Sky color follows real weather + time of day (warm sunrise, day blue, sunset purple, night deep navy), volumetric clouds with two-pass shading, stars on clear nights, lightning in storms. Includes the v1.8.4 performance fix (sprite caching, ~50× fewer canvas ops per frame). **Not your thing? Disable via Settings → Customize → Cinematic backdrop.** Cross-device synced via `serverConfig.weatherBackdrop`.
- **First-run release modal** — new mechanism for "what's new" pop-ups on major releases. Shows once per user per announcement id, dismissable, stored in `hobbithole_dismissed_announcements`. First use: cinematic backdrop GA announcement. Future releases can add one line to `RELEASE_ANNOUNCEMENTS`. Dev hack: `#reset-announcements` clears the seen list.

### Changed
- **Canvas mode smart placement** (achter `?ff=canvasMode`) — new widget blocks land in the first free slot via a snap-grid first-fit packer (top→bottom, left→right). Previously they always stacked in the left column even when space was free. Fills side-by-side and below until full, then continues downward.
- **Watchtower "Last scan" display** — now shows real completion time (not click time) by detecting scan completion via `scans_total` metric bumps. Works for manual clicks and Watchtower cron scans. Plus context: "Just now (22 checked, 2 updated)" instead of a vague "earlier today".

## [v1.8.4] - 2026-05-11
### Added
- **Watchtower widget** — trigger Docker container updates from the dashboard. Click **Scan now** → Watchtower checks images on Docker Hub → live stats ("Containers: 22 · Last scan: 2h ago · Updates total: 0"). Auto-refresh every 30s. One-time HTTP API enable in Watchtower compose (`WATCHTOWER_HTTP_API_UPDATE=true` + token + dashboard_net) — empty state shows a step-by-step setup guide with a copy-paste compose snippet. Backend: `POST /api/watchtower/scan` + `GET /api/watchtower/metrics` via Bearer token.
- **Settings → External services section** — new collapsible section for third-party service config (Watchtower now, Prometheus/Grafana later). Watchtower card with URL + masked token + Test connection + Save. Cross-device synced via `serverConfig.watchtower`. Each card collapses individually — scales to 10+ integrations without a long Settings list.
- **Live wallpaper** (behind `?ff=liveWallpaper`, desktop only) — upload an optimized MP4/WebM loop (5–15s, <10MB) as bottom-layer background. Auto-disabled on mobile (battery/data). Upload UI in Settings → Background with size warnings + ffmpeg tip. **Bonus if `?ff=cinematicWeather` is on**: video becomes the sky; only weather particles composite on top — no day/night gradient over the video. Pure film vibe.

### Changed
- **Cinematic weather clouds rewrite** (only with `?ff=cinematicWeather`) — Apple Weather-style volume with two-pass shading (subtle blue-grey underside + bright sunlit top), top-biased puff layout for the classic flat-bottom / puffy-top cumulus silhouette. Clouds sit higher (upper 65%), larger, more puffs per cloud. No more flat blobs.
- **Cinematic FX performance** (only with `?ff=cinematicWeather`) — pre-bake cumulus clouds to offscreen canvas sprites. Render loop does `drawImage` per cloud instead of 16 radial gradients. ~50× less per-frame work; fixed scroll stutter from the voluminous look. Lighter mobile load when the FF is on.

### Fixed
- **Mobile app drag misfire** — scrolling or tapping could accidentally reorder apps. SortableJS now uses `delay: 500ms` on touch (`delayOnTouchOnly: true`) — long-press to reorder, instant on desktop. Matches iOS/Android home-screen patterns.

## [v1.8.3] - 2026-05-11
### Added
- **Container quick actions** — via the ⋯ menu on each tile you can **start**, **stop** or **restart** Docker containers without Portainer or SSH. Buttons only appear on tiles mapped to a Docker container (port matching). Stopped containers show Start; running show Stop + Restart. Stop/Restart ask for confirmation. Toast feedback; status dot refreshes after 3s. **Self-protection**: Hobbithole's own containers never show actions. Backend: `POST /api/container/{id}/{action}` via Docker socket; container list cached 5s.

### Changed
- **Title + subtitle now sync cross-device** — custom title and subtitle lived in localStorage (per device) and disappeared after switching browsers or clearing site data. Now stored via `/api/config` like categories and weather. localStorage remains an offline cache. One-time migration pushes existing local values to the server on first load.
- **Info note on Background setting** — background stays local for now because base64 images grow to MBs quickly. Settings now explains why, the risk of clearing browser data, and links to Backup & Restore. Cross-device background is on the roadmap.

### Fixed
- **Mobile Edge caches `index.html` too aggressively, misses updates** — without cache-control headers, mobile browsers (especially Edge) treated HTML as permanently cacheable, so after updates users only saw the new version after clearing cache or going incognito. With 450+ Docker Hub pulls that is a real product issue. Nginx now serves `Cache-Control: no-cache, must-revalidate` on static content so the browser revalidates every load (304 if unchanged, fresh HTML if updated).

## [v1.8.2] - 2026-05-11
### Added
- **Rebalanced S/M/L sizes — actually larger, and grow in height too** — M felt too small and widgets only grew horizontally while content often stacks vertically (RSS, calendar, bookmarks). New sizes: S=240×0.7h, M=360×1.0h (was 320), L=540×1.6h. L shows ~2× more content than M. Heights scale from widget-type default × multiplier.
- **Refresh button on data widgets** — RSS, Calendar and Quick Stats get a header refresh button that bypasses server cache. Use case: you just published a post and want it in RSS now (else wait 30 min). Endpoints accept `?refresh=1`.
- **Per-widget default heights in canvas mode** — new widget blocks land at a height that fits their content. RSS → 320px (~5 items), Calendar → 280px, System Info → 220px, Bookmarks → 240px, Notes → 200px, Clock → 160px, Quick Stats → 160px, Iframe → 320px. Less manual resizing.
- **"What's new" changelog modal** — click the version number in the footer (or Command Palette → "Release notes") to open the full CHANGELOG in a glass UI modal. **NEW badge** appears next to the version until you open it. CHANGELOG.md was already baked into the image — now visible to users. Simple markdown renderer (## versions, ### sections, **bold**, `code`) — no external library.
- **Feedback & suggestions section in Settings** — direct GitHub buttons for bug reports, feature ideas and the full issues list. Lower barrier for feedback — important as the Hobbithole community grows.
- **Friendly empty state on Home tab** — if you have no widgets and no pinned apps, Home shows a welcome hero with an "Add your first widget" CTA to the Settings picker. Home tab is always visible so new users discover the canvas.

### Fixed
- **Grid guide sometimes stayed visible after drop in canvas mode** — pointer listeners lived on the drag handle. Releasing outside (or losing capture) skipped pointerup → stuck drag state → grid stayed visible. Move/up listeners now on `window` during drag — cleanup always happens.
- **RSS widget always showed max 5 items regardless of size** — frontend hard-coded `slice(0, 5)`. Now shows all items (server fetches 20); body scrolls. Small = scroll for more; Large = all visible. Size buttons actually matter on RSS.
- **Size buttons did not work in canvas mode** — S/M/L only toggled CSS class; inline width/height used by canvas mode were not updated. Now both width and height update on size change.
- **Canvas mode widget overflow** — content-heavy widgets (RSS, long notes) overflowed canvas height without overflow containment. Content is now clipped; body scrolls when needed. Grid mode unchanged. CSS-only fix.

## [v1.8.1] - 2026-05-11
### Fixed
- **Smart wizard skip cross-browser** — wizard reappeared on every new browser even when the dashboard was full. It now checks server-side `categories` first. Apps on the server → no onboarding. Important for multi-device use.

### Added
- **Inline widget rename** — double-click any standalone widget title → editable input → Enter to save, Escape to cancel. Empty or same text reverts to default label. Works for current and future widgets. No modal.
- **Collapsible setting sections** — three tool sections not everyone uses (Synology Apps, Heimdall Import, Homarr Import) are collapsible in Settings. Collapsed by default; choice persisted per section in localStorage. Less scrolling.

## [v1.8.0] - 2026-05-10
### Added
- **Widget size buttons (S/M/L)** — every standalone widget has S/M/L controls in the header. Small = 1 column, Medium = 2 columns, Large = full row. For denser or wider layouts. Mobile: always full-width (size buttons hidden).
- **App-widget blocks** — apps with widget data can be placed as large Home blocks. Rich rendering: large app icon, name, primary value LARGE, secondary stats grid. Two ways to add: Settings → Home Widgets → "App as widget", or app ⋯ menu → "Pin on canvas". Auto-updates when widget data arrives.

### Changed
- **Home tab is now a real home screen** — widgets only appear on the Home tab (not across all tabs). Home tab is always visible once you have widgets or pinned apps. All/category tabs = pure app catalog.
- **CSS Grid layout** for standalone widgets (was flex) — foundation for future free-placement canvas. No visual change.

## [v1.7.3] - 2026-05-10
### Added
- **Image widget** — show an image on your dashboard. Paste a URL and/or upload a file (max 500KB, stored as base64 in config — for larger images a URL is better). Optional click link and caption.
- **Iframe embed widget** — embed any URL as a live frame (Grafana panel, custom dashboard, monitoring page). Configurable height. Works best with homelab tools that do not block X-Frame-Options.
- **Quick Stats widget** — shows one live number from a custom HTTP endpoint. Configurable API URL + optional JSON path (e.g. `data.cpu`) + label + unit. Server-side fetch via `/api/quickstat`, 5 min cache. Works with JSON and plain text.
- **`image-upload` veld-type** in the generic widget config modal — reusable for future widgets that need an image (background, logo, profile photo). URL field + upload button with size validation.

### Fixed
- **Command palette tap-bug op mobiel** — selecting items via tap failed. The `onmouseover` handler re-rendered fully so the target disappeared mid-tap. Replaced with `onmousemove` + light class toggle (no re-render). Works the same on desktop and mobile.

## [v1.7.2] - 2026-05-09
### Added
- **System Info widget** — Docker stats as a first-class widget block: running/total containers, images, CPUs, memory + Docker version. Refresh every 30s. Replaces the old fixed top bar.
- **Bookmarks widget** — list of quick links in one widget. Inline +/- editing (name, URL, optional emoji), auto-prepends `http://` if missing. Cross-device sync.
- **RSS feed widget** — shows 5 headlines from an RSS 2.0 or Atom feed with relative time ("2h", "3d", date if older). Server-side fetch + parse via `/api/rss`, 30 min cache. Mini-parser handles CDATA and HTML entities.

### Changed
- **Top-bar verwijderd** — the fixed system-info bar at the top is gone. Same info lives in the relocatable widget — fits the v2.0 customizable Home canvas direction.

## [v1.7.1] - 2026-05-08
### Added
- **Calendar widget** — shows 5 upcoming events from an ICS feed (Google Calendar, iCloud, Outlook, Synology Calendar, Nextcloud — anywhere you can export ICS). Server-side fetch + parse via `config-api` (no CORS, 10 min cache per URL). "Today · 14:00 — Meeting" style with date-aware labels (Today/Tomorrow/Wed 13 May).
- **Drag-and-drop for home widgets** — drag widgets into any order via the `⋮⋮` handle in the widget header. Order is stored server-side, consistent across devices.
- **Generic widget config modal** — reusable modal for widgets with settings (Calendar uses it for the ICS URL). Future widgets plug in via `configSchema` on the widget definition.
- **Settings button** on widgets with configSchema — click in the widget header to edit config without remove + re-add.

### Fixed
- **ICS timezone parsing** — events with `TZID=Europe/Amsterdam` convert correctly to UTC with DST-aware offsets via `Intl.DateTimeFormat`. Non-UTC events previously showed 1–2 hours off.

## [v1.7.0] - 2026-05-08
### Added
- **Standalone widget architectuur** — a new section above categories for widgets not tied to a tile (clock, notes, etc.). Foundation for the v2.0 customizable Home canvas. Widget types self-register via a registry so future widgets can land incrementally.
- **Clock widget** — live time (HH:MM:SS, tabular-nums for stable display) + date in your dashboard language. Ticks every second, no config needed.
- **Notes widget** — sticky note with textarea, auto-save (debounced 400ms), cross-device synced via `config.json`. Write on PC, see it on phone after refresh.
- **Home Widgets section** in Settings — visual grid of clickable widget cards (icon + name + description). Click = add. Scales to dozens of widget types without drowning the UI.
- **`homeLayout` schema** in `config.json` — empty array for now; foundation for v2.0 Home canvas with positions, sizes and variants. No breaking changes for existing users.

## [v1.6.1] - 2026-05-08
### Fixed
- **Cross-device sync works now properly** — pinned apps + per-app widget API keys were local to the device because `categories` was stored in localStorage. Fixed by moving to `config.json` on the server.
- **Migration**: Automatic one-time migration on first load.

## [v1.6.0] - 2026-05-07
### Added
- **Feature flag system** — Infrastructure for in-progress features. Activate via `?ff=<name>`.

## [v1.5.0] - 2026-05-07
### Added
- **Multi-page dashboards (tabs)**: Home, All, and category tabs.
- **Backup & Restore**: Export/import settings as JSON.

## [v1.4.0] - 2026-05-07
### Added
- **Live App Widgets**: Sabnzbd, Pi-hole, Sonarr, Radarr, Jellyfin.
- **Command Palette**: `Cmd+K` / `Ctrl+K`.

## [v1.0.0] - 2026-05-04
- Initial release.
