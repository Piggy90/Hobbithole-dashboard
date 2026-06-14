# Hobbithole Cinema Dashboard - Changelog

## [v1.9.3-dev] - 2026-06-14
### In uitvoering (In Progress)
- Nieuwe features voor de volgende release.

## [v1.9.4-dev] - 2026-06-14
### In uitvoering (In Progress)
- Nieuwe features voor de volgende release.

## [v1.9.3] - 2026-06-14
### In uitvoering (In Progress)
- Voorbereiding op v2.0 component architectuur.

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
- **🖼️ Dynamic Wallpapers (macOS-stijl)** — Ondersteuning voor 5 afbeeldingen (slots) die automatisch wisselen op basis van het tijdstip van de dag (Early Morning, Day, Sunset, Evening, Night). Creëer je eigen 'Dynamic Desktop' ervaring direct in je homelab.
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
- **🔧 Container quick actions** — via ⋯ menu op elke tile kun je nu Docker containers direct **starten**, **stoppen** of **herstarten** zonder Portainer of SSH te openen. Buttons verschijnen automatisch alleen op tiles die mappen naar een Docker container (via port matching). Stopped containers tonen ▶️ Start, running containers tonen ⏸️ Stop + 🔄 Restart. Stop/Restart vragen confirmatie ("Container `jellyfin` stoppen?"). Toast feedback bij elke actie, status dot ververst automatisch na 3s zodat je groen→rood→groen ziet bij een restart. **Self-protection**: Hobbithole's eigen containers (`hobbithole-dashboard`, `hobbithole-config-api`) tonen geen actions — voorkomt dat je je eigen tak afzaagt. Backend: nieuwe nginx proxy locations `POST /api/container/{id}/{action}` via Docker socket. Containers list 5s gecached om de Docker API niet te hammeren bij het openen van meerdere menu's.

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
- **CSS Grid layout** voor standalone widgets (was flex) — foundation voor toekomstige free-placement canvas. Geen visuele wijziging.

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
- **Cross-device sync werkt nu écht** — pinned apps + per-app widget API keys waren tot nu toe device-locaal omdat `categories` (incl. apps + IDs + pinned status) in localStorage stond per device. Met willekeurig gegenereerde app-IDs konden de server-side opgeslagen widget configs niet matchen tussen apparaten. **Fix**: `categories` is verhuisd naar `config.json` (server-side) als source of truth; localStorage is nu offline cache. App-IDs zijn voortaan globaal, dus widget API keys, pinned status en collapsed categorie-state syncen automatisch tussen al je devices.
- **Migratie**: bij eerste load van v1.6.1 wordt jouw bestaande localStorage data automatisch gepushed naar de server als die nog leeg is. Geen actie vereist.

### Verbeterd (Changed)
- **Save-flow batched**: rapid-fire wijzigingen (drag-drop reorder, multi-app updates) worden gedebounced naar één POST per 300ms. Minder roundtrips, minder serverload.
- **Widget data blijft zichtbaar bij pin/unpin**: na een re-render (door pin, unpin, app edit, etc.) worden de live widget strips automatisch teruggehangen aan de nieuwe DOM-elementen. Voorheen verdwenen ze tot de volgende 60s refresh — dat voelde stuk maar was alleen een rendering issue.

## [v1.6.0] - 2026-05-07
### Toegevoegd (Added)
- **Feature flag systeem** — Infrastructuur voor in-progress features die achter een flag kunnen landen zonder live te gaan. Activeer per device via URL: `?ff=<naam>` (uit zetten: `?ff=<naam>:off`). Persist in localStorage. Voorbereiding for toekomstige features in v2.0.

### Verbeterd (Changed)
- **Footer** toont nu altijd "Hobbithole Dashboard" als product-naam (niet meer mirror van je persoonlijke dashboard-titel).
- **Look Foundation refactor** (geen visuele wijziging): hardcoded CSS-waarden zijn nu CSS-variabelen — `--font-stack`, `--font-size-xs..2xl`, `--space-1..12` (4px-base scale), `--card-radius`, `--card-radius-md/sm/xs`, `--card-padding-y/x`, `--card-blur`, `--card-border`, `--card-shadow`, `--transition-fast/base/slow`. Componenten die nu via vars werken: tegels (`.card`), modals, settings-secties, tile-actions menu, command palette, weather widget + expanded panel, knoppen, inputs, tabs-bar. Voorbereiding op het v2.0 theme-systeem zonder breaking changes for bestaande gebruikers.

## [v1.5.0] - 2026-05-07
### Toegevoegd (Added)
- **Multi-page dashboards (tabs)**: Bovenaan het dashboard staat nu een tab-bar met `⭐ Home` (alleen pinned apps), `Alle` (huidige overzicht) en één tab per categorie. Tabs zijn views/filters — apps wisselen niet van plek, je verandert alleen wat je ziet. Active tab wordt onthouden in localStorage, dus je opent altijd op de laatste view. Auto-categorisatie blijft werken zoals voorheen — manueel overschrijven via App Editor.
- **Backup & Restore**: Exporteer al je instellingen (apps, thema, widgets, weather config) als JSON met één klik (Instellingen → 💾 Backup & Restore). Importeer een backup om te restoren of te migreren naar een ander apparaat. Bevat zowel localStorage data (apps, theme) als server-side config.json (widgets, weather).
- **Synology Quick Add**: Nieuwe sectie in instellingen met een lijst van veelgebruikte Synology Package Center apps (DSM, File Station, Container Manager, Synology Photos, Audio/Video Station, Surveillance, Drive, Note Station, Active/Hyper Backup, plus PC-versies van Plex/Jellyfin/SABnzbd). Vink aan welke je hebt, klik Toevoegen — geen handmatig URL/icoon getypt. **DSM poort** instelbaar voor users die hun DSM op een andere poort hebben dan de standaard 5000.
- **2 nieuwe Docker widgets**: **Container Manager** (lokale Docker via `docker.sock` — geen URL/API key nodig, werkt for Synology Container Manager én plain Docker) en **Portainer** (remote Docker via Portainer's REST API met access token). Beide tonen running/stopped/total + meest recente container.

### Vereist (Breaking for downloaders die Container Manager widget willen gebruiken)
- Voeg aan `config-api` volumes in je `docker-compose.yml` toe:
  ```yaml
  - /var/run/docker.sock:/var/run/docker.sock:ro
  ```
  Daarna `docker compose pull && docker compose up -d`. Andere widgets blijven werken zonder deze wijziging.

## [v1.4.1] - 2026-05-07
### Toegevoegd (Added)
- **6 nieuwe widget types**: **Plex** (now playing), **Tautulli** (Plex activity + bandwidth), **Overseerr / Jellyseerr** (pending requests + recent), **qBittorrent** (download speed + active torrents), **Home Assistant** (active entities — totaal + 💡 lights / 🔌 switches / 🎬 media playing), **Trailarr** (tracked media + trailer downloads).
- **Username veld** in App Editor — verschijnt alleen for widget-types die cookie-auth gebruiken (qBittorrent). Het API Key label verandert dan automatisch naar "Wachtwoord". Cookie/SID handling gebeurt server-side in de adapter.
- **Homarr import**: Migreer van Homarr naar Hobbithole in één klik — beschikbaar in zowel de wizard (🍓 Homarr backup importeren) als in instellingen. Ondersteunt zowel Homarr v0.x als v1.x export-formaten (apps/services arrays, category-id mapping, iconUrl paden).

### Opgelost (Fixed)
- **Heimdall import** werkte niet meer sinds v1.3.2 (de image-based docker scanner refactor maakte de oude `detectApp(name)` aanroep stuk). Vereenvoudigd: imports gebruiken nu de title direct als icon-slug (dashboard-icons CDN matcht meestal correct, anders fallback initials).

## [v1.4.0] - 2026-05-07
Major release: live app widgets + command palette + extensible widget architecture.

### Toegevoegd (Added)
- **Live App Widgets** — Onder elke tegel verschijnt nu een live data-strip met info uit de bijbehorende app. Eerste 5 adapters: **SABnzbd** (download speed + queue), **Pi-hole** (geblokkeerde queries), **Sonarr** (komende afleveringen), **Radarr** (komende films), **Jellyfin** (now playing). Configureren via App Editor → "📊 Live widget tonen onder deze tegel" → type kiezen + URL/API key invullen. Cross-device gesynchroniseerd via server-side config.
- **Widget backend-architectuur** — Widgets draaien in de `config-api` service met per-type cache TTL (5–60s), 6s timeout, en error-fallbacks. API keys blijven server-side, frontend hoeft alleen te renderen. Nieuwe endpoints: `GET /api/widgets`, `POST /api/widgets/:id/refresh`, `GET /api/widgets/types`. Adapters zijn losse files in `widgets/` — community kan eenvoudig nieuwe types bijdragen.
- **Command Palette** (`Cmd+K` / `Ctrl+K`) — Raycast/Spotlight-stijl overlay om snel door je apps te navigeren of acties uit te voeren (Open Settings, App toevoegen, Toggle Status Indicators, etc.). Fuzzy search, pijltoetsen for navigatie, Enter om uit te voeren, Esc om te sluiten. Mobiel-vriendelijk: een ⚡ knop links-onderin opent dezelfde palette.
- **Stabiele app-IDs** — Apps krijgen nu een unieke `id` (auto-gegenereerd, eenmalige migratie for bestaande apps) zodat widget-koppelingen, multi-device sync en toekomstige features zoals favorieten betrouwbaar werken.

### Verbeterd (Changed)
- **App Editor** heeft een nieuwe collapsible widget-config sectie (type dropdown + dynamische URL/API key velden + helper-tekst per type). Widget URL wordt automatisch ingevuld met de app-URL en `http://` wordt automatisch toegevoegd als je vergat te typen.

### Vereist (Breaking for downloaders)
- De `config-api` image moet ook geüpdatet worden (`docker compose pull && up -d`) — die bevat nu de widget-engine en widget-adapters.

## [v1.3.3] - 2026-05-07
### Toegevoegd (Added)
- **Favorieten strip**: pin je meest gebruikte apps via het tile-menu (⋯) — pinned apps verschijnen bovenaan in een aparte "Favorieten" sectie (gouden accent) én blijven gewoon zichtbaar in hun eigen categorie. Een kleine ster en gouden randje tonen welke apps gepind zijn.
- **Tile actions menu** (vervangt hover-acties): elke tegel heeft een subtiele ⋯ knop rechtsboven die altijd zichtbaar is. Klik/tap → klein popover-menu met Pin/Bewerken/Verwijderen. Werkt identiek op mobiel en desktop, geen knipperende hover-iconen meer. Click-outside of Esc om te sluiten. Premium OS-achtige UX.
- **Animated weather backdrop** — subtiele particle-effecten op de achtergrond gebaseerd op het actuele weer: regendruppels (lichte/zware regen), sneeuwvlokjes, en een warme pulserende zon-glow rechtsboven. Bij onweer flitst het scherm af en toe wit. Toggle in instellingen om uit te zetten. Werkt op canvas via requestAnimationFrame, low-impact op mobiel (DPR clamped op 2).
- **Live status indicators op tegels** — kleine kleurpunt rechtsboven (groen = bereikbaar, rood = offline, geel pulserend = checking). Pingt elke 60s, configureerbaar via een nieuwe toggle in instellingen. Werkt zonder backend (browser fetch in `no-cors` mode).
- **Live icon preview + fuzzy suggesties** in de "App toevoegen" en "App bewerken" modals: terwijl je typt zie je een live preview én suggestie-knoppen uit de 1000+ dashboard-icons library. Typ "sab" → klik op `sabnzbd` om het icoon-veld te vullen. Geen perfecte spelling meer nodig.
- **Auto-icoon op basis van URL**: plak een URL als `https://copilot.microsoft.com` en het icoon-veld wordt automatisch gevuld met `copilot` als die slug bestaat in dashboard-icons. Werkt for de meeste publieke web-apps. Respecteert handmatige keuzes (overschrijft niet als je zelf al iets hebt getypt).
- **Eigen icon URL of upload** ondersteund: het icoon-veld accepteert nu naast slugs ook een volledige URL (`https://...`) naar een PNG/SVG, of klik op de 📁 knop om een eigen bestand te uploaden (max 200KB, opgeslagen als base64).

### Opgelost (Fixed)
- **Zoekbalk wordt nu gewist** na het indrukken van Enter (web-search) — eerder bleef de query staan tot je 'm handmatig wiste.
- **Suggesties verschijnen nu meteen** zodra de icon-manifest geladen is, ook als je al was begonnen met typen voordat het manifest binnen was.

## [v1.3.2] - 2026-05-06
### Toegevoegd (Added)
- **Cinematic Weather Widget**: Klik op de kleine widget om een glazen panel uit te klappen met:
  - **Hourly strip** — komende ~18 uur in 3-uur blokken (horizontaal scrollbaar, snap-points)
  - **7-daagse forecast** met iconen, min/max temperatuur, regenkans (≥10%) en wind (≥20 km/h)
  - **Klikbare daily rows** — klik op een dag om die dag in 3-uur blokken uit te klappen
  - "Vandaag" / "Morgen" + volledige weekdagen in jouw geselecteerde taal
  - Klik buiten = sluiten
- **Plaatsnaam in weather widget**: Boven de temperatuur staat nu de plaatsnaam (accentkleur). Reverse-geocoding draait op de achtergrond als je handmatig coördinaten invoert.
- **Locatie zoeken op naam**: In de instellingen kun je zoeken op stad ("Amsterdam") en met één klik lat/lon laten invullen — geen latlong.net meer nodig.

### Verbeterd (Changed)
- **Live icon preview** in de "App toevoegen" en "App bewerken" modals (basis-versie; uitgebreid in v1.3.3 met fuzzy suggesties).
- **Image-based Docker detection**: De auto-scanner kijkt nu naar de container **image** i.p.v. de container-naam. Daarmee verdwijnt de hardcoded `KNOWN_APPS` lijst (was 45 entries, error-prone met substring matching). Iconen komen automatisch uit de [homarr-labs/dashboard-icons](https://github.com/homarr-labs/dashboard-icons) CDN — werkt for 1000+ apps zonder onderhoud. Containers zonder published host-poort (Watchtower e.d.) worden nu correct overgeslagen.
- **Lege default categorieën**: Geen "spook-apps" meer (Jellyfin, Sonarr op `192.168.1.169` etc.) bij eerste bezoek — je dashboard begint schoon en wordt gevuld door je eigen scan of handmatig toevoegen.

## [v1.3.1] - 2026-05-06
### Toegevoegd (Added)
- **Server-side Config (cross-device sync)**: Nieuwe `config-api` service (Node/Express) slaat instellingen op in `data/config.json` zodat ze gelijk zijn op pc, telefoon en tablet. Eerste migratie: weather widget.
- **Zichtbare error states voor weather widget**: Bij API-fout of ontbrekende locatie toont de widget nu een duidelijke melding (⚠️) i.p.v. stilletjes te verbergen — veel makkelijker debuggen op mobiel.

### Vereist (Breaking)
- Downloaders moeten nu naast de dashboard image óók `piggyoriginal/hobbithole-config-api` pullen en een `./data` map aanmaken (zie `docker-compose.hub.yml`).

## [v1.3.0] - 2026-05-06
### Toegevoegd (Added)
- **Fuzzy Search**: Zoek direct door je tegels.
- **Inklapbare Categorieën**: Klik op een categorie om hem in te klappen.
- **Quick Actions**: Hover over een tegel om snel te bewerken of verwijderen.
- **Systeem Info Widget**: Toon CPU/RAM/Docker stats bovenaan je dashboard.
- **Homarr Import**: Importeer je oude Homarr dashboard in 1 klik.

## [v1.2.0] - 2026-05-04
### Toegevoegd (Added)
- **Changelog**: Een CHANGELOG.md toegevoegd aan de image zodat gebruikers de updates kunnen inzien (bereikbaar via `/CHANGELOG.md`).

## [v1.1.0] - 2026-05-04
### Toegevoegd (Added)
- **Meertaligheid (i18n)**: Volledige ondersteuning toegevoegd for Nederlands, Engels, Duits, Frans en Spaans.
- **Weer Widget (Weather)**: Een prachtige glazen weer-widget toegevoegd (gebruikt de gratis open-meteo API).
- **Screensaver (Clock Mode)**: Een fullscreen klok die automatisch activeert na inactiviteit.
- **Backup & Restore**: Met één klik al je instellingen (categorieën, URL's, kleuren) exporteren en importeren als JSON.

## [v1.0.0] - 2026-05-04
### Toegevoegd (Added)
- **First-Run Wizard**: Een 3-stappen setup wizard for nieuwe gebruikers for een plug-and-play ervaring.
- **Docker Auto-Detectie**: Het dashboard scant `/var/run/docker.sock` en voegt draaiende containers direct toe inclusief de juiste iconen en categorieën.
- **Thema Engine**: 5 volledige layouts (Modern, Minimalist, Compact, Heimdall Classic, Homarr Style) en 7 accentkleuren.
- **Dynamisch IP**: Interne auto-detectie for de NAS IP om hardcoding te voorkomen.
- **Lokale Achtergronden**: Afbeeldingen lokaal uploaden (gecomprimeerd in de browser) of via een URL laden.
- **Drag & Drop**: Apps visueel verslepen over en tussen categorieën.
- **App Editor**: Apps toevoegen, URL's wijzigen, API keys koppelen, direct via de frontend.
- **SABnzbd Widget**: Live downloadsnelheid en status op de tegel.
- **Search Provider**: Ingebouwde zoekbalk (Google, DuckDuckGo, Bing, Brave, Startpage of custom).
