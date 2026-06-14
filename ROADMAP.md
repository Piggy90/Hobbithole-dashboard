# Hobbithole Dashboard — Strategic Roadmap

Dit document beschrijft de weg van de huidige v1.8.x serie naar de grote v2.0 release.

---

## 🛠 Direct openstaand (v1.8.x staart)

De focus ligt hier op het polijsten van de bestaande v1.8 features zodat ze 'product-ready' zijn zonder feature flags.

- [x] **canvasMode FF-removal** — Canvas Mode is GA in v1.9.0. Toggle staat altijd in Settings.
    - [ ] Announcement-modal entry toevoegen voor Canvas Mode (post-launch UX).
    - [ ] "Edit Home" toggle beter vindbaar maken (UX).
    - [ ] Beslissing: standaard aan of uit (huidige stand: opt-in via toggle).
    - [ ] Experimenteren met resize handles (naast de S/M/L knoppen).
- [ ] **v1.9.1+ / v1.9.x** — Laatste bugfixes en UX verfijningen vóór v2.0.

---

## 🎨 v1.9.x — De Themes-track

Dit is de voorbereiding op de visuele revolutie van v2.0. Thema's worden 'Home Experiences'.

- [x] **v1.9.0 — Theme Schema & PoC** (achter `?ff=themeEngine`)
    - [x] `themes/<id>.json` schema gedefinieerd + gedocumenteerd in `themes/SCHEMA.md`.
    - [x] `GET /api/themes` + `GET /api/themes/:id` endpoints met id-validatie en parse-error handling.
    - [x] 4 first-party themes: Classic Tiles (v1.x baseline), Glass Ocean, Midnight Neon, Nordic Frost.
    - [x] Theme picker UI in Settings → Vormgeving → Thema Experience.
    - [x] Cross-device sync via `serverConfig.themeId` (geen localStorage-regressie).
    - [ ] FF-removal naar GA — afwachten tot Piggy alle 4 themes getest heeft op desktop + mobile.
- [ ] **v1.9.1 — Theme Catalogus Uitbreiden**
    - [ ] Extra themes (kandidaten resterend: Glass Dashboard, Media Center — Media Center wacht op v2.0.G widgets).
    - [ ] Screenshots / preview images aan bestaande themes toevoegen.
    - [ ] Optie om themes te bundelen met een `bg.mp4` live wallpaper (`liveWallpaper` veld in schema is gereserveerd).
- [ ] **v1.9.2 — Theme Picker UI v2**
    - [ ] Visuele preview (screenshot per theme), filtering op tags, "remix this theme" knop.

---

## 🚀 v2.0.0 — De Flip

De grote mijlpaal waarbij het dashboard transformeert naar een personal OS canvas.

- [ ] **Nieuwe Onboarding Wizard** — Integratie van de Theme Picker in de first-run flow ("Choose your Home experience").
- [ ] **Officiële Launch** — Verwijderen van alle v1.x legacy paden waar mogelijk.

---

## ✅ Al binnen voor v2.0

Deze features zijn al geïmplementeerd en maken deel uit van de v2.0 visie:
- [x] **Cinematic weather GA** (v1.8.5) — Dynamische lucht en wolken.
- [x] **Live wallpaper infra** (v1.8.4) — Video backgrounds.
- [x] **Dynamic wallpaper** (v1.8.6) — 5 slots macOS-stijl rotatie.
- [x] **Announcement modal mechanisme** (v1.8.5) — Voor release communicatie.
- [x] **Canvas smart placement + size buttons** (v1.8.2/1.8.5).
- [x] **Live status dots** — Groen/rood pings op tegels.
- [x] **Container quick actions** — Start/stop/restart containers.

---

## ⏳ Post-2.0 Backlog (Bewust NIET in MVP)

Features die we bewaren voor na de grote release:
- **Big wallpaper sync** (v2.0.X) — Live (video) + Dynamic (5-slot) wallpapers cross-device syncen via aparte `/api/wallpapers` endpoint met files in `/app/data/wallpapers/`. Houdt config.json licht. Static wallpaper sync is sinds v1.9.1 al actief via `serverConfig.wallpaper`.
- **Community theme ecosystem** (v2.0.D) — Upload & Validator.
- **Shell widget** (v2.0.E) — Preset commando's uitvoeren.
- **Observability widgets** (v2.0.F) — Prometheus/Grafana integratie.
- **Media Wall widgets** (v2.0.G) — Recently Added, etc.

---
*Laatst bijgewerkt: 16 mei 2026*
