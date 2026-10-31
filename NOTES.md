# Notes

## What is real, and what is a sample

The build lists are the research snapshots and should be treated as the source of facts for tiers, spreads, and guide links:

- `data/bloodborne.json` — 35 builds, 30 guides
- `data/elden-ring.json` — 40 builds, 33 guides
- `data/demons-souls.json` — 33 builds, 34 guides

Bloodborne crafting and equipment are research snapshots from 2026-10-30, copied in unchanged:

- `data/bloodborne-crafting.json` — 6 categories, 141 items, 21 materials, 14 guides
- `data/bloodborne-equipment.json` — 5 weapon types, 54 weapons, 36 attire sets, 8 guides

Each of those screens has an About note. The equipment note covers weapons with no +10 row, firearm damage stored in the wiki’s blood column, and attire with no weight. The crafting note covers variable quantities, optional chalice rites, and gem effect families. The build list says “Blades of Mercy”; the equipment file says “Blade of Mercy”. Those sheets still link.

Elden Ring and Demon's Souls crafting and equipment are still **sample layout data**. Each of those files sets `meta.sample` and `source.unverified`. Replace the file, or point `crafting` / `equipment` in `data/games.json` at a new path, when the real lists arrive. The app hides a section when that key is missing.

## Maps

`data/bloodborne-map.json`, `data/elden-ring-map.json`, and `data/demons-souls-map.json` are original SVG region shapes drawn for this app. Pin coordinates are schematic. They are not copied from another site’s marker file, and the app does not request map tiles. A pin’s name and short description are common knowledge of that place; pins with `uncertain: true` say so on the sheet. Each pin can link out to a wiki page.

Regions include the Elden Ring overworld and underground areas asked for (Limgrave through the Realm of Shadow), the Bloodborne districts plus the Hunter’s Dream as the hub, and the Demon's Souls Nexus with worlds 1–5. False King Allant’s archstone (1-4) is an extra region so that fight has a place; the map note says so.

## Embeds

Checked response headers, not page contents:

- Fextralife interactive maps for Elden Ring, Bloodborne, and Demon's Souls send `X-Frame-Options: SAMEORIGIN`, so they cannot be framed. They stay ordinary links.
- `https://mapgenie.io/elden-ring/maps/the-lands-between` responded without `X-Frame-Options`. The Elden Ring map has an **Open map** button that sets an iframe `src` only after a click, and a new-tab fallback if the frame is blank. The parent MapGenie pages do send `SAMEORIGIN`; only that map URL omitted the header when it was checked.
- MapGenie has no Bloodborne or Demon's Souls map at the matching paths (those URLs 404). Those games do not get an embed.

Do not hotlink or scrape tiles, and do not copy another map’s marker coordinates into these files.
