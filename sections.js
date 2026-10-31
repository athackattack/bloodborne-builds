"use strict";

var SoulsSections = {
  startEmbers,
  render,
  sheet: focusSheet,
  closeEmbed
};

function startEmbers() {
  const canvas = document.getElementById("embers");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  const specks = Array.from({ length: 28 }, () => speck(true));
  let frame = 0;
  let running = true;

  function speck(anyY) {
    return {
      x: Math.random(),
      y: anyY ? Math.random() : 1.05,
      r: 0.6 + Math.random() * 1.6,
      v: 0.08 + Math.random() * 0.22,
      a: 0.15 + Math.random() * 0.45,
      w: (Math.random() - 0.5) * 0.06
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function tick() {
    if (!running) return;
    frame = requestAnimationFrame(tick);
    if (document.hidden) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#c6a15a";
    for (const s of specks) {
      s.y -= s.v / 1000;
      s.x += s.w / 1000;
      if (s.y < -0.05) Object.assign(s, speck(false));
      ctx.globalAlpha = s.a * (0.35 + 0.65 * s.y);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !frame) tick();
  });
  tick();
  window.addEventListener("pagehide", () => {
    running = false;
    if (frame) cancelAnimationFrame(frame);
  });
}

function render(ctx) {
  bindOnce();
  const panel = document.getElementById(
    ctx.section === "map" ? "panel-map" : ctx.section === "crafting" ? "panel-crafting" : "panel-equipment"
  );
  if (!panel) return;
  if (ctx.section !== "map") closeEmbed();
  if (ctx.section === "crafting") renderCrafting(panel, ctx);
  else if (ctx.section === "equipment") renderEquipment(panel, ctx);
  else renderMap(panel, ctx);
}

function focusSheet(route, extra) {
  if (!route.focus || !extra) return null;
  if (route.focus.kind === "pin") return pinSheet(extra, route.focus.id);
  if (route.focus.kind === "item") return itemSheet(extra, route.focus.id);
  if (route.focus.kind === "material") return materialSheet(extra, route.focus.id);
  if (route.focus.kind === "weapon") return weaponSheet(extra, route.focus.id);
  if (route.focus.kind === "armor") return armorSheet(extra, route.focus.id);
  return null;
}

let bound = false;
function bindOnce() {
  if (bound) return;
  bound = true;
  document.getElementById("panel-crafting").addEventListener("click", onCraftClick);
  document.getElementById("panel-crafting").addEventListener("input", onCraftInput);
  document.getElementById("panel-equipment").addEventListener("click", onEquipClick);
  document.getElementById("panel-equipment").addEventListener("input", onEquipInput);
  document.getElementById("panel-equipment").addEventListener("change", onEquipChange);
  document.getElementById("panel-map").addEventListener("click", onMapClick);
  document.getElementById("panel-map").addEventListener("input", onMapInput);
  document.getElementById("map-embed-close").addEventListener("click", closeEmbed);
  document.getElementById("sheet").addEventListener("click", (event) => {
    const material = event.target.closest("[data-material]");
    if (material && material.dataset.material) {
      setHash(hashFor(state.game.id, "craft-material", material.dataset.material));
      return;
    }
    const item = event.target.closest("[data-item]");
    if (item && item.dataset.item) setHash(hashFor(state.game.id, "craft-item", item.dataset.item));
  });
}

function ui() {
  return currentUi();
}

function onCraftClick(event) {
  const cat = event.target.closest("[data-craft-cat]");
  if (cat) {
    ui().craftCat = cat.dataset.craftCat || "";
    render({ section: "crafting", extra: state.extra });
    return;
  }
  const material = event.target.closest("[data-material]");
  if (material) {
    setHash(hashFor(state.game.id, "craft-material", material.dataset.material));
    return;
  }
  const item = event.target.closest("[data-item]");
  if (item) setHash(hashFor(state.game.id, "craft-item", item.dataset.item));
}

function onCraftInput(event) {
  if (event.target.id !== "craft-q") return;
  ui().craftQuery = event.target.value;
  render({ section: "crafting", extra: state.extra });
  const box = document.getElementById("craft-q");
  if (box) {
    box.focus();
    const end = box.value.length;
    box.setSelectionRange(end, end);
  }
}

function onEquipClick(event) {
  const tab = event.target.closest("[data-equip-tab]");
  if (tab) {
    setHash(hashFor(state.game.id, tab.dataset.equipTab === "armor" ? "armor" : "weapons"));
    return;
  }
  const type = event.target.closest("[data-equip-type]");
  if (type) {
    ui().equipType = type.dataset.equipType || "";
    render({ section: "equipment", extra: state.extra, route: parseHash() });
    return;
  }
  const weapon = event.target.closest("[data-weapon]");
  if (weapon) {
    setHash(hashFor(state.game.id, "weapons", weapon.dataset.weapon));
    return;
  }
  const armor = event.target.closest("[data-armor]");
  if (armor) setHash(hashFor(state.game.id, "armor", armor.dataset.armor));
}

function onEquipInput(event) {
  if (event.target.id !== "equip-q") return;
  ui().equipQuery = event.target.value;
  render({ section: "equipment", extra: state.extra, route: parseHash() });
  const box = document.getElementById("equip-q");
  if (box) {
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  }
}

function onEquipChange(event) {
  if (event.target.id !== "equip-sort") return;
  ui().equipSort = event.target.value;
  render({ section: "equipment", extra: state.extra, route: parseHash() });
}

function onMapClick(event) {
  if (event.target.closest("#map-open")) {
    if (state.game && state.game.mapEmbed) openEmbed(state.game.mapEmbed);
    return;
  }
  const zoom = event.target.closest("[data-zoom]");
  if (zoom) {
    const stage = document.getElementById("map-stage");
    if (stage && stage._zoom) stage._zoom(zoom.dataset.zoom);
    return;
  }
  const layer = event.target.closest("[data-layer]");
  if (layer) {
    const id = layer.dataset.layer;
    const flags = ui().mapLayers || {};
    flags[id] = layer.getAttribute("aria-pressed") !== "true";
    ui().mapLayers = flags;
    render({ section: "map", extra: state.extra });
    return;
  }
  const reset = event.target.closest("[data-map-reset]");
  if (reset) {
    const view = mapViews[state.game.id];
    if (view) view.fitted = false;
    render({ section: "map", extra: state.extra });
  }
}

function onMapInput(event) {
  if (event.target.id !== "map-q") return;
  ui().mapQuery = event.target.value;
  const q = event.target.value;
  document.querySelectorAll(".pin").forEach((pin) => {
    const hay = pin.dataset.hay || "";
    pin.hidden = q.trim() && !hay.includes(q.trim().toLowerCase());
  });
  const n = [...document.querySelectorAll(".pin")].filter((pin) => !pin.hidden).length;
  const count = document.getElementById("map-count");
  if (count) count.textContent = `${n} ${n === 1 ? "place" : "places"}`;
}

function noteBlock(meta) {
  const notes = meta && meta.notes;
  if (!notes) return null;
  const lead = firstSentence(notes);
  const rest = notes.slice(lead.length).trim();
  if (!rest) return el("p", { class: "section-note", text: notes });
  const details = el("details", { class: "section-note" });
  details.append(el("summary", { text: lead }), el("p", { text: rest }));
  return details;
}

function sampleBanner(meta) {
  if (!meta || !meta.sample) return null;
  return el("p", {
    class: "sample-banner",
    text: "Sample entries for the layout. Not a research snapshot — the full lists will replace this file."
  });
}

function guideList(guides) {
  const list = Array.isArray(guides) ? guides.filter((guide) => guide && (guide.title || guide.url)) : [];
  if (!list.length) return null;
  return el("section", { class: "block" }, [
    el("h2", { class: "section-title", text: "Guides" }),
    el("div", { class: "guide-list" }, list.map((guide) => {
      const link = externalLink(guide.url || "#", "guide-card");
      if (!guide.url) link.removeAttribute("href");
      link.append(
        guide.source ? el("span", { class: "site-name", text: String(guide.source) }) : null,
        el("span", { class: "guide-title", text: guide.title || guide.url || "Guide" })
      );
      return link;
    }))
  ]);
}

function sourceLine(source) {
  if (!source || !source.url) return null;
  const link = externalLink(source.url, "source");
  link.append(
    el("span", { class: "source-title" }, [
      source.label || source.url,
      source.unverified ? el("span", { class: "flag", text: "Unverified" }) : null
    ])
  );
  return el("p", { class: "source-row" }, [link]);
}

function renderCrafting(panel, ctx) {
  const data = ctx.extra || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const materials = Array.isArray(data.materials) ? data.materials : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const prefs = ui();
  const q = (prefs.craftQuery || "").trim().toLowerCase();
  const cat = prefs.craftCat || "";
  const shown = items.filter((item) => {
    if (cat && item.category !== cat) return false;
    if (!q) return true;
    const hay = [item.name, item.description, item.effect, item.whereToFind, ...(item.materials || []).map((m) => m && m.name)]
      .filter(Boolean).join("\n").toLowerCase();
    return hay.includes(q);
  });
  const chips = el("div", { class: "chip-row", id: "craft-cats" }, [
    chip("data-craft-cat", "", "All", !cat),
    ...categories.filter((c) => c && c.id).map((c) => chip("data-craft-cat", c.id, c.name || c.id, cat === c.id))
  ]);
  panel.replaceChildren(
    sampleBanner(data.meta),
    noteBlock(data.meta),
    el("div", { class: "controls" }, [
      el("div", { class: "search" }, [
        el("label", { class: "visually-hidden", for: "craft-q", text: "Search recipes" }),
        (() => {
          const input = el("input", { id: "craft-q", type: "search", placeholder: "Search recipes and materials", autocomplete: "off" });
          input.value = prefs.craftQuery || "";
          return input;
        })()
      ]),
      chips,
      el("p", { class: "section-count", text: `${shown.length} of ${items.length} recipes` })
    ]),
    el("div", { class: "record-list" }, shown.length ? shown.map(recipeCard) : [el("p", { class: "empty", text: "No recipes match." })]),
    el("h2", { class: "section-title", text: "Materials" }),
    el("div", { class: "record-list" }, materials.length ? materials.map(materialCard) : [el("p", { class: "empty", text: "No materials in this file." })]),
    guideList(data.guides)
  );
}

function recipeCard(item) {
  const mats = (item.materials || []).filter(Boolean).map((mat) => {
    const known = materialByName(state.extra, mat.name);
    const label = `${mat.name || "Material"}${mat.qty != null && mat.qty !== "" ? ` × ${mat.qty}` : ""}`;
    if (!known) return el("li", { text: label + (mat.note ? ` — ${mat.note}` : "") });
    return el("li", {}, [
      el("button", { type: "button", class: "inline-link", "data-material": known.id, text: label }),
      mat.note ? el("span", { class: "muted", text: ` — ${mat.note}` }) : null
    ]);
  });
  return el("article", { class: "record" }, [
    el("button", { type: "button", class: "record-title", "data-item": item.id || "", text: item.name || "Recipe" }),
    item.effect ? el("p", { text: item.effect }) : null,
    mats.length ? el("ul", { class: "clean" }, mats) : null,
    item.whereToFind ? el("p", { class: "muted", text: item.whereToFind }) : null
  ]);
}

function materialCard(mat) {
  return el("article", { class: "record" }, [
    el("button", { type: "button", class: "record-title", "data-material": mat.id || "", text: mat.name || "Material" }),
    mat.type ? el("p", { class: "card-kicker", text: mat.type }) : null,
    mat.whereToFind ? el("p", { class: "muted", text: mat.whereToFind }) : null
  ]);
}

function materialByName(data, name) {
  const needle = String(name || "").trim().toLowerCase();
  if (!needle || !data) return null;
  return (data.materials || []).find((mat) => String(mat.name || "").trim().toLowerCase() === needle) || null;
}

function itemSheet(data, id) {
  const item = (data.items || []).find((entry) => entry.id === id);
  if (!item) return null;
  const mats = (item.materials || []).filter(Boolean);
  return el("article", {}, [
    el("p", { class: "sheet-kicker", text: categoryName(data, item.category) }),
    el("h2", { id: "sheet-title", text: item.name || "Recipe" }),
    item.description ? el("p", { text: item.description }) : null,
    item.effect ? el("section", { class: "block" }, [el("h3", { text: "Effect" }), el("p", { text: item.effect })]) : null,
    mats.length ? el("section", { class: "block" }, [
      el("h3", { text: "Materials" }),
      el("ul", { class: "clean" }, mats.map((mat) => {
        const known = materialByName(data, mat.name);
        const label = formatMat(mat);
        if (!known) return el("li", { text: label });
        return el("li", {}, [el("button", { type: "button", class: "inline-link", "data-material": known.id, text: label })]);
      }))
    ]) : null,
    item.whereToFind ? el("section", { class: "block" }, [el("h3", { text: "Where to find the materials" }), el("p", { text: item.whereToFind })]) : null,
    sourceLine(item.source)
  ]);
}

function materialSheet(data, id) {
  const mat = (data.materials || []).find((entry) => entry.id === id);
  if (!mat) return null;
  const users = (data.items || []).filter((item) => (item.materials || []).some((part) => String(part && part.name || "").trim().toLowerCase() === String(mat.name || "").trim().toLowerCase()));
  return el("article", {}, [
    el("p", { class: "sheet-kicker", text: mat.type || "Material" }),
    el("h2", { id: "sheet-title", text: mat.name || "Material" }),
    mat.description ? el("p", { text: mat.description }) : null,
    mat.whereToFind ? el("section", { class: "block" }, [el("h3", { text: "Where to find" }), el("p", { text: mat.whereToFind })]) : null,
    mat.usedFor ? el("section", { class: "block" }, [el("h3", { text: "Used for" }), el("p", { text: mat.usedFor })]) : null,
    el("section", { class: "block" }, [
      el("h3", { text: "Recipes" }),
      users.length
        ? el("ul", { class: "clean" }, users.map((item) => el("li", {}, [
            el("button", { type: "button", class: "inline-link", "data-item": item.id || "", text: item.name || "Recipe" })
          ])))
        : el("p", { text: "No recipe in this file lists it." })
    ]),
    sourceLine(mat.source)
  ]);
}

function categoryName(data, id) {
  const found = (data.categories || []).find((cat) => cat.id === id);
  return (found && found.name) || id || "";
}

function formatMat(mat) {
  const qty = mat.qty != null && mat.qty !== "" ? ` × ${mat.qty}` : "";
  const note = mat.note ? ` — ${mat.note}` : "";
  return `${mat.name || "Material"}${qty}${note}`;
}

function renderEquipment(panel, ctx) {
  const data = ctx.extra || {};
  const route = ctx.route || parseHash();
  const armorTab = route.view === "armor";
  const weapons = Array.isArray(data.weapons) ? data.weapons : [];
  const sets = Array.isArray(data.armorSets) ? data.armorSets : [];
  const types = Array.isArray(data.weaponTypes) ? data.weaponTypes : [];
  const prefs = ui();
  const q = (prefs.equipQuery || "").trim().toLowerCase();
  const type = prefs.equipType || "";
  let rows = armorTab ? sets.slice() : weapons.slice();
  if (!armorTab && type) rows = rows.filter((row) => row.type === type);
  if (q) {
    rows = rows.filter((row) => {
      const hay = [row.name, row.description, row.location, row.upgradePath, row.notes, ...(row.pieces || []).map((p) => p && (p.name || p.slot))]
        .filter(Boolean).join("\n").toLowerCase();
      return hay.includes(q);
    });
  }
  const sort = prefs.equipSort || "listed";
  if (sort === "name") rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  else if (sort === "type" && !armorTab) rows.sort((a, b) => String(a.type || "").localeCompare(String(b.type || "")) || String(a.name || "").localeCompare(String(b.name || "")));
  const chips = armorTab ? null : el("div", { class: "chip-row" }, [
    chip("data-equip-type", "", "All", !type),
    ...types.filter((t) => t && t.id).map((t) => chip("data-equip-type", t.id, t.name || t.id, type === t.id))
  ]);
  panel.replaceChildren(
    sampleBanner(data.meta),
    noteBlock(data.meta),
    el("div", { class: "chip-row", role: "tablist", "aria-label": "Equipment" }, [
      chip("data-equip-tab", "weapons", "Weapons", !armorTab),
      chip("data-equip-tab", "armor", "Armor", armorTab)
    ]),
    el("div", { class: "controls" }, [
      el("div", { class: "search" }, [
        el("label", { class: "visually-hidden", for: "equip-q", text: "Search equipment" }),
        (() => {
          const input = el("input", { id: "equip-q", type: "search", placeholder: armorTab ? "Search armor sets" : "Search weapons", autocomplete: "off" });
          input.value = prefs.equipQuery || "";
          return input;
        })()
      ]),
      chips,
      el("div", { class: "toolbar" }, [
        el("p", { class: "section-count", text: `${rows.length} ${armorTab ? "sets" : "weapons"}` }),
        el("label", { class: "sort", text: "Sort " }, [
          (() => {
            const select = el("select", { id: "equip-sort" }, [
              el("option", { value: "listed", text: "Listed order" }),
              el("option", { value: "name", text: "Name" }),
              armorTab ? null : el("option", { value: "type", text: "Type" })
            ]);
            select.value = sort === "type" && armorTab ? "listed" : sort;
            return select;
          })()
        ])
      ])
    ]),
    el("div", { class: "record-list" }, rows.length ? rows.map((row) => armorTab ? armorCard(row) : weaponCard(row, types)) : [el("p", { class: "empty", text: "Nothing matches." })]),
    guideList(data.guides)
  );
}

function weaponCard(weapon, types) {
  const type = types.find((entry) => entry.id === weapon.type);
  return el("article", { class: "record" }, [
    type ? el("p", { class: "card-kicker", text: type.name || weapon.type }) : null,
    el("button", { type: "button", class: "record-title", "data-weapon": weapon.id || "", text: weapon.name || "Weapon" }),
    weapon.location ? el("p", { class: "muted", text: weapon.location }) : null
  ]);
}

function armorCard(set) {
  return el("article", { class: "record" }, [
    el("button", { type: "button", class: "record-title", "data-armor": set.id || "", text: set.name || "Armor" }),
    set.location ? el("p", { class: "muted", text: set.location }) : null,
    Array.isArray(set.pieces) && set.pieces.length
      ? el("p", { class: "muted", text: set.pieces.map((piece) => piece && (piece.name || piece.slot)).filter(Boolean).join(" · ") })
      : null
  ]);
}

function weaponSheet(data, id) {
  const weapon = (data.weapons || []).find((entry) => entry.id === id);
  if (!weapon) return null;
  const type = (data.weaponTypes || []).find((entry) => entry.id === weapon.type);
  return el("article", {}, [
    el("p", { class: "sheet-kicker", text: (type && type.name) || weapon.type || "Weapon" }),
    el("h2", { id: "sheet-title", text: weapon.name || "Weapon" }),
    weapon.description ? el("p", { text: weapon.description }) : null,
    fieldBlock("Stats", weapon.stats),
    fieldBlock("Scaling", weapon.scaling),
    fieldBlock("Requirements", weapon.requirements),
    weapon.upgradePath ? el("section", { class: "block" }, [el("h3", { text: "Upgrade path" }), el("p", { text: weapon.upgradePath })]) : null,
    weapon.location ? el("section", { class: "block" }, [el("h3", { text: "Where to find it" }), el("p", { text: weapon.location })]) : null,
    relatedBlock(weapon.name),
    sourceLine(weapon.source)
  ]);
}

function armorSheet(data, id) {
  const set = (data.armorSets || []).find((entry) => entry.id === id);
  if (!set) return null;
  const pieces = (set.pieces || []).filter(Boolean);
  return el("article", {}, [
    el("p", { class: "sheet-kicker", text: "Armor" }),
    el("h2", { id: "sheet-title", text: set.name || "Armor" }),
    set.description ? el("p", { text: set.description }) : null,
    pieces.length ? el("section", { class: "block" }, [
      el("h3", { text: "Pieces" }),
      el("ul", { class: "clean" }, pieces.map((piece) => el("li", { text: [piece.slot, piece.name, piece.location].filter(Boolean).join(" — ") })))
    ]) : null,
    set.weight ? el("section", { class: "block" }, [el("h3", { text: "Weight" }), el("p", { text: String(set.weight) })]) : null,
    set.location ? el("section", { class: "block" }, [el("h3", { text: "Where to find it" }), el("p", { text: set.location })]) : null,
    set.notes ? el("section", { class: "block" }, [el("h3", { text: "Notes" }), el("p", { text: set.notes })]) : null,
    relatedBlock([set.name, ...pieces.map((piece) => piece.name)].filter(Boolean).join("\n")),
    sourceLine(set.source)
  ]);
}

function fieldBlock(title, obj) {
  if (!obj || typeof obj !== "object") return null;
  const rows = Object.entries(obj).filter(([, value]) => value != null && value !== "");
  if (!rows.length) return null;
  return el("section", { class: "block" }, [
    el("h3", { text: title }),
    el("dl", { class: "kv" }, rows.map(([key, value]) => el("div", {}, [
      el("dt", { text: key }),
      el("dd", { text: String(value) })
    ])))
  ]);
}

function relatedBlock(names) {
  const list = String(names || "").split("\n").map((name) => name.trim()).filter((name) => name.length >= 4);
  const seen = new Set();
  const builds = [];
  for (const name of list) {
    const needle = name.toLowerCase();
    for (const build of state.data.builds || []) {
      if (seen.has(build.id)) continue;
      const hay = [build.name, ...(build.weapons || []), build.firearm || "", ...(build.runesGear || [])].join("\n").toLowerCase();
      if (hay.includes(needle)) {
        seen.add(build.id);
        builds.push(build);
      }
    }
  }
  if (!builds.length) return null;
  return el("section", { class: "block" }, [
    el("h3", { text: "Builds that list it" }),
    el("ul", { class: "clean" }, builds.map((build) => el("li", {}, [
      el("a", { href: `#${hashFor(state.game.id, "tiers", build.id)}`, text: build.name })
    ])))
  ]);
}

const mapViews = {};

function renderMap(panel, ctx) {
  const data = ctx.extra || {};
  const regions = Array.isArray(data.regions) ? data.regions : [];
  const layers = Array.isArray(data.layers) ? data.layers : [];
  const pins = Array.isArray(data.pins) ? data.pins : [];
  const prefs = ui();
  if (!prefs.mapLayers) prefs.mapLayers = {};
  layers.forEach((layer) => {
    if (prefs.mapLayers[layer.id] == null) prefs.mapLayers[layer.id] = true;
  });
  const q = (prefs.mapQuery || "").trim().toLowerCase();
  const viewBox = (data.meta && data.meta.viewBox) || "0 0 1000 1000";
  const box = viewBox.split(/[\s,]+/).map(Number);
  const width = box[2] || 1000;
  const height = box[3] || 1000;
  const visible = pins.filter((pin) => prefs.mapLayers[pin.layer] !== false);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("class", "map-svg");
  regions.forEach((region) => {
    if (!region || !region.path) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", region.path);
    path.setAttribute("class", "map-region");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = region.name || "";
    path.append(title);
    svg.append(path);
    if (region.labelPos && region.name) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const rawX = Number(region.labelPos[0]) || 0;
      const rawY = Number(region.labelPos[1]) || 0;
      let anchor = "middle";
      let x = rawX;
      if (rawX < 160) {
        anchor = "start";
        x = Math.max(12, rawX - 36);
      } else if (rawX > width - 160) {
        anchor = "end";
        x = Math.min(width - 12, rawX + 36);
      }
      text.setAttribute("x", x);
      text.setAttribute("y", rawY);
      text.setAttribute("text-anchor", anchor);
      text.setAttribute("class", "map-label");
      const lines = labelLines(region.name);
      lines.forEach((line, index) => {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        tspan.setAttribute("x", x);
        tspan.setAttribute("dy", index === 0 ? (lines.length > 1 ? "-0.55em" : "0.3em") : "1.15em");
        tspan.textContent = line;
        text.append(tspan);
      });
      svg.append(text);
    }
  });
  const world = el("div", { class: "map-world", id: "map-world" });
  world.style.width = `${width}px`;
  world.style.height = `${height}px`;
  world.append(svg);
  visible.forEach((pin) => {
    const button = el("button", {
      type: "button",
      class: `pin pin-${pin.layer || "item"}`,
      "data-pin": pin.id || "",
      "aria-label": pin.name || "Place"
    });
    button.style.left = `${Number(pin.x) || 0}px`;
    button.style.top = `${Number(pin.y) || 0}px`;
    button.dataset.hay = [pin.name, pin.description, pin.region, ...(pin.finds || [])].filter(Boolean).join("\n").toLowerCase();
    if (q && !button.dataset.hay.includes(q)) button.hidden = true;
    world.append(button);
  });
  const stage = el("div", { class: "map-stage", id: "map-stage", tabindex: "0", role: "application", "aria-label": "Schematic map. Drag to pan, scroll or use the zoom buttons to zoom." });
  stage.append(world);
  const shown = visible.filter((pin) => {
    const hay = [pin.name, pin.description, pin.region, ...(pin.finds || [])].filter(Boolean).join("\n").toLowerCase();
    return !q || hay.includes(q);
  }).length;
  const embed = state.game && state.game.mapEmbed;
  panel.replaceChildren(
    noteBlock(data.meta),
    el("div", { class: "controls" }, [
      el("div", { class: "search" }, [
        el("label", { class: "visually-hidden", for: "map-q", text: "Search places" }),
        (() => {
          const input = el("input", { id: "map-q", type: "search", placeholder: "Search bosses, graces, merchants, items", autocomplete: "off" });
          input.value = prefs.mapQuery || "";
          return input;
        })()
      ]),
      el("div", { class: "chip-row", role: "group", "aria-label": "Map layers" }, layers.map((layer) =>
        chip("data-layer", layer.id, layer.name || layer.id, prefs.mapLayers[layer.id] !== false)
      )),
      el("div", { class: "toolbar" }, [
        el("p", { id: "map-count", text: `${shown} ${shown === 1 ? "place" : "places"}` }),
        el("div", { class: "toolbar-actions" }, [
          el("button", { type: "button", class: "density", "data-zoom": "in", text: "Zoom in" }),
          el("button", { type: "button", class: "density", "data-zoom": "out", text: "Zoom out" }),
          el("button", { type: "button", class: "density", "data-map-reset": "1", text: "Fit" }),
          embed ? el("button", { type: "button", class: "density", id: "map-open", text: "Open map" }) : null
        ])
      ])
    ]),
    stage,
    regions.length ? el("section", { class: "block" }, [
      el("h2", { class: "section-title", text: "Regions" }),
      el("ul", { class: "region-legend" }, regions.filter((region) => region && region.name).map((region) => el("li", { text: region.name })))
    ]) : null,
    mapLinkBlock(data.mapLinks)
  );
  attachMap(stage, world, width, height);
}

function labelLines(name) {
  const words = String(name).split(/\s+/).filter(Boolean);
  if (words.length < 2 || name.length <= 14) return [name];
  let split = 1;
  let best = Infinity;
  for (let i = 1; i < words.length; i++) {
    const score = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (score < best) {
      best = score;
      split = i;
    }
  }
  return [words.slice(0, split).join(" "), words.slice(split).join(" ")];
}

function mapLinkBlock(links) {
  const list = Array.isArray(links) ? links.filter((link) => link && link.url) : [];
  if (!list.length) return null;
  return el("section", { class: "block" }, [
    el("h2", { class: "section-title", text: "Full maps" }),
    el("div", { class: "guide-list" }, list.map((item) => {
      const anchor = externalLink(item.url, "guide-card");
      anchor.append(
        el("span", { class: "guide-title", text: item.label || item.url }),
        item.note ? el("span", { class: "guide-desc", text: item.note }) : null
      );
      return anchor;
    }))
  ]);
}

function attachMap(stage, world, width, height) {
  const key = state.game.id;
  if (!mapViews[key]) mapViews[key] = { x: 0, y: 0, s: 1, fitted: false };
  const view = mapViews[key];
  const pointers = new Map();
  let moved = false;
  let downPin = null;

  function apply() {
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
    world.style.setProperty("--map-s", String(view.s));
    world.classList.toggle("labels-on", view.s >= 0.85);
  }
  function fit() {
    const pad = 12;
    const s = Math.min((stage.clientWidth - pad) / width, (stage.clientHeight - pad) / height);
    view.s = Math.max(0.15, s || 1);
    view.x = (stage.clientWidth - width * view.s) / 2;
    view.y = (stage.clientHeight - height * view.s) / 2;
    view.fitted = true;
    apply();
  }
  function zoomAt(px, py, factor) {
    const next = Math.min(5, Math.max(0.2, view.s * factor));
    const wx = (px - view.x) / view.s;
    const wy = (py - view.y) / view.s;
    view.s = next;
    view.x = px - wx * view.s;
    view.y = py - wy * view.s;
    apply();
  }
  stage._zoom = (dir) => zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, dir === "in" ? 1.2 : 0.83);
  if (!view.fitted) requestAnimationFrame(fit);
  else apply();

  stage.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = stage.getBoundingClientRect();
    zoomAt(event.clientX - rect.left, event.clientY - rect.top, event.deltaY < 0 ? 1.1 : 0.9);
  }, { passive: false });

  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest("[data-zoom], [data-map-reset], #map-open")) return;
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved = false;
    downPin = event.target.closest ? event.target.closest("[data-pin]") : null;
    stage.dataset.pan = "1";
  });
  stage.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    const prev = pointers.get(event.pointerId);
    const dx = event.clientX - prev.x;
    const dy = event.clientY - prev.y;
    if (Math.hypot(dx, dy) > 10) moved = true;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      view.x += dx;
      view.y += dy;
      apply();
    } else if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const rect = stage.getBoundingClientRect();
      const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
      const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
      const grew = Math.hypot(dx, dy);
      if (grew > 0) zoomAt(midX, midY, dx + dy > 0 ? 1.02 : 0.98);
    }
  });
  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (!pointers.size) stage.dataset.pan = "";
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
  stage.addEventListener("click", (event) => {
    const zoom = event.target.closest("[data-zoom]");
    if (zoom) {
      const rect = stage.getBoundingClientRect();
      zoomAt(rect.width / 2, rect.height / 2, zoom.dataset.zoom === "in" ? 1.2 : 0.83);
      return;
    }
    const pin = (event.target.closest && event.target.closest("[data-pin]")) || downPin;
    downPin = null;
    if (moved || !pin) return;
    setHash(hashFor(state.game.id, "map", pin.dataset.pin));
  });
  stage.addEventListener("keydown", (event) => {
    const step = 40;
    if (event.key === "ArrowLeft") view.x += step;
    else if (event.key === "ArrowRight") view.x -= step;
    else if (event.key === "ArrowUp") view.y += step;
    else if (event.key === "ArrowDown") view.y -= step;
    else if (event.key === "+" || event.key === "=") zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1.15);
    else if (event.key === "-") zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 0.87);
    else return;
    event.preventDefault();
    apply();
  });
}

function pinSheet(data, id) {
  const pin = (data.pins || []).find((entry) => entry.id === id);
  if (!pin) return null;
  const region = (data.regions || []).find((entry) => entry.id === pin.region);
  const layer = (data.layers || []).find((entry) => entry.id === pin.layer);
  const finds = (pin.finds || []).filter(Boolean);
  const links = (pin.links || []).filter((item) => item && item.url);
  return el("article", {}, [
    el("p", { class: "sheet-kicker", text: [layer && layer.name, region && region.name].filter(Boolean).join(" · ") }),
    el("h2", { id: "sheet-title", text: pin.name || "Place" }),
    pin.uncertain ? el("p", { class: "flag", text: "Uncertain — check the linked page" }) : null,
    pin.description ? el("p", { text: pin.description }) : null,
    region && region.description ? el("p", { class: "muted", text: region.description }) : null,
    finds.length ? el("section", { class: "block" }, [
      el("h3", { text: "Found here" }),
      el("ul", { class: "clean" }, finds.map((find) => el("li", { text: find })))
    ]) : null,
    links.length ? el("section", { class: "block" }, [
      el("h3", { text: "Pages" }),
      el("div", {}, links.map((item) => {
        const anchor = externalLink(item.url, "source");
        anchor.append(el("span", { class: "source-title", text: item.label || item.url }));
        return anchor;
      }))
    ]) : null,
    el("p", { class: "muted", text: "The pin's place on this drawing is schematic." })
  ]);
}

function chip(attr, id, label, pressed) {
  return el("button", {
    type: "button",
    class: "chip",
    [attr]: id,
    "aria-pressed": pressed ? "true" : "false",
    text: label
  });
}

function openEmbed(embed) {
  const box = document.getElementById("map-embed");
  const frame = document.getElementById("map-embed-frame");
  const link = document.getElementById("map-embed-fallback");
  if (!box || !frame || !embed) return;
  link.href = embed.url;
  link.textContent = embed.label ? `Open ${embed.label} in a new tab` : "Open in a new tab";
  frame.src = embed.url;
  box.classList.add("is-open");
  box.removeAttribute("hidden");
}

function closeEmbed() {
  const box = document.getElementById("map-embed");
  const frame = document.getElementById("map-embed-frame");
  if (frame) frame.src = "about:blank";
  if (box) {
    box.classList.remove("is-open");
    box.setAttribute("hidden", "");
  }
}
