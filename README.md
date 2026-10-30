# Bloodborne Builds

A static, installable tier list of Bloodborne character builds. It runs in the browser, with no build step and no server, and is meant to be published with GitHub Pages from the repository root (`main`, folder `/`).

Tiers are an editorial synthesis of community opinion, weighted toward PvE, not an official ranking.

## Browse

- **Tiers** groups the builds into S, A, B, and C. Each card shows the name, archetype, main weapon, and a short playstyle. Open a card for the tier reason, weapons and firearm, the reference stat spread (VIT / END / STR / SKL / BLT / ARC) plus alternatives, runes and gear, pros and cons, best-for tags, NG+ notes, and source links.
- Filter by archetype (Strength, Skill, Bloodtinge, Arcane, Quality, Hybrid) and by best-for (PvE, PvP, beginner, chalice, NG+). Search by name, weapon, or playstyle. Sort within a tier by listed order, name, or main weapon.
- **Guides** lists the general guide pages, filterable by site type (wiki, guide, video).
- **About** holds the tier definitions, the research caveats, and how stat spreads are labeled.

Source links open in a new tab. A link flagged `unverified` in the data keeps a small marker.

## Data

Everything the app states about a build — names, tiers, stat numbers, gear, and URLs — comes from [`data/builds.json`](data/builds.json). That file is a research snapshot (`meta.generatedDate`: 2026-10-30): 19 builds and 25 guides, with links to Reddit, wikis, GameFAQs, articles, and videos. The app loads it at runtime and does not add stats or links of its own.

`meta.notes` records the caveat: tiers are an editorial synthesis of community opinion, not an official ranking. The S-tier description in `meta.tierScale` is the PvE-weighted end of that scale. Spreads are the published templates cited in each `stats.label` (some of those labels say the spread was synthesized from forum guidance).

## Install

`manifest.json`, the icons, and `sw.js` make the site installable. The service worker is network-first and names its cache with a version string (`CACHE` in `sw.js`), so a refresh on a connection picks up a new deploy and the cached shell is only the offline fallback.

Icons are an original saw-blade and crescent mark, not game artwork.

Serve the repository root with any static file server, or turn on GitHub Pages for `main` / root. Paths are relative, so the site works at a project-page URL as well as at the domain root.
