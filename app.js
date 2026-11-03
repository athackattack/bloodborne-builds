"use strict";

const TIERS = ["S", "A", "B", "C"];
const SITE_ORDER = ["wiki", "reddit", "forum", "guide", "video"];
const SITE_LABEL = {
  wiki: "Wiki",
  reddit: "Reddit",
  forum: "Forum",
  guide: "Guide",
  video: "Video",
  data: "Data",
  tool: "Tool",
  official: "Official"
};
const FIELD_DEFAULTS = {
  weapons: "Weapons",
  firearm: "Firearm",
  runesGear: "Runes and gear"
};
const STORAGE_KEY = "souls-builds-game";
const VARIANT_KEY = "souls-builds-variant";

const sheet = document.getElementById("sheet");
const sheetBody = document.getElementById("sheet-body");

var state = {
  games: [],
  game: null,
  data: null,
  extra: null,
  ui: {}
};
const loaded = new Map();
let renderToken = 0;

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function siteLabel(type) {
  return SITE_LABEL[type] || type || "Source";
}

function externalLink(url, className) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  if (className) link.className = className;
  return link;
}

function gameById(id) {
  return state.games.find((game) => game.id === id) || null;
}

function uiFor(id) {
  if (!state.ui[id]) {
    state.ui[id] = {
      arch: "",
      best: "",
      query: "",
      sort: "listed",
      guideType: "",
      craftQuery: "",
      craftCat: "",
      equipQuery: "",
      equipType: "",
      equipSort: "listed",
      mapQuery: "",
      mapLayers: {}
    };
  }
  return state.ui[id];
}

function currentUi() {
  return uiFor(state.game.id);
}

function storedGameId() {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    if (id && gameById(id)) return id;
  } catch (error) {
    /* private mode */
  }
  return state.games[0] ? state.games[0].id : "";
}

function rememberGame(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch (error) {
    /* private mode */
  }
}

function variantById(game, id) {
  if (!game || !id) return null;
  return (game.variants || []).find((item) => item.id === id) || null;
}

function readVariantMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(VARIANT_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function storedVariantId(gameId) {
  const value = readVariantMap()[gameId];
  return typeof value === "string" ? value : "";
}

function rememberVariant(gameId, variantId) {
  try {
    const map = readVariantMap();
    if (variantId) map[gameId] = variantId;
    else delete map[gameId];
    localStorage.setItem(VARIANT_KEY, JSON.stringify(map));
  } catch (error) {
    /* private mode */
  }
}

function resolveVariant(game, route) {
  const list = (game && game.variants) || [];
  if (!list.length) return null;
  const fallback = list.find((item) => item.default) || list[0];
  if (route && route.variantId) return variantById(game, route.variantId) || fallback;
  return variantById(game, storedVariantId(game.id)) || fallback;
}

function hashRoot(gameId) {
  if (!state.variant || !state.game || state.game.id !== gameId || state.variant.default) return gameId;
  return `${gameId}/${state.variant.id}`;
}

function variantBannerNode() {
  const variant = state.variant;
  if (!variant || variant.default || !variant.banner) return null;
  const sources = (variant.sources || []).filter((src) => src && src.url);
  const node = el("div", { class: "variant-banner" }, [el("p", { text: variant.banner })]);
  if (sources.length) {
    const line = el("p", { class: "variant-sources" });
    sources.forEach((src, index) => {
      if (index) line.append(document.createTextNode(" · "));
      const link = externalLink(src.url);
      link.textContent = src.label || src.url;
      line.append(link);
    });
    node.append(line);
  }
  return node;
}

function reforgedCreditNode() {
  const variant = state.variant;
  if (!variant || variant.default) return null;
  const wiki = externalLink("https://err.fandom.com/wiki/ELDEN_RING_Reforged_Wiki");
  wiki.textContent = "ERR community wiki";
  const calc = externalLink("https://github.com/mandude/elden-ring-weapon-calculator");
  calc.textContent = "mandude calculator";
  const line = el("p");
  line.append(
    document.createTextNode("Text adapted from the "),
    wiki,
    document.createTextNode(" (CC BY-SA 3.0). Weapon numbers from the "),
    calc,
    document.createTextNode(" (MIT).")
  );
  return el("div", { class: "about-note" }, [line]);
}

function imageCreditNode() {
  return el("p", {
    class: "image-credit",
    text: "Item images are game art from the Elden Ring, Bloodborne and Demon's Souls wikis on Fandom, used under fair use, personal use. Game art © FromSoftware/Bandai Namco. No Reforged mod assets."
  });
}

function variantBuildsNote() {
  const variant = state.variant;
  if (!variant || variant.default || !variant.buildsNote) return null;
  return el("div", { class: "variant-banner" }, [el("p", { text: variant.buildsNote })]);
}

function variantMapNote() {
  const variant = state.variant;
  if (!variant || variant.default || !variant.mapNote) return null;
  return el("p", { class: "variant-banner", text: variant.mapNote });
}

function fieldLabel(meta, key) {
  const labels = (meta && meta.fieldLabels) || {};
  return labels[key] || FIELD_DEFAULTS[key] || key;
}

function platformLabel(build) {
  const value = build && build.platform;
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function platformBadge(build) {
  const label = platformLabel(build);
  return label ? el("span", { class: "platform", text: label }) : null;
}

function renderAlt(alt, order) {
  if (typeof alt === "string" || typeof alt === "number") return el("li", { text: String(alt) });
  if (!alt || typeof alt !== "object") return el("li", { text: alt == null ? "" : String(alt) });
  const prefix = state.game && state.game.levelPrefix;
  const level = alt.level == null || alt.level === "" ? "" : (prefix ? `${prefix} ${alt.level}` : `Level ${alt.level}`);
  const spread = alt.spread && typeof alt.spread === "object"
    ? order.filter((key) => alt.spread[key] != null).map((key) => `${key} ${alt.spread[key]}`).join(" · ")
    : "";
  return el("li", { class: "alt" }, [
    alt.name ? el("span", { class: "alt-name", text: String(alt.name) }) : null,
    level ? el("span", { class: "alt-level", text: level }) : null,
    spread ? el("span", { class: "alt-spread", text: spread }) : null
  ]);
}

function statOrder(meta, game) {
  if (meta && Array.isArray(meta.statOrder) && meta.statOrder.length) return meta.statOrder;
  if (game && Array.isArray(game.statLabels) && game.statLabels.length) return game.statLabels;
  return ["VIT", "END", "STR", "SKL", "BLT", "ARC"];
}

function firstSentence(text) {
  const match = String(text || "").match(/^.*?[.!?](?:\s|$)/);
  return (match ? match[0] : text || "").trim();
}

function tokenHit(hay, token) {
  const value = String(token || "");
  if (!value) return false;
  if (value.length <= 3) return new RegExp(`\\b${value}\\b`, "i").test(hay);
  return hay.toLowerCase().includes(value.toLowerCase());
}

function groupHit(hay, group) {
  return (group || []).some((token) => tokenHit(hay, token));
}

function hybridMatch(build, spec) {
  const archetype = build.archetype.toLowerCase();
  if (build.name.toLowerCase().includes("hybrid")) return true;
  const hit = (spec.groups || []).filter((group) => groupHit(archetype, group));
  if (hit.length < 2) return false;
  const pure = spec.pure || [];
  if (pure.length && archetype.includes("quality")) {
    const present = hit.map((group) => group.find((token) => tokenHit(archetype, token)));
    if (present.every((token) => pure.includes(token))) return false;
  }
  return true;
}

function archetypeMatch(build, spec) {
  if (!spec) return true;
  if (spec.kind === "hybrid") return hybridMatch(build, spec);
  const archetype = build.archetype.toLowerCase();
  let ok = (spec.includes || []).some((token) => archetype.includes(String(token).toLowerCase()));
  if (!ok) ok = (spec.words || []).some((token) => tokenHit(archetype, token));
  if (!ok && spec.alsoAll) {
    const all = spec.alsoAll.every((token) => archetype.includes(String(token).toLowerCase()));
    const none = (spec.alsoNone || []).every((token) => !archetype.includes(String(token).toLowerCase()));
    ok = all && none;
  }
  return ok;
}

function fieldBlob(build, fields) {
  const list = fields || [];
  if (list.includes("all")) {
    return [
      build.name,
      build.archetype,
      build.playstyle,
      build.ngNotes,
      build.tierReason,
      ...(build.bestFor || []),
      ...(build.pros || []),
      ...(build.cons || [])
    ].join(" ");
  }
  return list
    .map((field) => (field === "bestFor" ? (build.bestFor || []).join(" ") : build[field] || ""))
    .join(" ");
}

function bestForMatch(build, spec) {
  if (!spec) return true;
  const tags = (build.bestFor || []).join(" ").toLowerCase();
  const archetype = build.archetype.toLowerCase();
  const name = build.name.toLowerCase();
  const ng = (build.ngNotes || "").toLowerCase();
  const blob = fieldBlob(build, ["all"]).toLowerCase();
  if (spec.kind === "pvp") {
    return /\bpvp\b/.test(tags) || /\bpvp\b/.test(archetype) || /\bpvp\b/.test(name);
  }
  if (spec.kind === "ngplus") {
    const text = `${tags}\n${ng}`;
    return text.includes("ng+") && !text.includes("poor on ng+");
  }
  if (spec.kind === "pve") {
    if (blob.includes("not a general pve")) return false;
    const onlyPvpOrMeme = build.bestFor.length > 0 && build.bestFor.every((tag) => /\bpvp\b|meme/i.test(tag));
    if (onlyPvpOrMeme && !/\bpve\b/.test(tags)) return false;
    return true;
  }
  if (spec.kind === "pattern" && spec.pattern) {
    return new RegExp(spec.pattern, "i").test(fieldBlob(build, spec.fields || ["bestFor"]));
  }
  return true;
}

function queryMatch(build, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fortune = build.fortune || {};
  const hay = [build.name, build.archetype, build.playstyle, build.firearm, fortune.major, fortune.minor, ...(build.weapons || []), ...(build.bestFor || [])]
    .join("\n")
    .toLowerCase();
  return hay.includes(q);
}

function findSpec(list, id) {
  return (list || []).find((item) => item.id === id) || null;
}

function visibleBuilds() {
  const ui = currentUi();
  const game = state.game;
  const archSpec = ui.arch ? findSpec(game.archetypeFilters, ui.arch) : null;
  const bestSpec = ui.best ? findSpec(game.bestForFilters, ui.best) : null;
  const matched = state.data.builds.filter(
    (build) => archetypeMatch(build, archSpec) && bestForMatch(build, bestSpec) && queryMatch(build, ui.query)
  );
  if (ui.sort === "name") matched.sort((a, b) => a.name.localeCompare(b.name));
  else if (ui.sort === "weapon") {
    matched.sort((a, b) => (a.weapons[0] || "").localeCompare(b.weapons[0] || "") || a.name.localeCompare(b.name));
  }
  return matched;
}

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ""));
  const parts = raw.split("/").filter(Boolean);
  const known = parts.length > 0 && gameById(parts[0]);
  const gameId = known ? parts[0] : storedGameId();
  const rest = known ? parts.slice(1) : parts;
  const variant = variantById(gameById(gameId), rest[0]);
  if (variant) rest.shift();
  const route = {
    gameId,
    section: "builds",
    view: "tiers",
    about: false,
    build: null,
    focus: null,
    unscoped: !known,
    variantId: variant ? variant.id : null
  };
  const head = rest[0] || "";
  if (head === "guides") route.view = "guides";
  else if (head === "about") route.about = true;
  else if (head === "build" && rest[1]) route.build = rest.slice(1).join("/");
  else if (head === "map") {
    route.section = "map";
    route.view = "map";
    if (rest[1] === "about") route.focus = { kind: "section-about", id: "map" };
    else if (rest[1] && rest[1] !== "pin") route.focus = { kind: "map-view", id: rest.slice(1).join("/") };
  } else if (head === "crafting") {
    route.section = "crafting";
    route.view = "crafting";
    if (rest[1] === "about") route.focus = { kind: "section-about", id: "crafting" };
    else if (rest[1] === "item" && rest[2]) route.focus = { kind: "item", id: rest.slice(2).join("/") };
    else if (rest[1] === "material" && rest[2]) route.focus = { kind: "material", id: rest.slice(2).join("/") };
  } else if (head === "equipment") {
    route.section = "equipment";
    if (rest[1] === "about") {
      route.view = "weapons";
      route.focus = { kind: "section-about", id: "equipment" };
    } else {
      const tab = rest[1] === "armor" ? "armor" : rest[1] === "talismans" ? "talismans" : "weapons";
      route.view = tab;
      if (rest[2]) {
        const kind = tab === "armor" ? "armor" : tab === "talismans" ? "talisman" : "weapon";
        route.focus = { kind, id: rest.slice(2).join("/") };
      }
    }
  } else if (head && extraSectionById(gameId, head)) {
    route.section = head;
    route.view = head;
    if (rest[1] === "about") route.focus = { kind: "section-about", id: head };
    else if (rest[1]) route.focus = { kind: "system-section", id: rest[1], item: rest[2] || "" };
  }
  return route;
}

function extraSectionById(gameId, id) {
  const game = gameById(gameId);
  if (!game || !id) return null;
  for (const variant of game.variants || []) {
    const found = (variant.sections || []).find((section) => section.id === id);
    if (found) return found;
  }
  return null;
}

function activeExtraSections() {
  return (state.variant && state.variant.sections) || [];
}

function hashFor(gameId, view, id) {
  const root = hashRoot(gameId);
  if (view === "guides") return `${root}/guides`;
  if (view === "about") return `${root}/about`;
  if ((view === "tiers" || view === "builds" || !view) && id) return `${root}/build/${encodeURIComponent(id)}`;
  if (view === "map") return id ? `${root}/map/${encodeURIComponent(id)}` : `${root}/map`;
  if (view === "map-about") return `${root}/map/about`;
  if (view === "crafting") return `${root}/crafting`;
  if (view === "craft-item") return `${root}/crafting/item/${encodeURIComponent(id)}`;
  if (view === "craft-material") return `${root}/crafting/material/${encodeURIComponent(id)}`;
  if (view === "craft-about") return `${root}/crafting/about`;
  if (view === "equip-about") return `${root}/equipment/about`;
  if (view === "weapons") return id ? `${root}/equipment/weapons/${encodeURIComponent(id)}` : `${root}/equipment/weapons`;
  if (view === "armor") return id ? `${root}/equipment/armor/${encodeURIComponent(id)}` : `${root}/equipment/armor`;
  if (view === "talismans") return id ? `${root}/equipment/talismans/${encodeURIComponent(id)}` : `${root}/equipment/talismans`;
  if (view === "equipment") return `${root}/equipment/weapons`;
  const extra = extraSectionById(gameId, view);
  if (extra) {
    if (!id) return `${root}/${extra.id}`;
    return `${root}/${extra.id}/${String(id).split("/").map((part) => encodeURIComponent(part)).join("/")}`;
  }
  return root;
}

function sectionFile(game, section) {
  if (!game) return "";
  const variant = state.variant && state.game && state.game.id === game.id ? state.variant : null;
  if (section === "map") return game.map || "";
  if (section === "crafting") return (variant && variant.crafting) || game.crafting || "";
  if (section === "equipment") return (variant && variant.equipment) || game.equipment || "";
  const extra = (variant && variant.sections || []).find((item) => item.id === section);
  if (extra && extra.file) return extra.file;
  return "";
}

function scopedHash(gameId, route) {
  if (route.focus) {
    if (route.focus.kind === "map-view") return hashFor(gameId, "map", route.focus.id);
    if (route.focus.kind === "item") return hashFor(gameId, "craft-item", route.focus.id);
    if (route.focus.kind === "material") return hashFor(gameId, "craft-material", route.focus.id);
    if (route.focus.kind === "weapon") return hashFor(gameId, "weapons", route.focus.id);
    if (route.focus.kind === "armor") return hashFor(gameId, "armor", route.focus.id);
    if (route.focus.kind === "talisman") return hashFor(gameId, "talismans", route.focus.id);
    if (route.focus.kind === "system-section") {
      const tail = route.focus.item ? `${route.focus.id}/${route.focus.item}` : route.focus.id;
      return hashFor(gameId, route.section, tail);
    }
    if (route.focus.kind === "section-about") {
      const view = route.focus.id === "equipment" ? "equip-about" : route.focus.id === "map" ? "map-about" : "craft-about";
      return hashFor(gameId, view);
    }
  }
  if (route.section === "map") return hashFor(gameId, "map");
  if (route.section === "crafting") return hashFor(gameId, "crafting");
  if (route.section === "equipment") {
    const view = route.view === "armor" ? "armor" : route.view === "talismans" ? "talismans" : "weapons";
    return hashFor(gameId, view);
  }
  if (extraSectionById(gameId, route.section)) return hashFor(gameId, route.section);
  return hashFor(gameId, route.about ? "about" : route.view, route.build);
}

function sectionCount(section, extra) {
  if (!extra) return "";
  if (section === "map") {
    const list = extra.mode === "embed" ? extra.embeds : extra.images;
    const n = Array.isArray(list) ? list.length : 0;
    return n ? `${n} ${n === 1 ? "map" : "maps"}` : "Map";
  }
  if (section === "crafting") {
    const n = (extra.items || []).length;
    return `${n} ${n === 1 ? "recipe" : "recipes"}`;
  }
  if (extraSectionById(state.game && state.game.id, section) || Array.isArray(extra.sections)) {
    const n = (extra.sections || []).length;
    const fortunes = extra.meta && extra.meta.counts && extra.meta.counts.fortunes;
    return fortunes ? `${n} sections · ${fortunes} fortunes` : `${n} ${n === 1 ? "section" : "sections"}`;
  }
  const weapons = (extra.weapons || []).length;
  const sets = (extra.armorSets || []).length;
  const talismans = (extra.talismans || []).length;
  return talismans ? `${weapons} weapons · ${sets} sets · ${talismans} talismans` : `${weapons} weapons · ${sets} sets`;
}

function setHash(hash) {
  const next = hash ? `#${hash}` : "";
  const current = location.hash === "#" ? "" : location.hash;
  if (current === next) {
    render();
    return;
  }
  history.pushState({ bb: true }, "", `${location.pathname}${location.search}${next}`);
  render();
}

function leaveSheet() {
  const route = parseHash();
  if (!route.about && !route.build && !route.focus) {
    if (sheet.open) sheet.close();
    return;
  }
  if (history.state && history.state.bb) {
    history.back();
    return;
  }
  let next;
  if (route.section === "map") next = hashFor(route.gameId, "map");
  else if (route.section === "crafting") next = hashFor(route.gameId, "crafting");
  else if (route.section === "equipment") {
    const view = route.view === "armor" ? "armor" : route.view === "talismans" ? "talismans" : "weapons";
    next = hashFor(route.gameId, view);
  } else if (extraSectionById(route.gameId, route.section)) next = hashFor(route.gameId, route.section);
  else next = hashFor(route.gameId, route.view === "guides" ? "guides" : "tiers");
  history.replaceState({ bb: true }, "", `${location.pathname}${location.search}#${next}`);
  render();
}

function syncHeaderHeight() {
  const header = document.querySelector("header");
  if (header) document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
}

function applyAccent(game) {
  const root = document.documentElement;
  const previous = root.dataset.game || "";
  root.dataset.game = game.id;
  if (game.accent) root.style.setProperty("--accent", game.accent);
  if (game.accentDeep) root.style.setProperty("--accent-deep", game.accentDeep);
  if (previous && previous !== game.id) {
    const main = document.getElementById("content");
    main.classList.remove("switching");
    void main.offsetWidth;
    main.classList.add("switching");
  }
}

function chipButton(attr, id, label, pressed) {
  return el("button", {
    type: "button",
    class: "chip",
    [attr]: id,
    "aria-pressed": pressed ? "true" : "false",
    text: label
  });
}

function renderFilterChips() {
  const ui = currentUi();
  const game = state.game;
  const archRow = document.getElementById("arch-row");
  const bestRow = document.getElementById("best-row");
  archRow.replaceChildren(
    chipButton("data-arch", "", "All", !ui.arch),
    ...(game.archetypeFilters || []).map((filter) => chipButton("data-arch", filter.id, filter.label, ui.arch === filter.id))
  );
  bestRow.replaceChildren(
    chipButton("data-best", "", "All", !ui.best),
    ...(game.bestForFilters || []).map((filter) => chipButton("data-best", filter.id, filter.label, ui.best === filter.id))
  );
  document.getElementById("q").value = ui.query;
  document.getElementById("sort").value = ui.sort;
}

function guideTypes() {
  const present = new Set((state.data.guides || []).map((guide) => guide.siteType).filter(Boolean));
  const ordered = SITE_ORDER.filter((type) => present.has(type));
  for (const type of present) if (!ordered.includes(type)) ordered.push(type);
  return ordered;
}

function renderGuideChips() {
  const ui = currentUi();
  const types = guideTypes();
  if (ui.guideType && !types.includes(ui.guideType)) ui.guideType = "";
  document.getElementById("guide-row").replaceChildren(
    chipButton("data-guide", "", "All", !ui.guideType),
    ...types.map((type) => chipButton("data-guide", type, siteLabel(type), ui.guideType === type))
  );
}

function renderSectionNav(route) {
  const nav = document.getElementById("section-nav");
  if (!nav || !state.game) return;
  const game = state.game;
  const items = [
    ["builds", "Builds", true],
    ["map", "Map", Boolean(game.map)],
    ["crafting", "Crafting", Boolean(game.crafting)],
    ["equipment", "Equipment", Boolean(game.equipment)],
    ...activeExtraSections().filter((section) => section && section.id).map((section) => [section.id, section.label || section.id, true])
  ].filter((item) => item[2]);
  nav.replaceChildren(
    ...items.map(([id, label]) =>
      el("button", {
        type: "button",
        class: "section-tab",
        "data-section": id,
        "aria-pressed": route.section === id ? "true" : "false",
        text: label
      })
    )
  );
}

function renderGameTabs() {
  const row = document.getElementById("game-row");
  row.replaceChildren(
    ...state.games.map((game) => {
      const selected = state.game && state.game.id === game.id;
      return el("button", {
        type: "button",
        class: "game-tab",
        "data-game": game.id,
        "aria-pressed": selected ? "true" : "false",
        text: game.name
      });
    })
  );
  const selected = row.querySelector("[aria-pressed='true']");
  if (!selected) return;
  const pad = 2;
  const leftEdge = selected.offsetLeft;
  const rightEdge = leftEdge + selected.offsetWidth;
  if (leftEdge < row.scrollLeft) row.scrollTo({ left: Math.max(0, leftEdge - pad) });
  else if (rightEdge > row.scrollLeft + row.clientWidth) {
    row.scrollTo({ left: rightEdge - row.clientWidth + pad });
  }
}

function renderVariantSwitch() {
  const row = document.getElementById("variant-row");
  if (!row) return;
  const list = (state.game && state.game.variants) || [];
  if (list.length < 2) {
    row.hidden = true;
    row.replaceChildren();
    return;
  }
  row.hidden = false;
  row.setAttribute("aria-label", `${state.game.name} data`);
  row.replaceChildren(
    ...list.map((item) =>
      el("button", {
        type: "button",
        class: "game-tab",
        "data-variant": item.id,
        "aria-pressed": state.variant && state.variant.id === item.id ? "true" : "false",
        text: item.label || item.id
      })
    )
  );
}

function cardTitle(build) {
  const name = String(build.name || "Build");
  if (build.fortune && build.fortune.major && /\bfortune\b/i.test(name)) {
    const trimmed = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (trimmed) return trimmed;
  }
  return name;
}

function clipPoint(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function weaponPoint(build) {
  const raw = String((build.weapons && build.weapons[0]) || "");
  const head = raw.split(/[,(/]/)[0].replace(/\s*[×x]\s*\d.*$/, "").trim();
  return clipPoint(head, 32);
}

function statPoint(build) {
  const arch = String(build.archetype || "");
  const inner = arch.match(/\(([^)]+)\)/);
  const focus = inner && /strength|skill|blood|arcane|dex|faith|magic|int|str|fth/i.test(inner[1])
    ? inner[1]
    : arch.replace(/\s*\([^)]*\)/g, "");
  return clipPoint(focus, 28);
}

function playPoint(build) {
  const best = (build.bestFor || []).map((item) => String(item || "").trim()).find(Boolean);
  if (best) return clipPoint(best, 28);
  const clause = String(build.playstyle || "").split(/[.;]/)[0];
  return clipPoint(clause.split(/\s+/).slice(0, 4).join(" "), 28);
}

function fortunePoint(name) {
  return String(name || "").replace(/^Fortune of the\s+/i, "").replace(/^Fortune of\s+/i, "").trim() || name;
}

function renderCard(build) {
  const title = cardTitle(build);
  const points = [weaponPoint(build), statPoint(build), playPoint(build)].filter(Boolean).map((text) =>
    el("span", { class: "point", text })
  );
  if (build.fortune && build.fortune.major) {
    const link = fortuneAnchor(build.fortune.major);
    link.classList.add("point");
    link.textContent = fortunePoint(build.fortune.major);
    link.setAttribute("aria-label", build.fortune.major);
    points.push(link);
  }
  return el("article", { class: "card", "data-tier": build.tier }, [
    el("button", { type: "button", class: "card-hit", "data-id": build.id, "aria-label": `Open ${title}` }),
    el("span", { class: "card-seal", "aria-hidden": "true", text: build.tier }),
    el("span", { class: "card-copy" }, [
      el("span", { class: "card-name", text: title }),
      el("span", { class: "card-points" }, points)
    ])
  ]);
}

function slugify(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function fortuneAnchor(name) {
  const link = document.createElement("a");
  link.className = "fortune-link";
  link.href = `#${hashFor(state.game.id, "systems", `fortunes/${slugify(name)}`)}`;
  link.textContent = name;
  return link;
}

function renderList() {
  const host = document.getElementById("tier-list");
  const count = document.getElementById("count");
  if (!state.data || !state.game) return;
  const builds = visibleBuilds();
  const total = state.data.builds.length;
  const shown = builds.length;
  count.textContent = shown === total
    ? `${total} ${total === 1 ? "build" : "builds"}`
    : `${shown} of ${total} ${total === 1 ? "build" : "builds"}`;
  host.replaceChildren();
  if (!builds.length) {
    host.append(
      el("div", { class: "empty" }, [
        el("p", { text: "No builds match these filters." }),
        el("button", { type: "button", class: "text-btn", id: "clear-filters", text: "Clear filters" })
      ])
    );
    document.getElementById("clear-filters").addEventListener("click", () => {
      const ui = currentUi();
      ui.arch = "";
      ui.best = "";
      ui.query = "";
      document.getElementById("q").value = "";
      renderFilterChips();
      renderList();
    });
    return;
  }
  const gameId = state.game.id;
  for (const tier of TIERS) {
    const items = builds.filter((build) => build.tier === tier);
    if (!items.length) continue;
    const heading = el("h2", { class: "tier-letter" });
    heading.setAttribute("aria-label", `Tier ${tier}, ${items.length} ${items.length === 1 ? "build" : "builds"}`);
    heading.append(
      el("span", { "aria-hidden": "true", text: tier }),
      el("small", { class: "tier-count", "aria-hidden": "true", text: String(items.length) })
    );
    const cards = el("div", { class: "tier-cards" }, items.map(renderCard));
    cards.querySelectorAll("[data-id]").forEach((card) => {
      card.addEventListener("click", () => setHash(hashFor(gameId, "tiers", card.dataset.id)));
    });
    host.append(el("section", { class: "tier", "data-tier": tier }, [heading, cards]));
  }
}

function renderGuides() {
  const host = document.getElementById("guide-list");
  const count = document.getElementById("guide-count");
  if (!state.data) return;
  const ui = currentUi();
  const guides = state.data.guides.filter((guide) => !ui.guideType || guide.siteType === ui.guideType);
  count.textContent = `${guides.length} ${guides.length === 1 ? "guide" : "guides"}`;
  host.replaceChildren();
  if (!guides.length) {
    host.append(el("p", { class: "empty", text: "No guides in this group." }));
    return;
  }
  for (const guide of guides) {
    const link = externalLink(guide.url, "guide-card");
    link.append(
      el("span", { class: "guide-top" }, [
        el("span", { class: `badge ${guide.siteType}`, text: siteLabel(guide.siteType) }),
        guide.site ? el("span", { class: "site-name", text: guide.site }) : null,
        guide.unverified ? el("span", { class: "flag", text: "Unverified" }) : null
      ]),
      el("span", { class: "guide-title", text: guide.title }),
      guide.description ? el("span", { class: "guide-desc", text: guide.description }) : null,
      el("span", { class: "visually-hidden", text: " (opens in a new tab)" })
    );
    host.append(link);
  }
}

function statGrid(build) {
  const order = statOrder(state.data.meta, state.game);
  const grid = el(
    "div",
    { class: `stat-grid count-${order.length}` },
    order.map((key) => {
      const value = build.stats.spread[key];
      const width = typeof value === "number" ? Math.max(0, Math.min(100, (value / 99) * 100)) : 0;
      const bar = el("i");
      bar.style.setProperty("--w", `${width}%`);
      return el("div", { class: "stat" }, [
        el("span", { text: key }),
        el("b", { text: value == null ? "—" : String(value) }),
        bar
      ]);
    })
  );
  return grid;
}

function sourceList(sources) {
  const groups = new Map();
  for (const source of sources) {
    const key = source.siteType || "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(source);
  }
  const keys = [
    ...SITE_ORDER.filter((key) => groups.has(key)),
    ...[...groups.keys()].filter((key) => !SITE_ORDER.includes(key))
  ];
  const wrap = el("div");
  for (const key of keys) {
    const group = el("div", { class: "source-group" }, [el("h4", { text: siteLabel(key) })]);
    for (const source of groups.get(key)) {
      const link = externalLink(source.url, "source");
      link.append(
        el("span", { class: `badge ${key}`, text: siteLabel(key) }),
        el("span", { class: "source-title" }, [
          source.title,
          source.unverified ? el("span", { class: "flag", text: "Unverified" }) : null,
          el("span", { class: "visually-hidden", text: " (opens in a new tab)" })
        ])
      );
      if (source.note) link.append(el("span", { class: "source-note", text: source.note }));
      if (state.data && state.data.meta && state.data.meta.mode === "reforged" && source.verifiedVia) {
        link.append(el("span", { class: "source-note", text: source.verifiedVia }));
      }
      group.append(link);
    }
    wrap.append(group);
  }
  return wrap;
}

function equipmentCatalog(data) {
  if (!data) return [];
  const rows = [];
  (data.weapons || []).forEach((item) => {
    if (item && item.name && item.id) rows.push({ kind: "weapons", name: item.name, id: item.id });
  });
  (data.talismans || []).forEach((item) => {
    if (item && item.name && item.id) rows.push({ kind: "talismans", name: item.name, id: item.id });
  });
  (data.armorSets || []).forEach((item) => {
    if (item && item.name && item.id) rows.push({ kind: "armor", name: item.name, id: item.id });
  });
  rows.sort((a, b) => b.name.length - a.name.length);
  return rows;
}

function escapeReg(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function linkedGear(text, catalog) {
  const value = String(text || "");
  if (!catalog || !catalog.length || !value) return el("span", { text: value });
  const lower = value.toLowerCase();
  const hits = [];
  catalog.forEach((item) => {
    const needle = item.name.toLowerCase();
    if (needle.length < 3) return;
    const pattern = new RegExp(`(?<![a-z0-9])${escapeReg(needle)}(?![a-z0-9])`, "g");
    let match;
    while ((match = pattern.exec(lower))) {
      hits.push({ start: match.index, end: match.index + needle.length, item });
    }
  });
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  let cursor = 0;
  hits.forEach((hit) => {
    if (hit.start < cursor) return;
    kept.push(hit);
    cursor = hit.end;
  });
  if (!kept.length) return el("span", { text: value });
  const node = el("span");
  let at = 0;
  kept.forEach((hit) => {
    if (hit.start > at) node.append(document.createTextNode(value.slice(at, hit.start)));
    const link = document.createElement("a");
    link.className = "equip-link";
    link.href = `#${hashFor(state.game.id, hit.item.kind, hit.item.id)}`;
    link.textContent = value.slice(hit.start, hit.end);
    node.append(link);
    at = hit.end;
  });
  if (at < value.length) node.append(document.createTextNode(value.slice(at)));
  return node;
}

function fortuneBlock(fortune) {
  if (!fortune) return null;
  const source = fortune.source ? externalLink(fortune.source) : null;
  if (source) source.textContent = fortune.major;
  return el("section", { class: "block" }, [
    el("h3", { text: "Fortune" }),
    el("p", { class: "card-fortune" }, [
      fortuneAnchor(fortune.major),
      fortune.majorTier ? el("span", { class: "platform", text: fortune.majorTier }) : null
    ]),
    fortune.minor ? el("p", { class: "card-fortune" }, [
      document.createTextNode("Minor "),
      fortuneAnchor(fortune.minor)
    ]) : null,
    fortune.minorNote ? el("p", { text: fortune.minorNote }) : null,
    source ? el("p", {}, [document.createTextNode("Source "), source]) : null,
    fortune.sourceVerifiedVia ? el("p", { class: "muted", text: fortune.sourceVerifiedVia }) : null
  ]);
}

function renderBuild(build, catalog) {
  const meta = state.data.meta;
  const alts = build.stats.altSpreads || [];
  const order = statOrder(meta, state.game);
  const prefix = state.game.levelPrefix;
  const level = prefix ? `${prefix} ${build.stats.level}` : `Level ${build.stats.level}`;
  const gear = catalog && build.mode === "reforged" ? catalog : null;
  const root = el("article", {}, [
    el("p", { class: "tier-pill", "data-tier": build.tier, text: `Tier ${build.tier}` }),
    build.tierLabel ? el("p", { class: "muted", text: build.tierLabel }) : null,
    el("p", { class: "sheet-kicker" }, [build.archetype, platformBadge(build)]),
    el("h2", { id: "sheet-title", text: build.name }),
    el("p", { class: "play-full", text: build.playstyle }),
    el("hr", { class: "rule" }),
    fortuneBlock(build.fortune),
    el("section", { class: "block" }, [
      el("h3", { text: "Why this tier" }),
      el("p", { class: "reason", text: build.tierReason })
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: fieldLabel(meta, "weapons") }),
      el("ul", { class: "clean" }, build.weapons.map((weapon) => el("li", {}, [linkedGear(weapon, gear)]))),
      el("h3", { text: fieldLabel(meta, "firearm") }),
      el("p", { text: build.firearm })
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: "Stat spread" }),
      el("p", { class: "stat-label" }, [el("strong", { text: level }), build.stats.label]),
      statGrid(build),
      alts.length
        ? el("div", { class: "block" }, [
            el("h3", { text: "Alternatives" }),
            el("ul", { class: "clean" }, alts.map((alt) => renderAlt(alt, order)))
          ])
        : null
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: fieldLabel(meta, "runesGear") }),
      el("ul", { class: "clean" }, build.runesGear.map((item) => el("li", {}, [linkedGear(item, gear)])))
    ]),
    el("div", { class: "split" }, [
      el("section", { class: "block" }, [
        el("h3", { text: "Pros" }),
        el("ul", { class: "clean pros" }, build.pros.map((item) => el("li", { text: item })))
      ]),
      el("section", { class: "block" }, [
        el("h3", { text: "Cons" }),
        el("ul", { class: "clean cons" }, build.cons.map((item) => el("li", { text: item })))
      ])
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: "Best for" }),
      el("div", { class: "tag-row" }, build.bestFor.map((tag) => el("span", { class: "tag", text: tag })))
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: "NG+" }),
      el("p", { text: build.ngNotes })
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: "Sources" }),
      el("p", { class: "hint", text: "Links open in a new tab." }),
      sourceList(build.sources)
    ])
  ]);
  root.querySelector(".tier-pill").style.setProperty("--tier", `var(--${build.tier.toLowerCase()})`);
  return root;
}

function renderDisposition() {
  const host = document.getElementById("vanilla-fate");
  if (!host) return;
  const rows = (state.data && state.data.meta && state.data.meta.vanillaDisposition) || [];
  if (!Array.isArray(rows) || !rows.length) {
    host.hidden = true;
    host.replaceChildren();
    return;
  }
  host.hidden = false;
  const groups = [
    ["rewritten", "Rewritten"],
    ["dropped", "Dropped"],
    ["not-ported", "Not ported"]
  ];
  const details = el("details", { class: "system-block", id: "vanilla-disposition" });
  details.append(el("summary", { text: "What happened to my vanilla builds" }));
  groups.forEach(([id, label]) => {
    const items = rows.filter((row) => row && row.disposition === id);
    if (!items.length) return;
    details.append(el("h3", { class: "system-name", text: `${label} (${items.length})` }));
    if (id === "not-ported") {
      const reason = items[0] && items[0].reason;
      if (reason) details.append(el("p", { class: "disposition-reason", text: reason }));
    }
    details.append(el("ul", { class: "clean" }, items.map((row) => {
      const line = el("li");
      line.append(document.createTextNode(row.vanillaName || row.vanillaId || "Build"));
      if (row.errBuildId) {
        const found = (state.data.builds || []).find((build) => build.id === row.errBuildId);
        line.append(document.createTextNode(" → "));
        if (found) {
          const link = document.createElement("a");
          link.className = "fortune-link";
          link.href = `#${hashFor(state.game.id, "tiers", found.id)}`;
          link.textContent = found.name;
          line.append(link);
        } else {
          line.append(document.createTextNode(row.errBuildId));
        }
      }
      if (id !== "not-ported" && row.reason) {
        line.append(el("span", { class: "muted", text: ` — ${row.reason}` }));
      }
      return line;
    })));
  });
  host.replaceChildren(details);
}

function renderAbout() {
  const meta = state.data.meta;
  const defs = el("dl", { class: "defs" });
  for (const tier of TIERS) {
    if (!meta.tierScale || !meta.tierScale[tier]) continue;
    defs.append(el("div", {}, [el("dt", { class: tier, text: tier }), el("dd", { text: meta.tierScale[tier] })]));
  }
  const kicker = meta.game || state.game.name;
  const tierBits = TIERS.map((tier) => {
    const n = state.data.builds.filter((build) => build.tier === tier).length;
    return n ? `${tier} ${n}` : null;
  }).filter(Boolean);
  const guideCount = (state.data.guides || []).length;
  return el("article", {}, [
    variantBannerNode(),
    reforgedCreditNode(),
    imageCreditNode(),
    el("p", { class: "sheet-kicker", text: kicker }),
    el("h2", { id: "sheet-title", text: meta.title || state.game.name }),
    el("p", {
      class: "snapshot",
      text: `${state.data.builds.length} builds (${tierBits.join(", ")}) and ${guideCount} ${guideCount === 1 ? "guide" : "guides"} in this snapshot.`
    }),
    el("section", { class: "block" }, [el("h3", { text: "Tier definitions" }), defs]),
    el("section", { class: "block" }, [el("h3", { text: "Caveats" }), el("p", { text: meta.notes })]),
    meta.patchInfo
      ? el("section", { class: "block" }, [el("h3", { text: "Patches" }), el("p", { text: meta.patchInfo })])
      : null,
    el("section", { class: "block" }, [el("h3", { text: "Stat spreads" }), el("p", { text: meta.levelConventions })]),
    el("section", { class: "block" }, [
      el("h3", { text: "Sources" }),
      el("p", { text: meta.verification }),
      el("p", { text: `Research snapshot ${meta.generatedDate}.` })
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: "Filters" }),
      el("p", {
        text: "Archetype and best-for filters match wording already stored on each build — the archetype line, best-for tags, and notes. They do not add rankings."
      })
    ])
  ]);
}

function showSheet(node) {
  sheetBody.replaceChildren(node);
  const opening = !sheet.open;
  if (opening) sheet.showModal();
  const title = document.getElementById("sheet-title");
  if (opening && title) {
    title.setAttribute("tabindex", "-1");
    title.focus();
  }
}

function buildsPath(game, variant) {
  if (variant && variant.builds) return variant.builds;
  return game.file;
}

async function loadGame(game, variant) {
  const file = buildsPath(game, variant);
  if (loaded.has(file)) return loaded.get(file);
  const response = await fetch(`./${file}`);
  if (!response.ok) throw new Error(String(response.status));
  const data = await response.json();
  loaded.set(file, data);
  return data;
}

const extras = new Map();
async function loadExtra(path) {
  if (extras.has(path)) return extras.get(path);
  const response = await fetch(`./${path}`);
  if (!response.ok) throw new Error(String(response.status));
  const data = await response.json();
  extras.set(path, data);
  return data;
}

async function render() {
  const token = ++renderToken;
  if (!state.games.length) return;
  const route = parseHash();
  const game = gameById(route.gameId) || state.games[0];
  state.game = game;
  state.variant = resolveVariant(game, route);
  let data;
  try {
    data = await loadGame(game, state.variant);
  } catch (error) {
    if (token !== renderToken) return;
    document.getElementById("tier-list").replaceChildren(el("p", { class: "empty", text: "The build list could not be loaded." }));
    return;
  }
  if (token !== renderToken) return;
  if (game.variants && game.variants.length) {
    rememberVariant(game.id, state.variant && !state.variant.default ? state.variant.id : "");
  }

  let fellBack = false;
  if (route.section !== "builds" && !sectionFile(game, route.section)) {
    fellBack = true;
    route.section = "builds";
    route.view = "tiers";
    route.focus = null;
    route.about = false;
    route.build = null;
  }

  const canonical = `#${scopedHash(game.id, route)}`;
  const variantToken = state.variant && !state.variant.default ? state.variant.id : null;
  const variantDrift = (route.variantId || null) !== variantToken;
  if ((route.unscoped || fellBack || variantDrift) && location.hash !== canonical) {
    history.replaceState(history.state || { bb: true }, "", `${location.pathname}${location.search}${canonical}`);
  }

  state.data = data;
  rememberGame(game.id);
  applyAccent(game);

  const onBuilds = route.section === "builds";
  const onGuides = onBuilds && route.view === "guides";
  document.getElementById("lede").hidden = !onBuilds;
  document.querySelector(".tabs").hidden = !onBuilds;
  document.getElementById("panel-tiers").hidden = !onBuilds || onGuides;
  document.getElementById("panel-guides").hidden = !onGuides;
  const onExtra = Boolean(extraSectionById(game.id, route.section));
  document.getElementById("panel-map").hidden = route.section !== "map";
  document.getElementById("panel-crafting").hidden = route.section !== "crafting";
  document.getElementById("panel-equipment").hidden = route.section !== "equipment";
  const extraPanel = document.getElementById("panel-extra");
  if (extraPanel) extraPanel.hidden = !onExtra;
  document.getElementById("tab-tiers").setAttribute("aria-selected", onGuides ? "false" : "true");
  document.getElementById("tab-guides").setAttribute("aria-selected", onGuides ? "true" : "false");
  renderGameTabs();
  renderVariantSwitch();
  renderSectionNav(route);
  const tierBanners = document.getElementById("tier-banners");
  const guideBanners = document.getElementById("guide-banners");
  if (tierBanners) {
    const note = variantBuildsNote();
    const banner = variantBannerNode();
    if (note && banner) {
      const sources = banner.querySelector(".variant-sources");
      if (sources) note.append(sources);
      tierBanners.replaceChildren(note);
    } else {
      tierBanners.replaceChildren(...[note, banner].filter(Boolean));
    }
  }
  if (guideBanners) guideBanners.replaceChildren(...[variantBannerNode()].filter(Boolean));

  if (route.section !== "map" && typeof SoulsSections !== "undefined") SoulsSections.closeEmbed();

  if (onBuilds) {
    state.extra = null;
    document.getElementById("lede").textContent = firstSentence(data.meta.notes);
    document.getElementById("catalog").textContent = `${data.builds.length} builds`;
    document.getElementById("colophon").textContent = data.meta.generatedDate
      ? `${game.name}${state.variant && !state.variant.default ? ` · ${state.variant.label}` : ""} · research snapshot ${data.meta.generatedDate}.`
      : "";
    renderFilterChips();
    renderGuideChips();
    renderList();
    renderDisposition();
    renderGuides();
  } else {
    const path = sectionFile(game, route.section);
    const panel = document.getElementById(onExtra ? "panel-extra" : `panel-${route.section}`);
    try {
      state.extra = await loadExtra(path);
    } catch (error) {
      if (token !== renderToken) return;
      state.extra = null;
      if (panel) panel.replaceChildren(el("p", { class: "empty", text: "This section could not be loaded." }));
    }
    if (token !== renderToken) return;
    const notes = state.extra && state.extra.meta && state.extra.meta.notes;
    document.getElementById("lede").textContent = notes ? firstSentence(notes) : `${game.name}`;
    document.getElementById("catalog").textContent = sectionCount(route.section, state.extra);
    const sample = state.extra && state.extra.meta && state.extra.meta.sample;
    const variantBit = state.variant && !state.variant.default ? ` · ${state.variant.label}` : "";
    document.getElementById("colophon").textContent = sample
      ? `${game.name}${variantBit} · sample ${route.section} entries.`
      : `${game.name}${variantBit} · ${route.section}.`;
    if (route.section === "equipment" && route.view === "talismans" && state.extra && !(state.extra.talismans || []).length) {
      route.view = "weapons";
      route.focus = null;
      const back = `#${hashFor(game.id, "weapons")}`;
      if (location.hash !== back) history.replaceState(history.state || { bb: true }, "", `${location.pathname}${location.search}${back}`);
    }
    if (state.extra && typeof SoulsSections !== "undefined") {
      if ((route.section === "crafting" || route.section === "equipment") && typeof SoulsSections.loadItemIndex === "function") {
        try {
          await SoulsSections.loadItemIndex();
        } catch (error) {
          /* Cards fall back to the placeholder. */
        }
        if (token !== renderToken) return;
      }
      SoulsSections.render({ section: route.section, extra: state.extra, route });
    }
  }

  let gearCatalog = null;
  if (route.build && state.variant && state.variant.equipment) {
    try {
      gearCatalog = equipmentCatalog(await loadExtra(state.variant.equipment));
    } catch (error) {
      gearCatalog = null;
    }
    if (token !== renderToken) return;
  }

  if (route.about) showSheet(renderAbout());
  else if (route.build) {
    const build = data.builds.find((item) => item.id === route.build);
    if (build) showSheet(renderBuild(build, gearCatalog));
    else if (sheet.open) sheet.close();
  } else if (route.focus && state.extra && typeof SoulsSections !== "undefined") {
    const node = SoulsSections.sheet(route, state.extra);
    if (node) showSheet(node);
    else if (sheet.open) sheet.close();
  } else if (sheet.open) sheet.close();
  syncHeaderHeight();
}

function bind() {
  document.getElementById("q").addEventListener("input", (event) => {
    currentUi().query = event.target.value;
    renderList();
  });
  document.getElementById("sort").addEventListener("change", (event) => {
    currentUi().sort = event.target.value;
    renderList();
  });
  document.getElementById("arch-row").addEventListener("click", (event) => {
    const button = event.target.closest("[data-arch]");
    if (!button) return;
    const ui = currentUi();
    ui.arch = button.dataset.arch && button.dataset.arch !== ui.arch ? button.dataset.arch : "";
    renderFilterChips();
    renderList();
  });
  document.getElementById("best-row").addEventListener("click", (event) => {
    const button = event.target.closest("[data-best]");
    if (!button) return;
    const ui = currentUi();
    ui.best = button.dataset.best && button.dataset.best !== ui.best ? button.dataset.best : "";
    renderFilterChips();
    renderList();
  });
  document.getElementById("guide-row").addEventListener("click", (event) => {
    const button = event.target.closest("[data-guide]");
    if (!button) return;
    currentUi().guideType = button.dataset.guide || "";
    renderGuideChips();
    renderGuides();
  });
  document.getElementById("variant-row").addEventListener("click", (event) => {
    const button = event.target.closest("[data-variant]");
    if (!button || !state.game) return;
    const next = variantById(state.game, button.dataset.variant);
    if (!next || (state.variant && next.id === state.variant.id)) return;
    state.variant = next;
    rememberVariant(state.game.id, next.default ? "" : next.id);
    setHash(scopedHash(state.game.id, parseHash()));
  });
  document.getElementById("game-row").addEventListener("click", (event) => {
    const button = event.target.closest("[data-game]");
    if (!button || !state.game || button.dataset.game === state.game.id) return;
    const next = gameById(button.dataset.game);
    const route = parseHash();
    let view = "tiers";
    if (route.section === "map" && next && next.map) view = "map";
    else if (route.section === "crafting" && next && next.crafting) view = "crafting";
    else if (route.section === "equipment" && next && next.equipment) view = route.view === "armor" ? "armor" : "weapons";
    else if (route.about) view = "about";
    else if (route.view === "guides") view = "guides";
    setHash(hashFor(button.dataset.game, view));
  });
  document.getElementById("section-nav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (!button || !state.game) return;
    const id = button.dataset.section;
    if (activeExtraSections().some((section) => section.id === id)) setHash(hashFor(state.game.id, id));
    else if (id === "map") setHash(hashFor(state.game.id, "map"));
    else if (id === "crafting") setHash(hashFor(state.game.id, "crafting"));
    else if (id === "equipment") setHash(hashFor(state.game.id, "weapons"));
    else setHash(hashFor(state.game.id, "tiers"));
  });
  document.getElementById("tab-tiers").addEventListener("click", () => {
    if (state.game) setHash(hashFor(state.game.id, "tiers"));
  });
  document.getElementById("tab-guides").addEventListener("click", () => {
    if (state.game) setHash(hashFor(state.game.id, "guides"));
  });
  document.getElementById("tab-about").addEventListener("click", () => {
    if (state.game) setHash(hashFor(state.game.id, "about"));
  });
  document.querySelector(".sheet-close").addEventListener("click", leaveSheet);
  sheet.addEventListener("click", (event) => {
    const panel = sheet.querySelector(".sheet-panel");
    if (panel && !panel.contains(event.target)) leaveSheet();
  });
  sheet.addEventListener("cancel", (event) => {
    event.preventDefault();
    leaveSheet();
  });
  window.addEventListener("popstate", render);
  window.addEventListener("hashchange", render);
  window.addEventListener("resize", syncHeaderHeight);
}

async function init() {
  if (typeof SoulsSections !== "undefined") SoulsSections.startEmbers();
  const list = document.getElementById("tier-list");
  try {
    const response = await fetch("./data/games.json");
    if (!response.ok) throw new Error(String(response.status));
    const registry = await response.json();
    state.games = registry.games || [];
    if (!state.games.length) throw new Error("empty");
  } catch (error) {
    list.replaceChildren(el("p", { class: "empty", text: "The game list could not be loaded." }));
    return;
  }
  bind();
  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeaderHeight);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

init();
