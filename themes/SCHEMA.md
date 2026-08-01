# Hobbithole Theme Schema

This document describes the JSON schema for Hobbithole themes ("Home Experiences"). A theme is a complete, ready-to-use Home dashboard preset — visuals, settings, and (in future versions) a default widget layout — that the user can pick in Settings → Vormgeving → Thema Experience.

Themes live in `themes/<id>.json` in the dashboard project. First-party themes ship with the Docker image. Community themes (starting v2.0) can be contributed via PR or imported through the picker.

## Field reference

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Stable identifier. **Must match `^[a-z0-9-]+$`** — lowercase letters, digits, hyphens only. Used in URLs (`/api/themes/<id>`) and as filename (`<id>.json`). |
| `name` | string | yes | Human-readable name shown in the theme picker. |
| `author` | string | yes | Theme author handle or display name. |
| `version` | string | yes | SemVer string for the theme itself (e.g. `"1.0.0"`). Independent of the Hobbithole version. |
| `description` | string | recommended | One-line tagline shown in the picker / preview tooltip. |
| `screenshot` | string \| null | recommended | URL or relative path to a preview image. `null` if none. **Reserved — currently unused; picker preview lands in v1.9.2.** |
| `tags` | string[] | recommended | Categorisation for filtering (e.g. `["dark", "media", "dense"]`). Used by the picker when v1.9.2 filter UI lands. |
| `visuals` | object | yes | Map of CSS custom property name → value. Applied as an overlay on `<html>`. See [Visuals](#visuals). |
| `config` | object | optional | Per-theme dashboard setting overrides. See [Config](#config). |
| `homeLayout` | object \| null | optional | Pre-populated Home canvas widget layout. When a user selects a theme with a `homeLayout`, they are prompted to adopt the layout (their own layout is backed up and restored when switching to "Mijn eigen stijl"). See [Home Layout](#home-layout). |
| `liveWallpaper` | object \| null | optional | **Reserved for v2.0.B** — bundled looping video/dynamic wallpaper. Set to `null` until then. |
| `widgetVariants` | object \| null | optional | **Reserved for v2.0.B** — visual variants for widgets (glass / minimal / info-dense). Set to `null` until then. |

## Visuals

Themes change appearance by overriding CSS custom properties on `<html>`. **They do not write to the user's localStorage** — when a user reverts to "Mijn eigen stijl" (custom), their personal accent/transparency/etc. settings come back unchanged.

Available CSS variables (all optional — a theme can override any subset):

| Variable | Purpose | Default |
|---|---|---|
| `--bg-color` | Base background colour | `#0f172a` |
| `--accent-color` | Primary accent (buttons, links, highlights) | `#38bdf8` |
| `--card-bg` | Card / tile background (usually rgba with transparency) | `rgba(30, 41, 59, 0.7)` |
| `--text-color` | Body text colour | `#f8fafc` |
| `--border-color` | Card borders and dividers | `rgba(255, 255, 255, 0.1)` |
| `--blur-amount` | Backdrop-filter blur for glass effects | `12px` |
| `--card-radius` | Border radius on large surfaces (tiles, modals) | `20px` |
| `--card-radius-md` | Border radius on popovers, menus | `12px` |
| `--card-radius-sm` | Border radius on buttons, inputs | `8px` |
| `--card-radius-xs` | Border radius on badges, kbd hints | `4px` |

Use only the variables you intend to change. Omitted variables fall through to the user's own settings or the v1.x defaults.

## Config

Optional dashboard setting overrides. The theme expresses *what fits its vibe*; the user can still toggle these in Settings if they disagree.

| Field | Type | Description |
|---|---|---|
| `weatherBackdrop` | string enum | One of `"off"`, `"subtle"`, `"standard"`, `"immersive"`. Controls Apple-Weather-style cinematic backdrop intensity. |
| `statusDots` | boolean | Whether live status dots on tiles are visible by default. |

> **Note:** `weatherBackdrop` must be a string. The legacy boolean form (`true` / `false`) is not supported and will be rejected by future validators.

## Home Layout

Optional pre-populated widget layout for the Home tab. When a user selects a theme that includes a `homeLayout`, they are prompted to adopt it. Their own layout is backed up automatically and restored when they switch back to "Mijn eigen stijl" (custom).

### Structure

```json
{
  "homeLayout": {
    "blocks": [
      {
        "id": "theme-myid-clock",
        "type": "clock",
        "size": "m",
        "title": "Klok",
        "config": {}
      }
    ]
  }
}
```

### Block fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique block identifier. Use the pattern `theme-<themeId>-<purpose>` to avoid collisions with user-created blocks. |
| `type` | string | yes | Widget type. Must match a registered standalone widget (e.g. `clock`, `bookmarks`, `notes`, `system-info`, `watchtower`, `quickstat`, `calendar`, `rss`, `vmservice`, `proxmox`, `usb`, `image`, `iframe`, `app-widget`). |
| `size` | string | optional | Grid size: `s`, `m`, or `l`. Defaults to `m`. Controls width in grid mode and initial dimensions in canvas mode. |
| `title` | string | optional | Custom display title for the widget header. Falls back to the widget's registered label if omitted. |
| `config` | object | yes | Widget-specific configuration. Use the widget's `defaultConfig()` output as a starting point. Can be left as `{}` for widgets with no required config (e.g. `clock`, `system-info`). |

### Design guidance

Each theme should express a distinct home experience through its widget selection:

- **Monitoring-heavy** (e.g. Midnight Neon): `system-info`, `watchtower`, `quickstat` blocks, compact sizes.
- **Living room** (e.g. Glass Ocean): Large `clock`, `calendar`, `bookmarks`, generous sizes.
- **Minimal** (e.g. Nordic Frost): Few widgets, large sizes, calm layout.
- **Balanced** (e.g. Classic Tiles): Mix of productivity and system widgets.

## Example: minimal theme

```json
{
  "id": "midnight-mono",
  "name": "Midnight Mono",
  "author": "yourname",
  "version": "1.0.0",
  "description": "Pure black with subtle grey accents.",
  "screenshot": null,
  "tags": ["dark", "minimal", "mono"],
  "visuals": {
    "--bg-color": "#000000",
    "--accent-color": "#a3a3a3",
    "--card-bg": "rgba(20, 20, 20, 0.85)",
    "--card-radius": "4px",
    "--blur-amount": "0px"
  },
  "config": {
    "weatherBackdrop": "off",
    "statusDots": false
  },
  "homeLayout": null,
  "liveWallpaper": null,
  "widgetVariants": null
}
```

## Validation rules (server-side)

The `/api/themes/:id` endpoint enforces:

- `id` matches `^[a-z0-9-]+$` — invalid IDs return `400 invalid_id`
- File `themes/<id>.json` must exist — missing returns `404 not_found`
- File must be valid JSON — malformed returns `500 parse_failed`

The `/api/themes` list endpoint silently skips malformed files (logged as a warning), so a single broken theme cannot kill the picker.

## Contributing a theme (post-v1.9.0)

1. Create `themes/<your-id>.json` matching this schema.
2. Test locally: `http://<host>/?ff=themeEngine`, pick your theme in Settings → Vormgeving.
3. Open a PR. First-party themes live in `themes/`; community themes will move to `themes/community/` once v2.0.D lands.

## Compatibility & versioning

- Required fields (`id`, `name`, `author`, `version`, `visuals`) are stable — they will not break in future Hobbithole versions.
- Recommended fields (`description`, `screenshot`, `tags`) may gain semantics; existing values stay valid.
- Reserved fields (`liveWallpaper`, `widgetVariants`) get their shape defined in v2.0. Keep them `null` until then.
- `homeLayout` is live as of v1.9.6 — see [Home Layout](#home-layout).
- Unknown fields are ignored — safe to forward-add metadata.
