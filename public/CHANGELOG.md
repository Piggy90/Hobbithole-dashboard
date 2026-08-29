# Hobbithole Cinema Dashboard - Changelog

## [v1.10.2-dev] - 2026-08-22
### In uitvoering (In Progress)
- Nieuwe features voor de volgende release.

### Gewijzigd (Changed)
- **Weer-overlay: één rAF, twee canvassen** (2026-08-29) — `animateCinematicFx` (lucht) en
  `animateWeatherFx` (regen/sneeuw) deelden niet dezelfde frame: twee callbacks, lagen konden
  een tick uit de pas lopen. Nu `tickWeatherOverlay`: één lus, beide tekenroutines. Stop pas
  als **beide** klaar zijn (anders valt de regen stil als de lucht stopt, of omgekeerd).
  Stap 2 (één canvas) is niet gedaan. Headless rAF-tellingen zijn opgeblazen; op een scherm
  ~60 fps voor de *gecombineerde* lus i.p.v. ~60+60.
- **Weer-overlay 30 fps** (2026-08-29) — dezelfde lus wacht na elk frame het restant van
  33 ms (zoals radar-windflow). Halveert het tekenwerk t.o.v. vsync; wolken/regen blijven.
  **In de praktijk bevestigd:** met het dashboard open blies de ventilator van een laptop
  eerst wel en nu niet meer, en het beeld loopt soepeler. Het verschil met 60 fps is niet
  opgevallen — dat was de aanname en die klopt dus.
- **Weer-overlay: beweging losgekoppeld van de framerate** (2026-08-29) — de deeltjes en wolken
  bewogen **per frame** (`p.y += p.speed`, `c.x += c.speed`), niet per seconde. De stap van 60
  naar 30 fps halveerde daarmee stilzwijgend ook de val- en drijfsnelheid. Dat viel niet op en
  het huidige beeld is zo goedgekeurd, dus dát is nu het ijkpunt: een stapfactor genormaliseerd
  op 30 fps (bij 30 exact 1, dus onveranderd) uit de werkelijk verstreken tijd, geklemd op
  0,25–3× zodat een hapering of een teruggekeerd tabblad de regen niet door het beeld schiet.
  De framerate regelt nu alleen nog vloeiendheid en verbruik, niet de snelheid — pas daardoor
  is een eerlijke vergelijking tussen 30 en 24 fps mogelijk.
  Verstellen kan zonder de code aan te raken: **`?fxfps=24`** achter de URL, of
  `setWeatherOverlayFps(24)` in de console.

### Beveiliging (Security)
- **Dockersocket weg bij de webserver** — `docker-compose.hub.yml` mountte `/var/run/docker.sock`
  ook op de `dashboard`-service (nginx), met de opmerking "Vereist voor de Auto-Detectie van
  Docker containers". Dat klopt sinds **v1.10** niet meer: container-endpoints lopen via
  config-api (`/api/containers*`) en `location /docker/` geeft in nginx gewoon `404`. De mount
  was een restant en werd nergens gebruikt — `default.conf` verwijst naar geen enkele socket,
  alleen `proxy_pass` naar `config-api:3000`. Ook read-only geeft zo'n socket toegang tot al je
  containers, images en logs. **De socket zit nu alleen nog op config-api**, waar hij hoort.
  Geen actie nodig bij bijwerken; de auto-detectie blijft werken.

### Toegevoegd (Added)
- **Hub update-check** — config-api `GET /api/updates/check` leest nieuwste release-tags van
  `piggyoriginal/hobbithole-dashboard` + `…-config-api` (cache 30 min). Stille footer-**Update**-badge
  + Settings → Help als Hub nieuwer is dan `APP_VERSION`. Dismiss tot de volgende nieuwere tag;
  altijd **beide** images naar dezelfde versie pullen. Geen popup. Als Hub-tags voor de twee
  images verschillen: sterkere **skew**-waarschuwing en beide naar de nieuwere tag.
- **Settings: meer inklapbare secties** — Apps, Docker-scan, Home-widgets, Backup, Zoekmachine,
  Weather, Feedback, Benchmark (plus bestaande imports/integraties). Jump-legenda blijft werken;
  Dashboard / Taal / Help / Beveiliging / Vormgeving / Weergave / Danger blijven open.

### Verbeterd (Changed)
- **Hub update-check hardening** — 5 min negatieve cache bij Hub-fouten; `?refresh=1` max 1×/60s;
  tag-paginatie-afkapping wordt gelogd + in de API gezet (`truncated`).
- **Release-hygiëne** — lab-`docker-compose.yml` en lab-`public/index.html` gaan niet naar GitHub
  (getrackte UI = gestripte `template_index.html`). Showcase-GIF (~53 MB) uit image/repo;
  README gebruikt `dashboard-home.png`.

### Opgelost (Fixed)
- **Changelog-modal: lange bullets afgekapt** — de renderer nam alleen de eerste regel van elk
  `-`-item; wrapping in CHANGELOG.md (ingesprongen vervolgregels) verdween. Doorlopende regels
  horen nu bij het item, dus de hele zin is zichtbaar.
- **Changelog-modal: datums weg** — de versiekop-datum (`## [vX] - YYYY-MM-DD`) en inline
  `(YYYY-MM-DD)` in bullets worden niet meer getoond. Ze blijven in het markdown-bestand
  (Keep a Changelog / GitHub Release).
- **Weer-widget: paneel over de weerkaart heen** (2026-08-29) — het uitgeklapte paneel hing op
  een **vaste** `top` (100px, 80px onder de mobiele media-query), terwijl de kaart erboven met
  zijn inhoud meegroeit. In een smal venster brak "Zwaar bewolkt en regen" over twee regels, werd
  de kaart 92px hoog en schoof het paneel er 12px overheen. Het paneel meet nu bij het openen de
  échte onderkant van de kaart op (`positionExpandedWeather()`, ook bij `resize`) en houdt 10px
  ruimte. Een groter vast getal was geen oplossing — dat verschuift alleen naar de volgende lange
  omschrijving. Meteen een `max-height` erbij, want het paneel schuift nu naar beneden mee.
- **Neerslaggrafiek: staven op verschillende bodemlijnen** (2026-08-29) — het tijdlabel stond
  als flex-kind ín de staafkolom, maar staat maar bij elke derde staaf. Die kolommen reserveerden
  ~18px voor tekst en de rest niets; omdat de staafhoogte een percentage van de héle kolom is,
  werden staven mét een label eronder **18px omhooggeduwd**. Gevolg: twee bodemlijnen in plaats
  van één, met de tijden tussen de lage staafjes van de buurkolommen. Labels staan nu absoluut
  gepositioneerd onder de grafiek en tellen niet meer mee in de kolomhoogte.
- **Radar-afspeelframes gaven hun geheugen niet terug** — `buildWeerenradarFrameCanvases()`
  maakt per verversing een verse set losse canvassen, één per tijdstap (`1024×639` = 2,6 MB
  backing store elk, tot 24 stuks). Die backing store telt **niet** mee in de JS-heap, dus V8
  ziet per canvas alleen een leeg object van een paar honderd bytes en draait nooit een GC —
  de bitmaps bleven staan tot iets anders toevallig geheugendruk gaf. Gemeten: JS-heap vlak op
  3,5 MB terwijl het renderer-proces naar 800 MB liep, en `querySelectorAll('canvas')` bleef
  op 4 staan omdat deze frames nooit in de DOM hangen.
  Nieuwe `releaseRadarFrameCanvases()` zet elk canvas op `0×0` — de enige deterministische
  manier — en wordt op drie plekken aangeroepen: in `ctrl.destroy()`, in `applyPack()` vóór de
  oude set vervangen wordt, en in `ensureFrames()` voor een set die klaarkomt nádat de
  controller al vervangen is (die viel voorheen compleet op de grond). Gemeten in bedrijf:
  één aanroep per cyclus, 52 canvassen = 145 MB teruggegeven in 6 minuten.
- **Auth UI-copy bij login uit met bestaande accounts** — status + knop “Login weer aanzetten”
  (zelfde e-mail/wachtwoord, geen nieuwe first-run); disable-confirm/toast vermelden dat accounts
  bewaard blijven.

## [v1.10.1] - 2026-08-16
### Toegevoegd (Added)
- **Status-dot: Docker eerst, URL als fallback** — match op `containerName` / poort in
  URL / tegelnaam (compose-service). Tooltip toont container-state. Geen valse “offline”
  meer voor localhost-only LAPI’s (CrowdSec e.d.) zolang de container `running` is.
  Zonder Docker-match blijft de browser-URL-ping (bookmarks, externe sites).
- **Veld `containerName` (optioneel)** bij app toevoegen/bewerken — expliciete koppeling
  voor status-dot én p95 als de weergavenaam anders is dan de containernaam.
- **Compacte service-tegel** (`compact: true`) — chip-rij: status-dot + naam + p95-RAM
  (geen groot icoon, geen CPU-regel). Voor infra zonder web-UI. Aan/uit in app
  toevoegen/bewerken. URL mag leeg/`#` (geen link). Lab-dogfood: CrowdSec compact.
- **Compact-stapels in Apps** — opeenvolgende compacte tegels vormen een verticale
  kolom (`.compact-stack`, één grid-cel). Sleep chips onder elkaar of uit de stapel
  tussen de grote tegels; hele stapel als blok verplaatsen. Volgorde in `categories`.
  Nested Sortable + parent-grid; na drop wordt de DOM-volgorde teruggeschreven.
- **Settings → Help & tips** — doorzoekbare FAQ bovenaan Instellingen (na Taal).
  Topics: iconen, tegels, status-dot/Docker/stapelen, p95-benchmark, login/auth,
  widgets, wallpapers, Docker scan, home/canvas. Snelkoppelingen: Changelog,
  GitHub README, Beveiliging. i18n `help.*` (NL/EN volledig; DE/FR/ES chrome
  gelokaliseerd, topic-bodies EN tot vertaling volgt).
- **Settings: knop “Terug naar boven”** — zwevende knop rechtsonder in Instellingen
  (viewport-fixed). Zichtbaar na ~280px scroll in `#settings-view`, smooth scroll
  naar header met **Sluiten**. i18n NL/EN/DE/FR/ES (`settings.backToTop`).
- **Settings: jump-legenda (sectienavigatie)** — sticky “Spring naar sectie” met chips
  voor alle zichtbare Settings-blokken. Klik springt naar de sectie (klapt collapsible
  open, korte highlight). Verborgen feature-secties (USB/benchmark) blijven uit de
  legenda. i18n `settings.tocTitle`.

### Opgelost (Fixed)
- **Docker-scanner sloeg host-netwerkcontainers over** (2026-08-22) — Settings → Scan
  Docker Containers hield alleen containers met een `PublicPort`. Bij
  `network_mode: host` is `Ports: []`, dus **scrypted**, jellyfin, Home Assistant,
  qBittorrent verschenen nooit. `pickEndpoint()` gebruikt nu `HOST_ENDPOINT_HINTS`
  (scrypted → `https://…:10443`). Al aanwezige tegels worden overgeslagen;
  host-mode toont · host · poort. Wizard-scan idem.
- **Wind-radar (Gust) — bewegende witte streamlines:** Weerenradar levert basiskaart
  (JPEG) + **windvectorveld** (`wind:N:png` in X-Custom-Body; R/G t.o.v. offset 85)
  + `windvalues` JSON. De witte strepen op weerenradar.nl zijn een **particle-animatie**
  (~30 fps, overlay-canvas) — niet de PNG over de kaart tekenen (dat maakte de kaart
  groen/kapot). Nu: basiskaart + km/u-labels boven de particles + animatie (dogfood OK).
- **p95-metrics ontbraken op tegels ondanks geldige benchmark:** de benchmark meet alle
  draaiende Docker-containers, maar de tegel toonde CPU/RAM alleen als de
  **weergavenaam** matchte na strippen van spaties en `-`. **Onderstrepingen (`_`)
  bleven staan**, dus o.a. *Immich Server* (`immichserver`) ≠ `immich_server`.
  API (`widgets/p95stats.js`) en frontend (`normalizeP95Key`) gebruiken nu dezelfde
  normalisatie: spaties, `-` en `_` weg + lowercase. Afwijkende labels: gebruik
  `containerName` (of compact + containerName).
- **Compacte tegel oogde als leeg vierkant** in een mixed grid: CSS-grid rekte de chip
  uit tot de rijhoogte van icon-tegels. Fix: `align-self: start`, `align-items: start`
  op de grid, status/menu/pin `position: static` in compact-modus.
- **GitHub blob-icon-URL’s** (`/blob/…` of `?raw=true`) worden in `resolveIconSrc`
  herschreven naar `raw.githubusercontent.com` (stabiele `image/*`). Helpertekst bij
  icoonveld noemt PNG/SVG/GIF/WebP + raw-URL-tip (icon-URL bestond al; was onduidelijk).

## [v1.10.0] - 2026-08-15
### Toegevoegd (Added)
- **Optionele authenticatie (productfeature):** `AUTH_ENABLED=true` + `SESSION_SECRET` op config-api.
  Eerste bezoek: admin-account (e-mail + wachtwoord; velden geschikt voor Apple Passwords).
  Zonder sessie: **401** op `/api/*` (behalve `/api/health` en `/api/auth/*`).
  Multi-user per install: admin via `POST /api/auth/users`. Google/Microsoft/passkeys volgen.
  Standaard **uit** — bestaande installs ongewijzigd.
- **Release-popup** `optional-auth-remote-1.10.0` — wijst op optionele login + veilig buitenshuis via reverse proxy (max 1×).
- **Auth ook via de UI (zero-config):** Settings → Beveiliging → “Beveilig dit dashboard”. Geen compose-edit nodig; `SESSION_SECRET` wordt auto gegenereerd in `data/auth/`. Compose `AUTH_ENABLED=true|false` blijft werken en vergrendelt de toggle.
- **Login-UI:** overlay met first-run setup of sign-in; knop **Show/Hide** bij wachtwoord.
- **Docker-endpoints via config-api:** containers/info/start/stop/restart niet meer raw via
  nginx→socket. `/docker/` geeft 404 — auth kan container-acties beschermen.

### Opgelost (Fixed)
- **Login-loop op LAN-HTTP:** sessie-cookie kreeg `Secure` omdat `AUTH_PUBLIC_URL` op https stond,
  terwijl je via `http://IP:8086` inlogt. Browsers bewaren die cookie dan niet → na Enter weer
  het login-scherm. `Secure` hangt nu aan de **request** (`X-Forwarded-Proto` / TLS), niet alleen
  aan de public URL. Forceer met `AUTH_COOKIE_SECURE=true|false` indien nodig.
- **Leeg dashboard zonder login-scherm:** dubbele `const pw` in de auth-overlay crashte de hele
  frontend (SyntaxError). Geen gate, geen apps; `/api/config` gaf 401. Opgelost; bij 401 op
  config wordt het login-scherm getoond i.p.v. een lege “offline”-config.

### Beveiliging (Security)
- Poort 8086 niet open op internet zonder `AUTH_ENABLED=true` (of andere proxy-auth).
- Auth-status mag bij fout **niet** als “auth uit” worden behandeld (voorkomt stille 401-lege UI).

### Opgelost (Fixed) — eerder bugs in (pre) 1.9.10, eruit in 1.10.0
- **Docker-scan bouwde onbruikbare URL's (2026-08-12):** twee fouten in één regel.
  **(1) Verkeerde host** — de host kwam uit `localStorage.hobbithole_nas_ip`, maar díe sleutel
  wordt geschreven door de Synology-app-toevoeger. Wie ooit Synology-apps had toegevoegd kreeg
  daarna het IP van zijn NAS in elke gescande tegel, terwijl de containerlijst gewoon van
  `/api/containers` op de dashboard-host zelf komt. Die fallback is eruit: eigen veld, anders
  `window.location.hostname`. **(2) Verkeerde poort + schema** — `Ports.find(p => p.PublicPort)`
  pakte de eerste poort uit de Docker-API en zette er altijd `http://` voor. Die lijst staat niet
  in compose-volgorde en bevat elke poort dubbel (IPv4 + IPv6), dus bij een image dat HTTP én
  HTTPS publiceert (linuxserver/kasm: 3000 + 3001) was het toeval welke je trok — met `http://`
  op de TLS-poort als resultaat, wat `400 Bad Request` geeft en leest als "de tegel is stuk".
  Nieuw: `pickEndpoint()` ontdubbelt op `PublicPort` en **kiest de TLS-poort als de container er
  één publiceert** (`https://`), anders de laagste poort met `http://`. HTTPS wint bewust: die
  link werkt vanaf zowel een http- als een https-dashboard, terwijl een http-link vanaf een
  https-pagina als mixed content sneuvelt — de status-ping als eerste, waardoor de tegel offline
  lijkt terwijl de container draait. Prijs: bij een self-signed certificaat waarschuwt de browser
  één keer. Concreet: webtop levert nu `https://host:3021` in plaats van `http://host:3020`.
- **Docker-scan waarschuwt bij een domein-host:** bouwt de scan zijn tegels op een hostnaam die
  geen IP-adres is, dan wijzen ze naar je reverse proxy en niet naar de containerpoorten — de
  scan kan dat niet weten, want Docker levert alleen poortnummers. In plaats van stilzwijgend
  kapotte tegels af te leveren staat er nu een melding bij het scanresultaat met de vraag om het
  LAN-IP in te vullen.
- **Tegel verwijderen liet zijn widget staan — mét API-sleutel:** `deleteApp()` haalde de app uit
  de categorie en verder niets. `serverConfig.appWidgets[app.id]` bleef achter: een configuratie
  die je daarna nergens meer kunt zien of bewerken, met de API-sleutel van die app erin. In een
  lang gebruikte installatie stapelt dat op — hier vier verweesde entries (sabnzbd, radarr,
  sonarr, jellyfin) van een NAS die al met pensioen is. `deleteApp()` ruimt de bijbehorende
  widget nu mee op; de push gaat in dezelfde POST mee, dus geen extra ronde naar de server.
- **Bestaande wezen worden automatisch opgeruimd:** de fix hierboven voorkomt nieuwe, maar wie al
  een tijd draait heeft ze al staan en kan er via de UI niet meer bij — zonder tegel is er geen
  knop. `pruneOrphanWidgets()` verwijdert bij het starten elke widget waarvan de tegel niet meer
  bestaat, en slaat alleen op als er echt iets weg moest. Bewust in de app en niet als los
  opruimscript: dat zou iedereen zelf moeten vinden en draaien, terwijl juist wie het nodig heeft
  er nooit van hoort. Veiligheidsrem: zonder ook maar één app in de categorieën, of met een config
  die niet geladen kon worden, doet hij niets — anders zou een half geladen config alle widgets
  wissen.
- **Verwijderde tegel kon terugkomen na een refresh:** `pushCategoriesToServer()` begon met
  `if (!serverConfig) return;` — een stille skip. Was de config-api net niet klaar of even weg,
  dan landde je wijziging alleen in localStorage, terwijl bij het laden juist de server wint
  (`syncCategoriesWithServer`). Resultaat: de tegel stond er na een refresh weer, en er was nooit
  iets gemeld. Nu wordt de config alsnog geladen, en lukt dat niet, dan zegt een melding dat de
  wijziging alleen op dit apparaat staat. De init-fase is uitgezonderd via `_categorieSyncKlaar`,
  zodat de lokale cache de serverversie niet kan overschrijven voordat de sync heeft beslist.
- **App URL-veld (`//` / bare IP):** modal Add/Edit App gebruikte `input type="url"`, waardoor browsers tussentijds `//` blokkeerden bij typen. Nu `type="text"` + `inputmode="url"`. Bij opslaan (en bij openen van tegels) wordt `http://` automatisch gezet als er geen scheme staat — bare `192.168.x.x:port` opent niet meer als relatief pad op het dashboard.
- **`/`-sneltoets at slash in URL-velden:** globale hotkey “druk `/` → focus zoekbalk” deed `preventDefault` op **elke** `/`, behalve in de zoekbalk zelf. In App toevoegen/bewerken (en andere inputs) kon je daardoor geen `http://` typen. Hotkey negeert nu alle `input`/`textarea`/`select`/contenteditable.

### Verbeterd (Changed) — lab/release tooling
- **Docker Hub README sync** — `hub-readme-sync.sh` werkt full + short description bij via de gratis Hub API (dashboard + config-api). Aangeroepen door `push.sh` na image-push; los te draaien voor README-only updates. Auth: `docker login` of `DOCKERHUB_*`.
- **Pre-build changelog** — standaard “In uitvoering / In progress”-stub wordt van de *release*-sectie gestript (blijft alleen onder `*-dev`).


## [v1.9.10] - 2026-08-06

### Toegevoegd (Added)
- **Achtergronden via config-api (cross-device)** — Statisch, dynamisch (5 slots) en live wallpaper worden als **bestanden** opgeslagen onder `/app/data/wallpapers/` via `POST /api/wallpapers/:slot`. `config.json` houdt alleen lichte URL-refs (`/api/wallpapers/static.jpg`). Domein/IP/browsers delen dezelfde look. Migratie: bestaande localStorage data-URLs worden eenmalig naar de server geüpload.
- **Wallpaper sync-status** in Instellingen — “gesynchroniseerd” vs “alleen dit apparaat” als de config-api offline is.
- **Release-popup config-api** — Melding `config-api-required-1.9.10` voor early installs zonder config-api (max 1×, hardened popup-systeem).
- **Live wallpaper GA** — Feature flag standaard aan; video max ~20MB op de server (niet meer base64 in localStorage).

### Opgelost (Fixed)
- **Container-knoppen ontbraken op veel tegels** — Start/Stop/Herstart verscheen alleen als de host-poort uit de tegel-URL voorkwam in de poortenlijst van Docker. Die lijst is in drie gevallen leeg of onbruikbaar: bij een **gestopte** container (`Ports: []` — precies wanneer je Start nodig hebt), bij `network_mode: host` (jellyfin, home assistant, qbittorrent, scrypted, music-assistant hadden dus **nooit** knoppen) en bij een tegel die via een **domein** gaat en geen poort in de URL heeft. Er is nu een tweede stap: match op **containernaam** of op het compose-servicelabel, allebei ook beschikbaar als de container uit staat. De poort-match blijft eerst — die is preciezer als twee tegels naar dezelfde host wijzen. Zelf-bescherming (dashboard + config-api) ongewijzigd.
- **Weer-radar widget: CSS-stretch bij size-wissel** — Bij S/M/L bleef de canvas op oude pixel-afmetingen staan en werd alleen opgerekt. Nu: `ResizeObserver` + `onResize` na size-change → volledige re-paint op de nieuwe breedte/hoogte (geen refresh meer nodig).
- **Release-popup bleef terugkomen** — (meegenomen uit 1.9.9-build-1) belangrijke updates max 1×, meteen als gezien, cross-device dismiss + `expireAfter`.

### Verbeterd (Changed)
- **Weer-radar widget layout (large)** — Kaart vult de widget-body (geen lege dode zone onder de map in canvas mode). Layer-chips als overlay op de kaart (pill-stijl), zoom-controls strakker. Size S toont alleen emoji’s; M/L emoji + label. Optionele min-hoogte i.p.v. vaste `height` in config.
- **Config POST guard** — Grote `data:`-URLs in config.json worden geweigerd (413); media hoort via `/api/wallpapers`.

## [v1.9.9-build-1] - 2026-08-01

### Opgelost (Fixed)
- **Release-popup bleef terugkomen** — De weather-backdrop melding (v1.8.5) bleef bij sommige users steeds opnieuw verschijnen. Dat is verleden tijd: een belangrijke update of fix verschijnt nu **maximaal 1×**, wordt meteen als gezien gemarkeerd, en blijft daarna weg (ook na refresh, ander device of IP vs domein).

## [v1.9.9] - 2026-08-01

### Toegevoegd (Added)
- **Canvas mode cross-device** — `canvasMode` staat nu in server-config (niet alleen localStorage). Domein vs IP / browsers delen dezelfde toggle; migratie van bestaande localStorage-voorkeur bij eerste load.
- **Changelog i18n** — Engelse UI laadt `CHANGELOG.en.md`; Nederlands blijft `CHANGELOG.md`. Andere talen vallen terug op Engels → NL.
- **Global radar (RainViewer)** — Buiten Europa (en als Weerenradar faalt) laadt Live Radar / de home-widget wereldwijde neerslag via [RainViewer](https://www.rainviewer.com/) tile API. Auto-select: Europa → Weerenradar first; elders → RainViewer first. Werkt met je geconfigureerde lat/lon (VS, Azië, AU, …).
- **Weerenradar overlay-set** — Live Radar gebruikt dezelfde snippet-layergroups als [weerenradar.nl](https://www.weerenradar.nl): **Regen** (`RegenRadar`), **Wolken** (`CloudRadar`), **Temp** (`Temperature`), **Wind** (`Gust`), **Bliksem** (`Lightning`), **Weer** (`WetterRadar`). API: `tiles.wo-cloud.com/snippet-tiles`.
- **Temperatuurlabels op de Weer-kaart** — Op de laag **Weer** (en **Temp**) worden stadspunten, plaatsnamen en **°C** getekend op de officiële `cities[]`-posities. Temperaturen komen uit de composite-tile metadata (`X-Custom-Body: temperature:N:json`), net als op weerenradar.nl.
- **Zoom UI** — Eigen zoomcontrols (`+` / niveau / `−`, bereik 5–10) met live zoomlabel; default zoom ≈ 7 (zoals de weerenradar URL).
- **Home-widget “Weer Radar”** — Standalone home-widget (`weather-radar`) met dezelfde Weerenradar-engine: laagwissels, zoom, auto-refresh 5 min. Toevoegen via **Instellingen → Home Widgets**. Config: standaardlaag, zoom, kaarthoogte. Deel-engine: `paintRadarView()` (expanded panel + widget).

### Opgelost (Fixed)
- **Layer toggles niet zichtbaar live** — Stale Docker bind-mount (oude inode van `index.html`); container-restart remountte de actuele file. Tab-selector gescoped naar `.weather-tab-buttons` zodat layer-active state niet meer gewist wordt.
- **Bewolking “not supported”** — RainViewer infrared-feed was leeg; vervangen door **Weerenradar CloudRadar**, fallback **Buienradar** satelliet NL (`processing-cdn.buienradar.nl/.../satellite/europe/combined/NL/`).
- **Zoom knoppen stuk** — `+`/`−` gebruikten per ongeluk `.btn-action` (`width: 100%` voor form-knoppen). Vervangen door `.radar-zoom-btn`.
- **Radar render** — Loading-overlay blokkeert knoppen niet (`pointer-events: none`); race-guard bij snelle zoom/layer-wissel; composite-tiles laden via `fetch` + metadata-strip zodat trailing JSON de image-decode niet breekt.

### Verbeterd (Changed)
- **Neerslag-engine** — Europa: Weerenradar snippet → XYZ → RainViewer. Wereldwijd: RainViewer first. Zoom 5–11.
- **Kaarthoogte** — Live Radar panel ~300px voor meer ruimte voor overlay-chips + labels.
- **Dynamische canvas-hoogte** — In canvas mode groeit `#standalone-widgets` mee met de laagste widget, zodat footer (Powered by / versie-changelog) niet meer onder absolute widgets verdwijnt.

## [v1.9.8] - 2026-08-01

### Toegevoegd (Added)
- **Buienradar JSON Integration** — Ondersteuning voor de officiële Buienradar feed (`data.buienradar.nl/2.0/feed/json`). Haalt automatisch actuele station-metingen op van het dichtstbijzijnde meetstation (bijv. Meetstation Berkhout voor Hoorn/West-Friesland) voor temperatuur, gevoelstemperatuur, wind en weerbeschrijving.
- **2-Uurs Neerslaggrafiek Widget** — Uitklapbare 2-uurs neerslagvoorspelling in het weer-paneel via het Buienradar GPS-endpoint (`gps.buienradar.nl/getrr.php`). Rendert een strakke glassmorphic staafgrafiek met neerslagintensiteit in mm/u en verwachtingssamenvatting.
- **Live High-Res Tile Radar Canvas** — Geïntegreerde HTML5 Canvas radar-engine die live neerslag-tiles laadt van Weerenradar.nl (`cdn.weerenradar.nl/radar/tiles/periodCurrentHighRes/`). Inclusief CartoDB Dark basemap, zoomknoppen en exacte GPS-locatie marker.
- **Live Satelliet & Bewolkingslaag** — Layer selector knoppen (`[ Neerslag ]` vs `[ Bewolking ]`) op de radar canvas om te switchen tussen neerslagintensiteit en een live infrarood satelliet-wolkendek.
- **Provider Selector in Instellingen** — Kies in het weer-instellingenmenu tussen `Automatisch (Buienradar voor NL + Open-Meteo fallback)`, `Buienradar JSON` of `Open-Meteo API`.

### Verbeterd (Changed)
- **Symmetrische Segmented Header** — De kopregel van de uitgebreide Weer & Radar card herontworpen als een strakke, symmetrische 3-koloms raster-controller (`7-Daagse` | `2u Neerslag` | `Live Radar`).

## [v1.9.6] - 2026-06-30

### Toegevoegd (Added)
- **USB Eject Host-documentatie** — Een gedetailleerde handleiding toegevoegd (`docs/USB_EJECT.md`) voor het configureren van de host-side watcher in SIGNAL-modus op verschillende platformen (Debian/Ubuntu/Proxmox met Systemd, en Synology DSM met de Task Scheduler). Tevens is de hoofd-README.md bijgewerkt met een directe link.
- **Thema Home-indelingen** — Elk thema bevat nu een eigen widget-indeling (`homeLayout`) voor de Home tab. Bij het wisselen van thema wordt de gebruiker gevraagd of de indeling overgenomen moet worden. De eigen indeling wordt automatisch gebackupt en hersteld bij terugkeer naar "Mijn eigen stijl". De 4 meegeleverde thema's hebben elk een uniek karakter:
 - Classic Tiles: Gebalanceerd (klok, bookmarks, notities, system-info).
 - Glass Ocean: Living room (grote klok, agenda, bookmarks, notities) met immersive weather.
 - Midnight Neon: Monitoring-first (system-info groot, watchtower, quickstats, compacte klok).
 - Nordic Frost: Minimalistisch (klok, bookmarks, agenda — weinig widgets, veel rust).

## [v1.9.5] - 2026-06-17
### Toegevoegd (Added)
- **Showcase Media & Documentatie** — Volledig bijgewerkte documentatie met GIFs en screenshots van de cinematic weather effects, bliksem en widgets.
- **Command-mapping** — Stop-actie voor Proxmox VM's/containers gemapt aan graceful shutdown.

### Verbeterd (Changed)
- **i18n Synchronisatie** — Verdere plooiing en synchronisatie van alle i18n-vertaalbestanden.
- **Healthcheck** — API container-healthcheck poort-mapping gecorrigeerd naar poort 3000.

## [v1.9.4] - 2026-06-16
### Toegevoegd (Added)
- **VM & Service Control Widget** — Een volledig generieke widget ter vervanging van de oude Proxmox-widget. Ondersteunt nu Proxmox VE API, Systemd Services en Custom Commandos (zowel lokaal als remote via SSH).
- **Multi-VM & Container Lijst** — Ondersteuning voor het opgeven van meerdere Proxmox VM/LXC ID's (komma-gescheiden). Toont een compacte statuslijst met individuele Start/Stop knoppen, uptime en CPU/RAM statistieken per machine in één widget.
- **Nginx API Proxying** — Routering toegevoegd voor de `/api/vmservice/` endpoints in de reverse proxy.
- **Command Palette Snelkoppelingen** — 'Home-indeling bewerken (Canvas mode)' en 'Home widgets beheren' toegevoegd aan het Command Palette (Cmd+K / Ctrl+K) voor betere vindbaarheid van edit-opties.
- **Globale Taalswitcher** — Een handige, zwevende taalknop toegevoegd in de linkerbovenhoek van het dashboard. Hiermee kunnen gebruikers direct de taal wisselen (Nederlands, Engels, Duits, Frans, Spaans) zonder in de instellingen te hoeven duiken. De knop synchroniseert automatisch met de actieve taal.

### Verbeterd (Changed)
- **Dashboard-brede Internationalisering (i18n)** — Alle resterende hardcoded teksten in `index.html` (zoals app-kiezer, Docker-scanner, agenda, bookmarks, RSS-feed, VM-acties, USB-beheer en systeem-benchmarks) vervangen door dynamische `t()` vertaal-aanroepen.
- **Synchronisatie Vertaalbestanden** — Alle vertaalbestanden (`nl.json`, `en.json`, `de.json`, `fr.json`, `es.json`) volledig gesynchroniseerd en aangevuld met ontbrekende instellingen- en USB/Service-sleutels. Elk bestand bevat nu exact 308 vertaalsleutels.

### Opgelost (Fixed)
- **Dynamische Canvas Hoogte** — Probleem opgelost waarbij de widgets op de Home tab buiten de parent container overflowden en lagere elementen overlapten. De containerhoogte wordt nu dynamisch berekend en aangepast op basis van de widgetposities en -hoogtes (met behulp van een `ResizeObserver` en drag event listeners).
- **Home Widgets Vertaling** — De titel en omschrijving van de "Home Widgets" sectie in de instellingen waren hardcoded in het Nederlands (inclusief incorrecte meertaligheid). Deze zijn nu overgezet naar het i18n-systeem (`data-i18n`) en netjes vertaald naar alle ondersteunde talen (NL, EN, DE, FR, ES), inclusief een grammaticale verbetering ("gesynchroniseerd tussen al je apparaten").

## [v1.9.3] - 2026-06-14
### Toegevoegd (Added)
- **Universele USB Eject Architectuur** — Ondersteuning voor meerdere eject-methoden via `USB_EJECT_METHOD`. 
 - `signal` (standaard): Veilig asynchroon systeem via host-scripts.
 - `native`: Direct ontkoppelen vanuit de container (vereist `privileged: true`).
- **Geautomatiseerde GitHub Pipeline** — Nieuw `./github-push.sh` script en integratie in de release flow. Synchroniseert broncode, tags en documentatie automatisch met GitHub.
- **Auto-Sync Footer Versie** — De footer in `index.html` synchroniseert nu automatisch met de `APP_VERSION` constante in de JavaScript code.

### Verbeterd (Changed)
- **Repository Opschoning** — .gitignore geoptimaliseerd om beheer-scripts en roadmap privé te houden op GitHub terwijl de broncode publiek is.

## [v1.9.2] - 2026-06-14
### Toegevoegd (Added)
- **USB Beheer Widget** — Nieuwe standalone widget voor het veilig beheren van USB-sticks en externe SSD's. Bevat realtime feedback tijdens het ontkoppelen ("Bezig...") en een succes-melding ("Veilig verwijderd").
- **Veilige USB Eject Architectuur** — Asynchroon signaal-systeem tussen container en host. Voert `sync`, `umount` en `udisksctl power-off` uit op de Proxmox host voor maximale data-integriteit.
- **Live p95 Resource Metrics** — Elke container-tile toont nu direct de p95 CPU- en RAM-waarden uit de meest recente systeem-benchmark. Gebruik `?ff=metricsP95` om te testen.
- **Gestandaardiseerde Monitoring Tooling** — Nieuw monitoring framework met output naar een centrale stats directory. Dit framework voedt de nieuwe metrics-sectie op het dashboard.
- **USB API Endpoints** — Nieuwe backend endpoints: `GET /api/usb/list`, `POST /api/usb/eject` en `POST /api/usb/clear-ejected`.

### Verbeterd (Changed)
- **Node.js Compatibiliteit** — De `config-api` draait nu op Node 18 (`node:18-alpine`) om compatibiliteit met oudere server-omgevingen te waarborgen.
- **Healthcheck Update** — De container healthcheck voor de API is gecorrigeerd naar de juiste interne poort (3000).
- **Opslag-conventies** — Benchmark resultaten en logs zijn verhuisd naar een gestandaardiseerde locatie om de host schoon te houden.

## [v1.9.1] - 2026-05-17
### Opgelost (Fixed)
- **Statische wallpaper cross-device sync** — `hobbithole_bg` wordt nu ook opgeslagen in `serverConfig.wallpaper` via `/api/config`. Bij site-data clear of een nieuw device wordt de wallpaper hersteld vanuit de backend ipv "geen achtergrond". Dynamic + Live wallpapers blijven localStorage-only tot v2.0 (te groot voor JSON config-sync, krijgen aparte endpoint).
- **Default IP fallbacks weg** — Hardcoded `192.168.1.169` fallbacks vervangen door `window.location.hostname`. Placeholders zijn nu generiek (`192.168.1.x`, `your-server`). Dashboard werkt out-of-box op iedere host zonder eerst Settings → Docker IP te moeten invullen.

## [v1.9.0] - 2026-05-16
### Toegevoegd (Added)
- **Theme Engine (achter `?ff=themeEngine`)** — eerste stap richting v2.0's "Home Experiences". Themes zijn JSON-presets in `themes/<id>.json` die als CSS-overlay op `<html>` worden toegepast. De gebruikerseigen accent/transparency in localStorage blijft onaangeroerd, dus "Mijn eigen stijl" herstelt altijd correct. Active thema wordt cross-device gesynchroniseerd via `serverConfig.themeId` — kies op desktop, ziet 'm meteen terug op mobile. Te activeren via Settings → Vormgeving → **Thema Experience**.
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
- **Dynamic Wallpapers (macOS-stijl)** — Ondersteuning for 5 afbeeldingen (slots) die automatisch wisselen op basis van het tijdstip van de dag (Early Morning, Day, Sunset, Evening, Night). Creëer je eigen 'Dynamic Desktop' ervaring direct in je homelab.
- **Wallpaper-aware Cinematic FX** — Wanneer een wallpaper (statisch, dynamisch of video) actief is, verbergt het dashboard automatisch de 'Sky' gradient. Alleen de weer-elementen (wolken, regen, sneeuw, bliksem) worden over je wallpaper heen geplaatst voor een naadloze, filmische integratie.
- **Toggle: Weer-elementen** — Nieuwe master toggle in de instellingen om specifiek de weer-effecten (wolken, regen, sneeuw, bliksem) aan of uit te zetten, los van de lucht-gradient.
- **Toggle: Sky Layer** — De 'Cinematic Backdrop' toggle is verfijnd en bedient nu specifiek de lucht-laag (kleurovergangen, sterren, zon en maan).

### Verbeterd (Changed)
- **Refactoring: UI/Sky Layering** — De code voor de lucht- en weer-lagen is volledig herschreven om beter samen te werken met de nieuwe wallpaper-opties. Betere prestaties en minder visuele glitches bij het wisselen van thema's.
- **Smart Backdrop logic** — Verbeterde logica voor het detecteren van actieve achtergronden om onnodige canvas-bewerkingen te voorkomen.

## [v1.8.5] - 2026-05-12
### Toegevoegd (Added)
- **Cinematic weather backdrop is nu GA** — Apple Weather-stijl achtergrond is uit feature-flag gehaald en standaard aan voor iedereen. Sky-kleur die meeloopt met het echte weer + tijdstip (sunrise warm, day blue, sunset purple, night deep navy), volumetrische wolken met two-pass shading, sterren bij heldere nacht, lightning bij onweer. Inclusief de v1.8.4 performance fix (sprite caching, 50× minder canvas-ops per frame). **Niet je smaak? Uit te zetten via Settings → Customize → Cinematic backdrop.** Cross-device gesynchroniseerd via `serverConfig.weatherBackdrop`.
- **First-run release modal** — nieuwe mechanisme voor "what's new" pop-ups bij grote feature releases. Toont eenmaal per user per announcement-id, dismissable, persisted in `hobbithole_dismissed_announcements`. Eerste gebruik: bovengenoemde cinematic backdrop GA-aankondiging. Toekomstige releases kunnen één regel toevoegen aan de `RELEASE_ANNOUNCEMENTS` array. Dev-hack: `#reset-announcements` URL hash wist de seen-list for testen.

### Verbeterd (Changed)
- **Canvas mode smart placement** (achter `?ff=canvasMode`) — nieuwe widget blocks landen nu op de eerste vrije plek via een snap-grid first-fit packer (top→bottom, left→right). Voorheen stackten ze altijd in de linker kolom, ongeacht beschikbare ruimte naast bestaande blocks. Werkt naast en onder elkaar tot het scherm vol is, dan opnieuw beneden.
- **Watchtower "Laatste scan" display** — toont nu de echte completion time (niet de click time) door scan completion te detecteren via `scans_total` metrics bumps. Werkt voor manual clicks én Watchtower's eigen cron scans. Plus context: "Net (22 gecheckt, 2 geüpdate)" ipv vage "eerder vandaag".

## [v1.8.4] - 2026-05-11
### Toegevoegd (Added)
- **Watchtower widget** — trigger Docker container updates handmatig vanuit het dashboard. Klik **Scan now** in de widget → Watchtower checkt al je images op Docker Hub → live stats verschijnen ("Containers: 22 · Laatste scan: 2u geleden · Updates totaal: 0"). Auto-refresh elke 30s. Vereist eenmalig HTTP API enable in je Watchtower compose (`WATCHTOWER_HTTP_API_UPDATE=true` + token + dashboard_net) — empty state in de widget toont stap-voor-stap setup-guide met copy-paste compose snippet. Backend: nieuwe endpoints `POST /api/watchtower/scan` + `GET /api/watchtower/metrics` via Bearer token.
- **Settings → Externe services sectie** — nieuwe collapsible sectie voor third-party service config (Watchtower nu, Prometheus/Grafana later). Watchtower integration card met URL + masked token + Test verbinding + Opslaan. Cross-device synced via `serverConfig.watchtower`. Elke integration card is individueel inklapbaar — schaalt naar 10+ integrations zonder lange Settings lijst.
- **Live wallpaper** (achter `?ff=liveWallpaper`, desktop only) — upload een geoptimaliseerde MP4/WebM loop (5-15s, <10MB) als bottom-layer background. Auto-disabled op mobile (battery/data). Upload UI in Settings → Achtergrond met size warnings + ffmpeg tip. **Bonus combo voor wie ook de `?ff=cinematicWeather` flag actief heeft**: video wordt the sky, alleen weer-particles (clouds/rain/snow/lightning) compositen erover — geen day/night gradient meer over de video. Pure film-vibe.

### Verbeterd (Changed)
- **Cinematic weather clouds rewrite** (alleen zichtbaar achter `?ff=cinematicWeather`) — Apple Weather-style volume met two-pass shading (subtiele blauw-grijze underside + heldere sunlit top), top-biased puff layout for de klassieke "platte bodem, puffy bovenkant" cumulus silhouet. Clouds zitten nu hoger in de sky (upper 65% ipv onderkant), groter, met meer puffs per cloud. Geen flat blobs meer.
- **Cinematic FX performance** (alleen zichtbaar achter `?ff=cinematicWeather`) — pre-bake cumulus clouds naar offscreen canvas-sprites. Render-loop doet nu `drawImage` per cloud ipv 16 radial gradient operations. ~50× minder per-frame canvas work, fixed scroll-stutter die optrad met de nieuwe voluminous look. Lichtere mobile load wanneer de FF aan staat.

### Opgelost (Fixed)
- **Mobile app drag-misfire** — bij scrollen of tappen kon je per ongeluk een app van plek wisselen. SortableJS heeft nu `delay: 500ms` op touch (`delayOnTouchOnly: true`) — long-press is nodig om reorder te starten, instant op desktop. Matched iOS/Android home screen pattern.

## [v1.8.3] - 2026-05-11
### Toegevoegd (Added)
- **Container quick actions** — via ⋯ menu op elke tegel kun je nu Docker containers direct **starten**, **stoppen** of **herstarten** zonder Portainer of SSH te openen. Buttons verschijnen automatisch alleen op tegels die mappen naar een Docker container (via port matching). Stopped containers tonen Start, running containers tonen Stop + Restart. Stop/Restart vragen confirmatie ("Container `jellyfin` stoppen?"). Toast feedback bij elke actie, status dot ververst automatisch na 3s zodat je groen→rood→groen ziet bij een restart. **Self-protection**: Hobbithole's eigen containers (`hobbithole-dashboard`, `hobbithole-config-api`) tonen geen actions — voorkomt dat je je eigen tak afzaagt. Backend: nieuwe nginx proxy locations `POST /api/container/{id}/{action}` via Docker socket. Containers list 5s gecached om de Docker API niet te hammeren bij het openen van meerdere menu's.

### Verbeterd (Changed)
- **Titel + ondertitel syncen nu cross-device** — voorheen leefden je custom dashboard-titel en ondertitel in localStorage (per device), dus na het wisselen van browser of het wissen van site data waren ze weg. Ze worden nu via `/api/config` opgeslagen, zelfde patroon als categories en weather. localStorage blijft als offline cache. One-time migration: bestaande lokale waarden worden bij eerste load automatisch naar de server gepusht.
- **Info-bordje bij Achtergrond instelling** — achtergrond blijft (voorlopig) lokaal opgeslagen omdat base64 images snel MB's worden. Settings toont nu duidelijk waarom, wat 't risico is bij browser-data wissen, en een directe link naar Backup & Restore om een veilige kopie te maken. Cross-device achtergrond staat op de roadmap voor een latere release.

### Opgelost (Fixed)
- **Mobile Edge cachet `index.html` te agressief, mist updates** — zonder cache-control headers interpreteerden mobiele browsers (vooral Edge) de HTML als "permanent cachebaar", waardoor users na een update de nieuwe versie pas zagen na "Cached images and files" handmatig wissen of incognito te gebruiken. Voor 450+ Docker Hub pulls is dat een echt product-probleem (mensen zien nieuwe features niet, denken dat 't bij hen niet werkt). Nginx serveert nu `Cache-Control: no-cache, must-revalidate` op alle statische content → browser revalidate't elke load, krijgt `304 Not Modified` als er niets veranderde (snel) of de nieuwe HTML als er wel een update is.

## [v1.8.2] - 2026-05-11
### Toegevoegd (Added)
- **Rebalanced S/M/L sizes — nu écht groter, en groeien óók in hoogte** — voorheen voelde de M size te klein en groeiden widgets alleen horizontaal terwijl content vaak vertikaal stacked (RSS items, kalender events, bookmarks). Nieuwe maten: S=240×0.7h, M=360×1.0h (was 320), L=540×1.6h. L toont nu ongeveer 2× zoveel content als M. Heights schalen automatisch op basis van de widget-type default × multiplier.
- **refresh Refresh knop op data widgets** — RSS, Calendar en Quick Stats widgets krijgen een refresh knop in de header die de server-cache bypasst. Use case: je publiceert net een blog post en wil 'm direct in je RSS widget zien (anders 30 min wachten). Server-endpoints accepteren `?refresh=1` query param om cache te omzeilen.
- **Per-widget default hoogtes in canvas mode** — nieuwe widget blocks landen nu op een hoogte die past bij hun content. RSS Feed → 320px (toont ~5 items), Calendar → 280px, System Info → 220px, Bookmarks → 240px, Notes → 200px, Clock → 160px, Quick Stats → 160px, Iframe → 320px. Geen handmatig slepen meer nodig om alles te laten passen.
- **"Wat is er nieuw" changelog modal** — klik op het versienummer in de footer (of via Command Palette → "Release notes") en de volledige CHANGELOG opent in een Glass-UI modal. **NEW badge** verschijks automatisch naast het versienummer als je nog niet de huidige versie hebt gezien, en verdwijnt zodra je de modal opent. CHANGELOG.md was al in de Docker image gebakken — nu eindelijk zichtbaar voor users. Simpele markdown renderer (## versies, ### secties, **bold**, `code`) → geen externe library nodig.
- **Feedback & Suggesties sectie in Settings** — directe knoppen naar GitHub voor bug rapporten (` Bug rapporteren`), feature suggesties (` Idee insturen`) en de volledige issues lijst. Maakt 't voor users laagdrempelig om feedback te geven, essentieel voor de groeiende community rond Hobbithole.
- **Vriendelijk empty-state op Home tab** — als je nog geen widgets en geen pinned apps hebt, toont Home nu een grote welkom-hero met " Voeg je eerste widget toe" CTA-knop die direct naar de widget picker in Settings springt. Home tab is altijd zichtbaar (was: alleen als je content had) zodat nieuwe users meteen ontdekken dat ze hun eigen canvas kunnen maken.

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
- **Collapsible setting sections** — drie tool-secties die niet iedereen gebruikt ( Synology Apps, Heimdall Import, Homarr Import) zijn nu inklapbaar in Settings. Standaard ingeklapt, klik op heading om uit te klappen, choice persisteert per-sectie in localStorage. Minder scroll, schoner.

## [v1.8.0] - 2026-05-10
### Toegevoegd (Added)
- **Widget size knoppen (S/M/L)** — elke standalone widget heeft S/M/L knopjes in de header. Small = 1 kolom, Medium = 2 kolommen, Large = full row. Voor dichtere of breder uitlopende layouts. Mobiel: altijd full-width (size knoppen verborgen).
- **App-Widget blokken** — apps met geconfigureerde widget data kunnen nu als groot Home-blok geplaatst worden. Rich rendering: groot app-icoon, naam, primary value LARGE, secondary stats grid. Twee manieren om toe te voegen: Settings → Home Widgets → " App als widget" card, OF via app's ⋯ menu → "Pin op canvas". Auto-update wanneer widget data binnenkomt.

### Verbeterd (Changed)
- **Home tab is nu een echte home screen** — widgets verschijnen alleen op de Home tab (niet meer dwars door alle tabs heen). Home tab is altijd zichtbaar zodra je widgets of gepinde apps hebt. Alle/category tabs = pure app catalog.
- **CSS Grid layout** for standalone widgets (was flex) — foundation voor toekomstige free-placement canvas. Geen visuele wijziging.

## [v1.7.3] - 2026-05-10
### Toegevoegd (Added)
- **Image widget** — toon een afbeelding op je dashboard. URL plakken én/of bestand uploaden (max 500KB, opgeslagen als base64 in config — voor grotere images is een URL beter). Optionele click-link en bijschrift.
- **Iframe embed widget** — embed elke URL als live frame (Grafana panel, custom dashboard, monitoring page). Configureerbare hoogte. Werkt het beste met homelab tools die geen X-Frame-Options blokkering hebben.
- **Quick Stats widget** — toont één live nummer van een custom HTTP endpoint. Configurabel via API URL + optionele JSON path (bv. `data.cpu`) + label + unit. Server-side fetch via nieuwe `/api/quickstat` endpoint, 5 min cache. Werkt met JSON én plain text responses.
- **`image-upload` veld-type** in de generic widget config modal — herbruikbaar voor toekomstige widgets die een afbeelding nodig hebben (background, logo, profile photo). URL veld + upload knop met grootte-validatie.

### Opgelost (Fixed)
- **Command palette tap-bug op mobiel** — items selecteren werkte niet via tap. De `onmouseover` handler triggerde een full re-render, waardoor tijdens een tap het doel-element verdween tussen tap-down en tap-up. Vervangen door `onmousemove` met lichte class-toggle (geen re-render). Werkt nu identiek op desktop en mobiel.

## [v1.7.2] - 2026-05-09
### Toegevoegd (Added)
- **System Info widget** — Docker stats als first-class widget block: running/total containers, images, CPUs, memory + Docker versie. Refresh elke 30s. Vervangt de oude vaste top-bar.
- **Bookmarks widget** — lijst van quick links binnen één widget. Inline +/- editing (naam, URL, optionele emoji), auto-prepend van `http://` als je 't vergeet. Cross-device sync.
- **RSS feed widget** — toont 5 headlines uit een RSS 2.0 of Atom feed met relatieve tijd ("2u", "3d", datum bij ouder). Server-side fetch + parse via nieuwe `/api/rss` endpoint, 30 min cache. Eigen mini-parser handelt CDATA en HTML entities.

### Verbeterd (Changed)
- **Top-bar verwijderd** — de vaste system-info bar bovenaan is weg. Diezelfde info zit nu in de relocatable widget. Past bij de richting van het v2.0 customizable Home canvas waar alles vrij plaatsbaar wordt.

## [v1.7.1] - 2026-05-08
### Toegevoegd (Added)
- **Calendar widget** — toont 5 komende events uit een ICS feed (Google Calendar, iCloud, Outlook, Synology Calendar, Nextcloud — overal waar je een ICS link kunt exporteren). Server-side fetch + parse via `config-api` (geen CORS issues, 10 min cache per URL). Toont "Vandaag · 14:00 — Meeting" stijl met datum-aware labels (Vandaag/Morgen/Wo 13 mei).
- **Drag-and-drop for home widgets** — sleep widgets in willekeurige volgorde via de `⋮⋮` handle in de widget header. Volgorde wordt server-side opgeslagen, dus consistent op al je devices.
- **Generic widget config modal** — herbruikbare modal voor widgets met instellingen (Calendar gebruikt 'm voor de ICS URL). Toekomstige widgets met config-velden plug in via `configSchema` op de widget definition.
- **instel-knop** op widgets met configSchema — klik in de widget header om bestaande config te bewerken zonder verwijderen + opnieuw toevoegen.

### Opgelost (Fixed)
- **ICS timezone parsing** — events met `TZID=Europe/Amsterdam` worden nu correct geconverteerd naar UTC met DST-aware offset detection via `Intl.DateTimeFormat`. Voorheen werden non-UTC events 1-2 uur verschoven weergegeven.

## [v1.7.0] - 2026-05-08
### Toegevoegd (Added)
- **Standalone widget architectuur** — een nieuwe sectie boven de categorieën waar widgets leven die NIET aan een tegel gekoppeld zijn (zoals een klok of notitie). Foundation voor het v2.0 customizable Home canvas. Widget types self-registreren via een registry, dus toekomstige widgets kunnen incrementeel landen.
- **Klok widget** — live tijd (HH:MM:SS, tabular-nums for stabiel display) + datum in jouw geselecteerde dashboard-taal. Tikt elke seconde, geen config nodig.
- **Notitie widget** — sticky note met textarea, auto-save (debounced 400ms), cross-device gesynchroniseerd via `config.json`. Schrijf op je PC, verschijnt op je telefoon na refresh.
- **Home Widgets sectie** in instellingen — visueel grid van klikbare widget cards (icon + naam + beschrijving). Klik = direct toevoegen. Schaalt naar tientallen widget types in toekomstige versies zonder UI te overspoelen.
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
