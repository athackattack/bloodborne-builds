"use strict";

const TIERS = ["S", "A", "B", "C"];
const SITE_ORDER = ["wiki", "reddit", "forum", "guide", "video"];
const SITE_LABEL = {
  wiki: "Wiki",
  reddit: "Reddit",
  forum: "Forum",
  guide: "Guide",
  video: "Video"
};
const FIELD_DEFAULTS = {
  weapons: "Weapons",
  firearm: "Firearm",
  runesGear: "Runes and gear"
};
const STORAGE_KEY = "souls-builds-game";
const DENSITY_KEY = "souls-builds-density";

const sheet = document.getElementById("sheet");
const sheetBody = document.getElementById("sheet-body");

const state = {
  games: [],
  game: null,
  data: null,
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
  if (!state.ui[id]) state.ui[id] = { arch: "", best: "", query: "", sort: "listed", guideType: "" };
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

function cardsExpanded() {
  try {
    return localStorage.getItem(DENSITY_KEY) === "full";
  } catch (error) {
    return false;
  }
}

function applyDensity() {
  const expanded = cardsExpanded();
  const list = document.getElementById("tier-list");
  if (list) list.classList.toggle("is-compact", !expanded);
  const button = document.getElementById("density");
  if (!button) return;
  button.setAttribute("aria-pressed", expanded ? "true" : "false");
  button.setAttribute("aria-label", expanded ? "Hide playstyles on cards" : "Show playstyles on cards");
}

function fieldLabel(meta, key) {
  const labels = (meta && meta.fieldLabels) || {};
  return labels[key] || FIELD_DEFAULTS[key] || key;
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
  const hay = [build.name, build.archetype, build.playstyle, build.firearm, ...(build.weapons || []), ...(build.bestFor || [])]
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
  let view = "tiers";
  let about = false;
  let build = null;
  if (rest[0] === "guides") view = "guides";
  else if (rest[0] === "about") about = true;
  else if (rest[0] === "build" && rest[1]) build = rest.slice(1).join("/");
  return { gameId, view, about, build, unscoped: !known };
}

function hashFor(gameId, view, buildId) {
  if (buildId) return `${gameId}/build/${encodeURIComponent(buildId)}`;
  if (view === "guides") return `${gameId}/guides`;
  if (view === "about") return `${gameId}/about`;
  return gameId;
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
  if (!route.about && !route.build) {
    if (sheet.open) sheet.close();
    return;
  }
  if (history.state && history.state.bb) {
    history.back();
    return;
  }
  const next = hashFor(route.gameId, route.view === "guides" ? "guides" : "tiers");
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
}

function renderCard(build) {
  const extra = build.weapons.length > 1 ? build.weapons.length - 1 : 0;
  return el("button", { type: "button", class: "card", "data-tier": build.tier, "data-id": build.id }, [
    el("span", { class: "card-kicker", text: build.archetype }),
    el("span", { class: "card-name", text: build.name }),
    el("span", { class: "card-weapon" }, [
      build.weapons[0] || "",
      extra ? el("em", { text: `+${extra} more` }) : null
    ]),
    el("span", { class: "card-play", text: build.playstyle })
  ]);
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
    cards.querySelectorAll(".card").forEach((card) => {
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
      group.append(link);
    }
    wrap.append(group);
  }
  return wrap;
}

function renderBuild(build) {
  const meta = state.data.meta;
  const alts = build.stats.altSpreads || [];
  const prefix = state.game.levelPrefix;
  const level = prefix ? `${prefix} ${build.stats.level}` : `Level ${build.stats.level}`;
  const root = el("article", {}, [
    el("p", { class: "tier-pill", "data-tier": build.tier, text: `Tier ${build.tier}` }),
    el("p", { class: "sheet-kicker", text: build.archetype }),
    el("h2", { id: "sheet-title", text: build.name }),
    el("p", { class: "play-full", text: build.playstyle }),
    el("hr", { class: "rule" }),
    el("section", { class: "block" }, [
      el("h3", { text: "Why this tier" }),
      el("p", { class: "reason", text: build.tierReason })
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: fieldLabel(meta, "weapons") }),
      el("ul", { class: "clean" }, build.weapons.map((weapon) => el("li", { text: weapon }))),
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
            el("ul", { class: "clean" }, alts.map((alt) => el("li", { text: alt })))
          ])
        : null
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: fieldLabel(meta, "runesGear") }),
      el("ul", { class: "clean" }, build.runesGear.map((item) => el("li", { text: item })))
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

async function loadGame(game) {
  if (loaded.has(game.id)) return loaded.get(game.id);
  const response = await fetch(`./${game.file}`);
  if (!response.ok) throw new Error(String(response.status));
  const data = await response.json();
  loaded.set(game.id, data);
  return data;
}

async function render() {
  const token = ++renderToken;
  if (!state.games.length) return;
  const route = parseHash();
  const game = gameById(route.gameId) || state.games[0];
  let data;
  try {
    data = await loadGame(game);
  } catch (error) {
    if (token !== renderToken) return;
    document.getElementById("tier-list").replaceChildren(el("p", { class: "empty", text: "The build list could not be loaded." }));
    return;
  }
  if (token !== renderToken) return;

  if (route.unscoped) {
    const scoped = hashFor(game.id, route.about ? "about" : route.view, route.build);
    const next = `#${scoped}`;
    if (location.hash !== next) history.replaceState(history.state || { bb: true }, "", `${location.pathname}${location.search}${next}`);
  }

  state.game = game;
  state.data = data;
  rememberGame(game.id);
  applyAccent(game);
  document.getElementById("lede").textContent = firstSentence(data.meta.notes);
  document.getElementById("catalog").textContent = `${data.builds.length} builds`;
  applyDensity();

  const onGuides = route.view === "guides";
  document.getElementById("panel-tiers").hidden = onGuides;
  document.getElementById("panel-guides").hidden = !onGuides;
  document.getElementById("tab-tiers").setAttribute("aria-selected", onGuides ? "false" : "true");
  document.getElementById("tab-guides").setAttribute("aria-selected", onGuides ? "true" : "false");
  renderGameTabs();
  renderFilterChips();
  renderGuideChips();
  renderList();
  renderGuides();
  document.getElementById("colophon").textContent = data.meta.generatedDate
    ? `${game.name} · research snapshot ${data.meta.generatedDate}.`
    : "";

  if (route.about) showSheet(renderAbout());
  else if (route.build) {
    const build = data.builds.find((item) => item.id === route.build);
    if (build) showSheet(renderBuild(build));
    else if (sheet.open) sheet.close();
  } else if (sheet.open) sheet.close();
  syncHeaderHeight();
}

function bind() {
  document.getElementById("density").addEventListener("click", () => {
    try {
      localStorage.setItem(DENSITY_KEY, cardsExpanded() ? "compact" : "full");
    } catch (error) {
      /* private mode */
    }
    applyDensity();
  });
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
  document.getElementById("game-row").addEventListener("click", (event) => {
    const button = event.target.closest("[data-game]");
    if (!button || !state.game || button.dataset.game === state.game.id) return;
    const route = parseHash();
    const view = route.about ? "about" : route.view === "guides" ? "guides" : "tiers";
    setHash(hashFor(button.dataset.game, view));
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
