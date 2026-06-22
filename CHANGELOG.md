# Hobbithole Cinema Dashboard - Changelog

## [v1.9.5-dev] - 2026-06-17
### In uitvoering (In Progress)
- Nieuwe features voor de volgende release.
## [v1.9.4] - 2026-06-16
### Toegevoegd (Added)
- **🖥️ VM & Service Control Widget** — Een volledig generieke widget ter vervanging van de oude Proxmox-widget. Ondersteunt nu Proxmox VE API, Systemd Services en Custom Commandos (zowel lokaal als remote via SSH).
- **📋 Multi-VM & Container Lijst** — Ondersteuning voor het opgeven van meerdere Proxmox VM/LXC ID's (komma-gescheiden). Toont een compacte statuslijst met individuele Start/Stop knoppen, uptime en CPU/RAM statistieken per machine in één widget.
- **🌐 Nginx API Proxying** — Routering toegevoegd voor de `/api/vmservice/` endpoints in de reverse proxy.
- **⚡ Command Palette Snelkoppelingen** — 'Home-indeling bewerken (Canvas mode)' en 'Home widgets beheren' toegevoegd aan het Command Palette (Cmd+K / Ctrl+K) voor betere vindbaarheid van edit-opties.
- **🌍 Globale Taalswitcher** — Een handige, zwevende taalknop toegevoegd in de linkerbovenhoek van het dashboard. Hiermee kunnen gebruikers direct de taal wisselen (Nederlands, Engels, Duits, Frans, Spaans) zonder in de instellingen te hoeven duiken. De knop synchroniseert automatisch met de actieve taal.

### Verbeterd (Changed)
- **🌍 Dashboard-brede Internationalisering (i18n)** — Alle resterende hardcoded teksten in `index.html` (zoals app-kiezer, Docker-scanner, agenda, bookmarks, RSS-feed, VM-acties, USB-beheer en systeem-benchmarks) vervangen door dynamische `t()` vertaal-aanroepen.
- **📚 Synchronisatie Vertaalbestanden** — Alle vertaalbestanden (`nl.json`, `en.json`, `de.json`, `fr.json`, `es.json`) volledig gesynchroniseerd en aangevuld met ontbrekende instellingen- en USB/Service-sleutels. Elk bestand bevat nu exact 308 vertaalsleutels.

### Opgelost (Fixed)
- **🎨 Dynamische Canvas Hoogte** — Probleem opgelost waarbij de widgets op de Home tab buiten de parent container overflowden en lagere elementen overlapten. De containerhoogte wordt nu dynamisch berekend en aangepast op basis van de widgetposities en -hoogtes (met behulp van een `ResizeObserver` en drag event listeners).
- **🗣️ Home Widgets Vertaling** — De titel en omschrijving van de "Home Widgets" sectie in de instellingen waren hardcoded in het Nederlands (inclusief incorrecte meertaligheid). Deze zijn nu overgezet naar het i18n-systeem (`data-i18n`) en netjes vertaald naar alle ondersteunde talen (NL, EN, DE, FR, ES), inclusief een grammaticale verbetering ("gesynchroniseerd tussen al je apparaten").


## [v1.9.3] - 2026-06-14
### Toegevoegd (Added)
- **🌍 Universele USB Eject Architectuur** — Ondersteuning voor meerdere eject-methoden via `USB_EJECT_METHOD`. 
    - `signal` (standaard): Veilig asynchroon systeem via host-scripts.
    - `native`: Direct ontkoppelen vanuit de container (vereist `privileged: true`).
- **🔗 Geautomatiseerde GitHub Pipeline** — Nieuw `./github-push.sh` script en integratie in de release flow. Synchroniseert broncode, tags en documentatie automatisch met GitHub.
- **🔄 Auto-Sync Footer Versie** — De footer in `index.html` synchroniseert nu automatisch met de `APP_VERSION` constante in de JavaScript code.

### Verbeterd (Changed)
- **🧹 Repository Opschoning** — .gitignore geoptimaliseerd om beheer-scripts en roadmap privé te houden op GitHub terwijl de broncode publiek is.

## [v1.9.2] - 2026-06-14
### Toegevoegd (Added)
- **⏏️ USB Beheer Widget** — Nieuwe standalone widget voor het veilig beheren van USB-sticks en externe SSD's. Bevat realtime feedback tijdens het ontkoppelen ("⏳ Bezig...") en een succes-melding ("✅ Veilig verwijderd").
- **🔌 Veilige USB Eject Architectuur** — Asynchroon signaal-systeem tussen container en host. Voert `sync`, `umount` en `udisksctl power-off` uit op de Proxmox host voor maximale data-integriteit.
- **📊 Live p95 Resource Metrics** — Elke container-tile toont nu direct de p95 CPU- en RAM-waarden uit de meest recente systeem-benchmark. Gebruik `?ff=metricsP95` om te testen.
- **🛠️ Gestandaardiseerde Monitoring Tooling** — Nieuw monitoring framework met output naar een centrale stats directory. Dit framework voedt de nieuwe metrics-sectie op het dashboard.
- **🛠️ USB API Endpoints** — Nieuwe backend endpoints: `GET /api/usb/list`, `POST /api/usb/eject` en `POST /api/usb/clear-ejected`.

### Verbeterd (Changed)
- **📦 Node.js Compatibiliteit** — De `config-api` draait nu op Node 18 (`node:18-alpine`) om compatibiliteit met oudere server-omgevingen te waarborgen.
- **💓 Healthcheck Update** — De container healthcheck voor de API is gecorrigeerd naar de juiste interne poort (3000).
- **📂 Opslag-conventies** — Benchmark resultaten en logs zijn verhuisd naar een gestandaardiseerde locatie om de host schoon te houden.

## [v1.9.1] - 2026-05-17
### Opgelost (Fixed)
- **🖼️ Statische wallpaper cross-device sync** — `hobbithole_bg` wordt nu ook opgeslagen in `serverConfig.wallpaper` via `/api/config`. Bij site-data clear of een nieuw device wordt de wallpaper hersteld vanuit de backend ipv "geen achtergrond". Dynamic + Live wallpapers blijven localStorage-only tot v2.0 (te groot voor JSON config-sync, krijgen aparte endpoint).
- **🌐 Default IP fallbacks weg** — Hardcoded `192.168.1.169` fallbacks vervangen door `window.location.hostname`. Placeholders zijn nu generiek (`192.168.1.x`, `your-server`). Dashboard werkt out-of-box op iedere host zonder eerst Settings → Docker IP te moeten invullen.

## [v1.9.0] - 2026-05-16
### Toegevoegd (Added)
- **🎨 Theme Engine (achter `?ff=themeEngine`)** — eerste stap richting v2.0's "Home Experiences". Themes zijn JSON-presets in `themes/<id>.json` die als CSS-overlay op `<html>` worden toegepast. De gebruikerseigen accent/transparency in localStorage blijft onaangeroerd, dus "Mijn eigen stijl" herstelt altijd correct. Active thema wordt cross-device gesynchroniseerd via `serverConfig.themeId` — kies op desktop, ziet 'm meteen terug op mobile. Te activeren via Settings → Vormgeving → **Thema Experience**.
- **4 first-party themes** — `Classic Tiles` (de v1.x baseline-look, herkenbaar voor bestaande users), `Glass Ocean` (diepblauw met veel blur en ronde hoeken), `Midnight Neon` (donker met roze accent en scherpe randen), `Nordic Frost` (minimalistisch grijs-blauw met extra grote ronde hoeken).
- **`themes/SCHEMA.md`** — volledige schema-documentatie voor community contributors: alle velden, CSS-variabelen, weatherBackdrop enum, validatie-regels, voorbeeld-theme. Voorbereiding op v2.0.D community theme ecosystem.
- **Theme API endpoints** — `GET /api/themes` (lijst, skip malformed) en `GET /api/themes/:id` (volledige theme). Beide via nginx proxy naar config-api.
- **Canvas Mode is nu GA** — `?ff=canvasMode` is verdwenen, Canvas Mode toggle is altijd zichtbaar in Settings. De smart-placement (v1.8.5) en size buttons (v1.8.2) hebben de feature production-ready gemaakt.

### Verbeterd (Changed)
- **Schema-veld `weatherBackdrop` is nu strict een string-enum** (`"off"` / `"subtle"` / `"standard"` / `"immersive"`) ipv mixed boolean/string. Schema-contract voor v2.0.D community themes is daarmee scherp.
- **Reserved fields in theme schema** — `homeLayout`, `liveWallpaper`, `widgetVariants` staan nu als `null` placeholders in elk thema, zodat v2.0 deze kan invullen zonder breaking schema change for bestaande community themes.

### Beveiliging (Security)
- **Path-traversal hardening** op `/api/themes/:id` — id wordt gevalideerd tegen `^[a-z0-9-]+$` (anders 400 `invalid_id`), losse error-paden voor read/parse-failures, malformed theme files crashen de listing niet meer.

### Opgelost (Fixed)
- **Show-stopper: ontbrekende komma in FEATURE_FLAGS object** zorgde dat het volledige inline-script een SyntaxError gooide — dashboard liet niets meer renderen. Comma is hersteld, parse-check passeert.
- **Theme-engine plumbing** — `themes/` directory was niet bind-mounted in de config-api container en `/api/themes` had geen nginx proxy block (404). Beide alsnog gekoppeld in `docker-compose.yml`, `default.conf` en `Dockerfile.config-api`, zodat de feature daadwerkelijk end-to-end werkt.

## [v1.8.6] - 2026-05-16
### Toegevoegd (Added)
- **🖼️ Dynamic Wallpapers (macOS-stijl)** — Ondersteuning for 5 afbeeldingen (slots) die automatisch wisselen op basis van het tijdstip van de dag (Early Morning, Day, Sunset, Evening, Night). Creëer je eigen 'Dynamic Desktop' ervaring direct in je homelab.
- **✨ Wallpaper-aware Cinematic FX** — Wanneer een wallpaper (statisch, dynamisch of video) actief is, verbergt het dashboard automatisch de 'Sky' gradient. Alleen de weer-elementen (wolken, regen, sneeuw, bliksem) worden over je wallpaper heen geplaatst voor een naadloze, filmische integratie.
- **Toggle: Weer-elementen** — Nieuwe master toggle in de instellingen om specifiek de weer-effecten (wolken, regen, sneeuw, bliksem) aan of uit te zetten, los van de lucht-gradient.
- **Toggle: Sky Layer** — De 'Cinematic Backdrop' toggle is verfijnd en bedient nu specifiek de lucht-laag (kleurovergangen, sterren, zon en maan).

### Verbeterd (Changed)
- **Refactoring: UI/Sky Layering** — De code voor de lucht- en weer-lagen is volledig herschreven om beter samen te werken met de nieuwe wallpaper-opties. Betere prestaties en minder visuele glitches bij het wisselen van thema's.
- **Smart Backdrop logic** — Verbeterde logica voor het detecteren van actieve achtergronden om onnodige canvas-bewerkingen te voorkomen.

## [v1.8.5] - 2026-05-12
### Toegevoegd (Added)
- **☁️ Cinematic weather backdrop is nu GA** — Apple Weather-stijl achtergrond is uit feature-flag gehaald en standaard aan voor iedereen. Sky-kleur die meeloopt met het echte weer + tijdstip (sunrise warm, day blue, sunset purple, night deep navy), volumetrische wolken met two-pass shading, sterren bij heldere nacht, lightning bij onweer. Inclusief de v1.8.4 performance fix (sprite caching, 50× minder canvas-ops per frame). **Niet je smaak? Uit te zetten via Settings → Customize → Cinematic backdrop.** Cross-device gesynchroniseerd via `serverConfig.weatherBackdrop`.
- **🎉 First-run release modal** — nieuwe mechanisme voor "what's new" pop-ups bij grote feature releases. Toont eenmaal per user per announcement-id, dismissable, persisted in `hobbithole_dismissed_announcements`. Eerste gebruik: bovengenoemde cinematic backdrop GA-aankondiging. Toekomstige releases kunnen één regel toevoegen aan de `RELEASE_ANNOUNCEMENTS` array. Dev-hack: `#reset-announcements` URL hash wist de seen-list for testen.

### Verbeterd (Changed)
- **Canvas mode smart placement** (achter `?ff=canvasMode`) — nieuwe widget blocks landen nu op de eerste vrije plek via een snap-grid first-fit packer (top→bottom, left→right). Voorheen stackten ze altijd in de linker kolom, ongeacht beschikbare ruimte naast bestaande blocks. Werkt naast en onder elkaar tot het scherm vol is, dan opnieuw beneden.
- **Watchtower "Laatste scan" display** — toont nu de echte completion time (niet de click time) door scan completion te detecteren via `scans_total` metrics bumps. Werkt voor manual clicks én Watchtower's eigen cron scans. Plus context: "Net (22 gecheckt, 2 geüpdate)" ipv vage "eerder vandaag".

## [v1.8.4] - 2026-05-11
### Toegevoegd (Added)
- **👁️ Watchtower widget** — trigger Docker container updates handmatig vanuit het dashboard. Klik **🔍 Scan now** in de widget → Watchtower checkt al je images op Docker Hub → live stats verschijnen ("Containers: 22 · Laatste scan: 2u geleden · Updates totaal: 0"). Auto-refresh elke 30s. Vereist eenmalig HTTP API enable in je Watchtower compose (`WATCHTOWER_HTTP_API_UPDATE=true` + token + dashboard_net) — empty state in de widget toont stap-voor-stap setup-guide met copy-paste compose snippet. Backend: nieuwe endpoints `POST /api/watchtower/scan` + `GET /api/watchtower/metrics` via Bearer token.
- **🔌 Settings → Externe services sectie** — nieuwe collapsible sectie voor third-party service config (Watchtower nu, Prometheus/Grafana later). Watchtower integration card met URL + masked token + 🧪 Test verbinding + 💾 Opslaan. Cross-device synced via `serverConfig.watchtower`. Elke integration card is individueel inklapbaar — schaalt naar 10+ integrations zonder lange Settings lijst.
- **🎬 Live wallpaper** (achter `?ff=liveWallpaper`, desktop only) — upload een geoptimaliseerde MP4/WebM loop (5-15s, <10MB) als bottom-layer background. Auto-disabled op mobile (battery/data). Upload UI in Settings → Achtergrond met size warnings + ffmpeg tip. **Bonus combo voor wie ook de `?ff=cinematicWeather` flag actief heeft**: video wordt the sky, alleen weer-particles (clouds/rain/snow/lightning) compositen erover — geen day/night gradient meer over de video. Pure film-vibe.

### Verbeterd (Changed)
- **Cinematic weather clouds rewrite** (alleen zichtbaar achter `?ff=cinematicWeather`) — Apple Weather-style volume met two-pass shading (subtiele blauw-grijze underside + heldere sunlit top), top-biased puff layout for de klassieke "platte bodem, puffy bovenkant" cumulus silhouet. Clouds zitten nu hoger in de sky (upper 65% ipv onderkant), groter, met meer puffs per cloud. Geen flat blobs meer.
- **Cinematic FX performance** (alleen zichtbaar achter `?ff=cinematicWeather`) — pre-bake cumulus clouds naar offscreen canvas-sprites. Render-loop doet nu `drawImage` per cloud ipv 16 radial gradient operations. ~50× minder per-frame canvas work, fixed scroll-stutter die optrad met de nieuwe voluminous look. Lichtere mobile load wanneer de FF aan staat.

### Opgelost (Fixed)
- **Mobile app drag-misfire** — bij scrollen of tappen kon je per ongeluk een app van plek wisselen. SortableJS heeft nu `delay: 500ms` op touch (`delayOnTouchOnly: true`) — long-press is nodig om reorder te starten, instant op desktop. Matched iOS/Android home screen pattern.

## [v1.8.3] - 2026-05-11
### Toegevoegd (Added)
- **🔧 Container quick actions** — via ⋯ menu op elke tegel kun je nu Docker containers direct **starten**, **stoppen** of **herstarten** zonder Portainer of SSH te openen. Buttons verschijnen automatisch alleen op tegels die mappen naar een Docker container (via port matching). Stopped containers tonen ▶️ Start, running containers tonen ⏸️ Stop + 🔄 Restart. Stop/Restart vragen confirmatie ("Container `jellyfin` stoppen?"). Toast feedback bij elke actie, status dot ververst automatisch na 3s zodat je groen→rood→groen ziet bij een restart. **Self-protection**: Hobbithole's eigen containers (`hobbithole-dashboard`, `hobbithole-config-api`) tonen geen actions — voorkomt dat je je eigen tak afzaagt. Backend: nieuwe nginx proxy locations `POST /api/container/{id}/{action}` via Docker socket. Containers list 5s gecached om de Docker API niet te hammeren bij het openen van meerdere menu's.

### Verbeterd (Changed)
- **Titel + ondertitel syncen nu cross-device** — voorheen leefden je custom dashboard-titel en ondertitel in localStorage (per device), dus na het wisselen van browser of het wissen van site data waren ze weg. Ze worden nu via `/api/config` opgeslagen, zelfde patroon als categories en weather. localStorage blijft als offline cache. One-time migration: bestaande lokale waarden worden bij eerste load automatisch naar de server gepusht.
- **Info-bordje bij Achtergrond instelling** — achtergrond blijft (voorlopig) lokaal opgeslagen omdat base64 images snel MB's worden. Settings toont nu duidelijk waarom, wat 't risico is bij browser-data wissen, en een directe link naar Backup & Restore om een veilige kopie te maken. Cross-device achtergrond staat op de roadmap voor een latere release.

### Opgelost (Fixed)
- **Mobile Edge cachet `index.html` te agressief, mist updates** — zonder cache-control headers interpreteerden mobiele browsers (vooral Edge) de HTML als "permanent cachebaar", waardoor users na een update de nieuwe versie pas zagen na "Cached images and files" handmatig wissen of incognito te gebruiken. Voor 450+ Docker Hub pulls is dat een echt product-probleem (mensen zien nieuwe features niet, denken dat 't bij hen niet werkt). Nginx serveert nu `Cache-Control: no-cache, must-revalidate` op alle statische content → browser revalidate't elke load, krijgt `304 Not Modified` als er niets veranderde (snel) of de nieuwe HTML als er wel een update is.

## [v1.8.2] - 2026-05-11
### Toegevoegd (Added)
- **Rebalanced S/M/L sizes — nu écht groter, en groeien óók in hoogte** — voorheen voelde de M size te klein en groeiden widgets alleen horizontaal terwijl content vaak vertikaal stacked (RSS items, kalender events, bookmarks). Nieuwe maten: S=240×0.7h, M=360×1.0h (was 320), L=540×1.6h. L toont nu ongeveer 2× zoveel content als M. Heights schalen automatisch op basis van de widget-type default × multiplier.
- **⟳ Refresh knop op data widgets** — RSS, Calendar en Quick Stats widgets krijgen een refresh knop in de header die de server-cache bypasst. Use case: je publiceert net een blog post en wil 'm direct in je RSS widget zien (anders 30 min wachten). Server-endpoints accepteren `?refresh=1` query param om cache te omzeilen.
- **Per-widget default hoogtes in canvas mode** — nieuwe widget blocks landen nu op een hoogte die past bij hun content. RSS Feed → 320px (toont ~5 items), Calendar → 280px, System Info → 220px, Bookmarks → 240px, Notes → 200px, Clock → 160px, Quick Stats → 160px, Iframe → 320px. Geen handmatig slepen meer nodig om alles te laten passen.
- **📋 "Wat is er nieuw" changelog modal** — klik op het versienummer in de footer (of via Command Palette → "Release notes") en de volledige CHANGELOG opent in een Glass-UI modal. **✨ NEW badge** verschijks automatisch naast het versienummer als je nog niet de huidige versie hebt gezien, en verdwijnt zodra je de modal opent. CHANGELOG.md was al in de Docker image gebakken — nu eindelijk zichtbaar voor users. Simpele markdown renderer (## versies, ### secties, **bold**, `code`) → geen externe library nodig.
- **💬 Feedback & Suggesties sectie in Settings** — directe knoppen naar GitHub voor bug rapporten (`🐛 Bug rapporteren`), feature suggesties (`💡 Idee insturen`) en de volledige issues lijst. Maakt 't voor users laagdrempelig om feedback te geven, essentieel voor de groeiende community rond Hobbithole.
- **Vriendelijk empty-state op Home tab** — als je nog geen widgets en geen pinned apps hebt, toont Home nu een grote welkom-hero met "🧩 Voeg je eerste widget toe" CTA-knop die direct naar de widget picker in Settings springt. Home tab is altijd zichtbaar (was: alleen als je content had) zodat nieuwe users meteen ontdekken dat ze hun eigen canvas kunnen maken.

### Opgelost (Fixed)
- **Grid raster bleef soms in beeld na drop in canvas mode** — pointer listeners zaten op de drag handle zelf. Als pointer release buiten de handle gebeurde (of pointer capture verloren raakte), fire pointerup niet → drag state bleef hangen → raster bleef zichtbaar tot volgende drag. Nu zitten move/up listeners op `window` tijdens een actieve drag — cleanup gegarandeerd ongeacht waar de release plaatsvindt.
- **RSS widget toonde altijd max 5 items, ongeacht size** — frontend had een `slice(0, 5)` hardcoded. Nu toont 'ie alle items (server fetcht er 20), body is scrollbaar. Small widget = scroll for meer, Large widget = alles zichtbaar zonder scroll. Hierdoor doen size buttons écht iets visible op de RSS widget.
- **Size buttons werkten niet in canvas mode** — klikken op S/M/L deed alleen de CSS class wisselen, maar inline `width`/`height` styles (die canvas-mode positionering gebruikt) werden niet bijgewerkt. Resultaat: widget bleef altijd dezelfde afmetingen. Nu past zowel breedte als hoogte direct aan bij size wissel.
- **Canvas mode widget overflow** — widgets met veel content (RSS Feed, lange Notes) overflowden visueel buiten hun ingestelde canvas-hoogte omdat er geen `overflow` containment was. Nu wordt content netjes geclipt binnen het block en is de body scrollbaar als 't niet past. Grid mode (canvas off) blijft ongewijzigd. CSS-only fix, geen JS-changes.

## [v1.8.1] - 2026-05-11
### Opgelost (Fixed)
- **Smart wizard skip cross-browser** — wizard verscheen onterecht opnieuw bij elke nieuwe browser (Edge → Safari etc.), zelfs als je dashboard al vol stond. Wizard kijkt nu naar server-side `categories` voordat 'ie opent. Heb je apps op de server? Geen onboarding meer. Belangrijk voor multi-device gebruikers en de cross-device sync belofte.

### Toegevoegd (Added)
- **Inline widget rename** — dubbelklik op de titel van élke standalone widget (Notes, Clock, Calendar, RSS, etc.) → wordt editable input → Enter om op te slaan, Escape om te annuleren. Leeg laten of zelfde tekst = revert naar default label. Werkt automatisch voor alle huidige én toekomstige widgets. Geen modal nodig.
- **Collapsible setting sections** — drie tool-secties die niet iedereen gebruikt (🟦 Synology Apps, 📦 Heimdall Import, 🍓 Homarr Import) zijn nu inklapbaar in Settings. Standaard ingeklapt, klik op heading om uit te klappen, choice persisteert per-sectie in localStorage. Minder scroll, schoner.

## [v1.8.0] - 2026-05-10
### Toegevoegd (Added)
- **Widget size knoppen (S/M/L)** — elke standalone widget heeft S/M/L knopjes in de header. Small = 1 kolom, Medium = 2 kolommen, Large = full row. Voor dichtere of breder uitlopende layouts. Mobiel: altijd full-width (size knoppen verborgen).
- **App-Widget blokken** — apps met geconfigureerde widget data kunnen nu als groot Home-blok geplaatst worden. Rich rendering: groot app-icoon, naam, primary value LARGE, secondary stats grid. Twee manieren om toe te voegen: Settings → 🧩 Home Widgets → "📌 App als widget" card, OF via app's ⋯ menu → "Pin op canvas". Auto-update wanneer widget data binnenkomt.

### Verbeterd (Changed)
- **Home tab is nu een echte home screen** — widgets verschijnen alleen op de Home tab (niet meer dwars door alle tabs heen). Home tab is altijd zichtbaar zodra je widgets of gepinde apps hebt. Alle/category tabs = pure app catalog.
- **CSS Grid layout** for standalone widgets (was flex) — foundation voor toekomstige free-placement canvas. Geen visuele wijziging.

## [v1.7.3] - 2026-05-10
### Toegevoegd (Added)
- **🖼️ Image widget** — toon een afbeelding op je dashboard. URL plakken én/of bestand uploaden (max 500KB, opgeslagen als base64 in config — voor grotere images is een URL beter). Optionele click-link en bijschrift.
- **🌐 Iframe embed widget** — embed elke URL als live frame (Grafana panel, custom dashboard, monitoring page). Configureerbare hoogte. Werkt het beste met homelab tools die geen X-Frame-Options blokkering hebben.
- **🔢 Quick Stats widget** — toont één live nummer van een custom HTTP endpoint. Configurabel via API URL + optionele JSON path (bv. `data.cpu`) + label + unit. Server-side fetch via nieuwe `/api/quickstat` endpoint, 5 min cache. Werkt met JSON én plain text responses.
- **`image-upload` veld-type** in de generic widget config modal — herbruikbaar voor toekomstige widgets die een afbeelding nodig hebben (background, logo, profile photo). URL veld + 📁 upload knop met grootte-validatie.

### Opgelost (Fixed)
- **Command palette tap-bug op mobiel** — items selecteren werkte niet via tap. De `onmouseover` handler triggerde een full re-render, waardoor tijdens een tap het doel-element verdween tussen tap-down en tap-up. Vervangen door `onmousemove` met lichte class-toggle (geen re-render). Werkt nu identiek op desktop en mobiel.

## [v1.7.2] - 2026-05-09
### Toegevoegd (Added)
- **🐳 System Info widget** — Docker stats als first-class widget block: running/total containers, images, CPUs, memory + Docker versie. Refresh elke 30s. Vervangt de oude vaste top-bar.
- **🔖 Bookmarks widget** — lijst van quick links binnen één widget. Inline +/- editing (naam, URL, optionele emoji), auto-prepend van `http://` als je 't vergeet. Cross-device sync.
- **📰 RSS feed widget** — toont 5 headlines uit een RSS 2.0 of Atom feed met relatieve tijd ("2u", "3d", datum bij ouder). Server-side fetch + parse via nieuwe `/api/rss` endpoint, 30 min cache. Eigen mini-parser handelt CDATA en HTML entities.

### Verbeterd (Changed)
- **Top-bar verwijderd** — de vaste system-info bar bovenaan is weg. Diezelfde info zit nu in de relocatable widget. Past bij de richting van het v2.0 customizable Home canvas waar alles vrij plaatsbaar wordt.

## [v1.7.1] - 2026-05-08
### Toegevoegd (Added)
- **📅 Calendar widget** — toont 5 komende events uit een ICS feed (Google Calendar, iCloud, Outlook, Synology Calendar, Nextcloud — overal waar je een ICS link kunt exporteren). Server-side fetch + parse via `config-api` (geen CORS issues, 10 min cache per URL). Toont "Vandaag · 14:00 — Meeting" stijl met datum-aware labels (Vandaag/Morgen/Wo 13 mei).
- **Drag-and-drop for home widgets** — sleep widgets in willekeurige volgorde via de `⋮⋮` handle in de widget header. Volgorde wordt server-side opgeslagen, dus consistent op al je devices.
- **Generic widget config modal** — herbruikbare modal voor widgets met instellingen (Calendar gebruikt 'm voor de ICS URL). Toekomstige widgets met config-velden plug in via `configSchema` op de widget definition.
- **⚙️ instel-knop** op widgets met configSchema — klik in de widget header om bestaande config te bewerken zonder verwijderen + opnieuw toevoegen.

### Opgelost (Fixed)
- **ICS timezone parsing** — events met `TZID=Europe/Amsterdam` worden nu correct geconverteerd naar UTC met DST-aware offset detection via `Intl.DateTimeFormat`. Voorheen werden non-UTC events 1-2 uur verschoven weergegeven.

## [v1.7.0] - 2026-05-08
### Toegevoegd (Added)
- **Standalone widget architectuur** — een nieuwe sectie boven de categorieën waar widgets leven die NIET aan een tegel gekoppeld zijn (zoals een klok of notitie). Foundation voor het v2.0 customizable Home canvas. Widget types self-registreren via een registry, dus toekomstige widgets kunnen incrementeel landen.
- **🕐 Klok widget** — live tijd (HH:MM:SS, tabular-nums for stabiel display) + datum in jouw geselecteerde dashboard-taal. Tikt elke seconde, geen config nodig.
- **📝 Notitie widget** — sticky note met textarea, auto-save (debounced 400ms), cross-device gesynchroniseerd via `config.json`. Schrijf op je PC, verschijnt op je telefoon na refresh.
- **🧩 Home Widgets sectie** in instellingen — visueel grid van klikbare widget cards (icon + naam + beschrijving). Klik = direct toevoegen. Schaalt naar tientallen widget types in toekomstige versies zonder UI te overspoelen.
- **`homeLayout` schema** in `config.json` — leeg array nu, foundation voor v2.0 Home canvas met posities, sizes en variants. Geen breaking changes for bestaande gebruikers.

## [v1.6.1] - 2026-05-08
### Opgelost (Fixed)
- **Cross-device sync works now properly** — pinned apps + per-app widget API keys were local to the device because `categories` was stored in localStorage. Fixed by moving to `config.json` on the server.
- **Migration**: Automatic one-time migration on first load.

## [v1.6.0] - 2026-05-07
### Toegevoegd (Added)
- **Feature flag system** — Infrastructure for in-progress features. Activate via `?ff=<name>`.

## [v1.5.0] - 2026-05-07
### Toegevoegd (Added)
- **Multi-page dashboards (tabs)**: Home, All, and category tabs.
- **Backup & Restore**: Export/import settings as JSON.

## [v1.4.0] - 2026-05-07
### Toegevoegd (Added)
- **Live App Widgets**: Sabnzbd, Pi-hole, Sonarr, Radarr, Jellyfin.
- **Command Palette**: `Cmd+K` / `Ctrl+K`.

## [v1.0.0] - 2026-05-04
- Initial release.
