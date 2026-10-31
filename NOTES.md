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

Demon's Souls crafting and equipment are research snapshots from 2026-10-30, copied in unchanged:

- `data/demons-souls-crafting.json` — 19 categories, 129 items, 67 materials, 11 guides
- `data/demons-souls-equipment.json` — 21 weapon types, 97 weapons, 30 armor entries (26 sets, 3 standalone pieces, and a Rings list), 11 guides

The crafting About note says there is no item-combination crafting: the list is upgrade paths, soul trades, Sparkly trades, and farming, and general-path recipes give stone ranges. The equipment About note covers wiki conflicts, remake versus PS3 differences, and four build names with no matching entry: Yellow Monk's Collar, Friend's Ring, Blessed Broadsword, and a crushing path for Bramd. Bramd itself still links. Monk's Head Wrappings also links builds that say Monk's Head Collar.

Elden Ring crafting and equipment are research snapshots from 2026-10-30, copied in unchanged:

- `data/elden-ring-crafting.json` — 9 categories, 187 items, 155 materials, 7 guides
- `data/elden-ring-equipment.json` — 29 weapon types, 82 weapons, 60 armor entries (58 sets plus the White Mask and Jar helms), 4 guides

The crafting About note says the categories are this list's grouping. The equipment About note says weapon stats are base +0 and patches can change them, some fields are blank where the wiki had no info, and Millicent's Set is unobtainable. White Mask links the builds that name it. Jar links builds that say Jar helm. Raptor's Black Feathers is named on builds and is not an armor entry in this file. The colossal weapon named Greatsword also matches build lines that merely end in “Greatsword”, because the link is a name substring.

Crafting and equipment files are not downloaded with the app shell. Opening the section fetches that file, and the service worker keeps the response for offline. Lists longer than 24 entries page with Show more. The app hides a section when its registry key is missing.

## Maps

Each game’s map file is one of two shapes. `mode` is `"embed"` or `"images"`. `mapLinks` are ordinary outbound links either way.

Elden Ring (`data/elden-ring-map.json`) is an embed. The Map section is a MapGenie frame, with a switch between the Lands Between (`?embed=light` on `the-lands-between`) and Shadow of the Erdtree (`?embed=light` on `the-shadow-realm`). The frame is created only while that section is open. On a phone the frame ignores touches until Tap to use the map, so the page can still scroll. Open full map goes to the same map without `embed=light`. The credit line is “Map by MapGenie”. If the frame errors, the page says so and keeps the full-map link. Fextralife stays a link only.

Bloodborne and Demon's Souls (`data/bloodborne-map.json`, `data/demons-souls-map.json`) are `mode: "images"` with an empty `images` list until the picture set arrives. The viewer then reads `id`, `title`, `file`, `description`, `sourceUrl`, `credit`, and `license`. `file` is a site-relative path such as `static-maps/bloodborne/overview.webp`. Until at least one entry is present, the section shows a placeholder plus the Fextralife link.

The old schematic SVG maps are gone. Do not hotlink or scrape tiles, and do not copy another map’s marker coordinates into these files.
