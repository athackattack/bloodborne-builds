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
  if (route.focus.kind === "item") return itemSheet(extra, route.focus.id);
  if (route.focus.kind === "material") return materialSheet(extra, route.focus.id);
  if (route.focus.kind === "weapon") return weaponSheet(extra, route.focus.id);
  if (route.focus.kind === "armor") return armorSheet(extra, route.focus.id);
  if (route.focus.kind === "section-about") return sectionAboutSheet(extra, route.focus.id);
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
  if (event.target.closest("[data-more]")) {
    bumpPage(event.target.closest("[data-more]").dataset.more);
    render({ section: "crafting", extra: state.extra });
    return;
  }
  if (event.target.closest("[data-section-about]")) {
    setHash(hashFor(state.game.id, "craft-about"));
    return;
  }
  const cat = event.target.closest("[data-craft-cat]");
  if (cat) {
    ui().craftCat = cat.dataset.craftCat || "";
    ui().craftLimit = PAGE_SIZE;
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
  ui().craftLimit = PAGE_SIZE;
  ui().matLimit = PAGE_SIZE;
  render({ section: "crafting", extra: state.extra });
  const box = document.getElementById("craft-q");
  if (box) {
    box.focus();
    const end = box.value.length;
    box.setSelectionRange(end, end);
  }
}

function onEquipClick(event) {
  if (event.target.closest("[data-more]")) {
    bumpPage(event.target.closest("[data-more]").dataset.more);
    render({ section: "equipment", extra: state.extra, route: parseHash() });
    return;
  }
  if (event.target.closest("[data-section-about]")) {
    setHash(hashFor(state.game.id, "equip-about"));
    return;
  }
  const tab = event.target.closest("[data-equip-tab]");
  if (tab) {
    setHash(hashFor(state.game.id, tab.dataset.equipTab === "armor" ? "armor" : "weapons"));
    return;
  }
  const type = event.target.closest("[data-equip-type]");
  if (type) {
    ui().equipType = type.dataset.equipType || "";
    ui().weaponLimit = PAGE_SIZE;
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
  ui().weaponLimit = PAGE_SIZE;
  ui().armorLimit = PAGE_SIZE;
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
  const choice = event.target.closest("[data-map-choice]");
  if (choice && choice.dataset.mapChoice) {
    setHash(hashFor(state.game.id, "map", choice.dataset.mapChoice));
    return;
  }
  const wrap = document.querySelector("#panel-map .map-frame-wrap");
  if (event.target.closest("[data-map-activate]") && wrap) {
    wrap.classList.add("is-live");
    return;
  }
  if (event.target.closest("[data-map-release]") && wrap) {
    wrap.classList.remove("is-live");
    return;
  }
  const stage = document.getElementById("map-viewer");
  const zoom = event.target.closest("[data-zoom]");
  if (zoom && stage && stage._zoom) {
    stage._zoom(zoom.dataset.zoom);
    return;
  }
  if (event.target.closest("[data-map-reset]") && stage && stage._reset) stage._reset();
}

const SECTION_CAVEATS = {
  bloodborne: {
    crafting: {
      summary: "This is gems, runes, fortification, and chalice rituals, not a cooking list. A blank quantity varies, and an optional rite offering is only for that rite.",
      points: [
        "Bloodborne has no recipe crafting. The list is Blood Gems and the Workshop, Caryll Runes and the Memory Altar, weapon fortification with blood stones, Arcane Haze extraction, and Chalice Rituals.",
        "A material quantity left empty means the amount varies. Fortify steps list Blood Echoes that way because the echo cost depends on the weapon.",
        "Offerings tagged optional are only needed for that Fetid, Rotted, Cursed, or Sinister Bell rite.",
        "Shared chalice glyphs come from community pages and may depend on the NG cycle.",
        "Blood gem effect text is a condensed effect-family list. Exact values vary from gem to gem."
      ]
    },
    equipment: {
      summary: "Some weapons have no +10 stats. Firearm damage is listed under the wiki's blood column. Attire has no weight.",
      points: [
        "Firearm base damage is kept in baseAttack.blood, the column Fextralife's Firearms table uses. In-game that number is the gun's physical bullet damage, and it scales with Bloodtinge.",
        "Eleven weapons have +0 values and no parseable +10 row, so attackAt+10 is omitted: Beasthunter Saif, Bloodletter, Boom Hammer, Hunter Axe, Kos Parasite, Saw Spear, Hunter Pistol, Hunter's Torch, Piercing Rifle, Repeating Pistol, and Torch. Their scaling letters are the +0 letters only.",
        "Attire has no weight stat, so weight is empty. Defense totals are in the notes.",
        "Chikage's rapid poison of 30 is kept as Fextralife lists it.",
        "A hunter tool's requirement is the single Arcane number from Fextralife's Hunter Tools table.",
        "The build list says Blades of Mercy. This file uses the wiki's Blade of Mercy. Those sheets still link to the builds that name the weapon."
      ]
    }
  },
  "demons-souls": {
    crafting: {
      summary: "Demon's Souls has no item-combination crafting. This list is upgrade paths, soul trades, Sparkly trades, and farming. General-path recipes give stone ranges, not one exact quantity.",
      points: [
        "There is no recipe menu. The list covers blacksmith upgrade paths, Demon Soul and Colorless Demon Soul conversions, spell and miracle trades, Sparkly the Crow trades, and farming spots.",
        "General-path recipes leave the quantity blank and put the min–max stone range in the note, because the total differs per weapon. Exact totals are on each weapon and on the build-variant recipes.",
        "Some wiki pages disagree. The Large Sword of Searching base weapon is recorded from every source that names one. Silver and Wooden Catalyst item pages say MAG A; the Catalysts table says MAG C, and the table was used. Values shown as a dash, a question mark, or malformed text were left out.",
        "The PS5 remake is the primary source. Some Sparkly trades and sets are remake-only. PS3 Darkmoonstone is Moonshadestone, Pulpstone is Marrowstone, and Rage of God is God's Wrath. The Wikidot farming routes are from the PS3 era and still apply in the remake."
      ]
    },
    equipment: {
      summary: "Some wiki values conflict, and remake-only gear is called out in the research note. Four build names have no matching entry: Yellow Monk's Collar, Friend's Ring, Blessed Broadsword, and a crushing path for Bramd.",
      points: [
        "Stats are the wiki's base values. A dash, a question mark, or a malformed number was left out rather than guessed.",
        "Catalyst and talisman requirements use the list tables. Those tables say MAG C for the Silver and Wooden Catalysts where the item pages say MAG A.",
        "Remake versus PS3: Barbarian, Blue-Eye Knight, Boletarian Royalty, Burrower's, Imperial Spy, Official's, Penetrator, and Red-Eye Knight are remake-only sets. Ring of Longevity, Providential Ring, and Ring of Uneven Scales come from remake-only Sparkly trades. PS3 Darkmoonstone, Pulpstone, and Rage of God are now Moonshadestone, Marrowstone, and God's Wrath.",
        "Build names with no equipment entry: Yellow Monk's Collar is not on the wiki. Friend's Ring is not on the Rings page, and Ally's Ring was not assumed to be the same. Blessed Broadsword has no Blessed path on the Broad Sword page. Bramd (Crushing path) is not a crushing weapon: Bramd is Colorless Demon Soul only, so the Bramd sheet still links and there is no crushing recipe.",
        "Monk's Head Wrappings is the wiki name. Builds that say Monk's Head Collar still link to that piece."
      ]
    }
  },
  "elden-ring": {
    crafting: {
      summary: "The categories are this list's own grouping, not a wiki label. A few recipes were completed from Eldenpedia where the wiki page was incomplete.",
      points: [
        "Item categories and material types are groupings for this list. The wiki labels items as consumables, pots, greases, and so on.",
        "Fingerprint Nostrum and Charming Branch recipes come from Eldenpedia. Fire Pot, Roped Fire Pot, Bone Dart, Rowa Raisin, Rainbow Stone, and Furlcalling Finger Remedy come with the Crafting Kit and have no cookbook.",
        "Upgrade materials list notable locations, bell bearings, and drops, not every spot. Golden Seed, Sacred Tear, Scadutree Fragment, and Revered Spirit Ash are summaries.",
        "Some scraped lines are missing a space where a wiki link ran into the next word."
      ]
    },
    equipment: {
      summary: "Weapon stats are the wiki's base +0 values, and patches can change them. Some fields are blank where the wiki had nothing to record. Millicent's Set is unobtainable.",
      points: [
        "Attack, scaling, and requirements are the +0 infobox values. Attack at a given upgrade level is not included.",
        "Meteorite Staff has no upgrade path because its page does not state one.",
        "Malenia's Set and Night's Cavalry Set have no description. Raging Wolf, Carian Knight, Crucible Axe, Crucible Tree, Snow Witch, and Leyndell Knight have no full-set weight.",
        "Millicent's Set is listed because the page exists, and the note says it is currently unobtainable.",
        "The helm is named Jar. Builds that say Jar helm still link to it. White Mask links the builds that name it."
      ]
    }
  }
};

function aboutNote(section) {
  const pack = caveatsFor(section);
  if (!pack) return null;
  return el("div", { class: "about-note" }, [
    el("p", {}, [el("strong", { text: "About this list. " }), pack.summary]),
    el("button", { type: "button", class: "text-btn", "data-section-about": section, text: "Caveats" })
  ]);
}

function caveatsFor(section) {
  const gameId = state.game && state.game.id;
  const pack = gameId && SECTION_CAVEATS[gameId] && SECTION_CAVEATS[gameId][section];
  return pack || null;
}

function sectionAboutSheet(data, section) {
  const pack = caveatsFor(section);
  if (!pack) return null;
  const title = section === "equipment" ? "Equipment caveats" : "Crafting caveats";
  return el("article", {}, [
    el("p", { class: "sheet-kicker", text: state.game.name }),
    el("h2", { id: "sheet-title", text: title }),
    el("p", { text: pack.summary }),
    el("ul", { class: "clean" }, pack.points.map((point) => el("li", { text: point }))),
    data && data.meta && data.meta.notes
      ? el("section", { class: "block" }, [el("h3", { text: "Research note" }), el("p", { text: data.meta.notes })])
      : null
  ]);
}

function fill(parent, ...children) {
  parent.replaceChildren(...children.filter((child) => child != null && child !== false));
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
      const sourceName = guideSourceName(guide.source);
      link.append(
        sourceName ? el("span", { class: "site-name", text: sourceName }) : null,
        el("span", { class: "guide-title", text: guide.title || guide.url || "Guide" })
      );
      return link;
    }))
  ]);
}

function guideSourceName(source) {
  if (!source) return "";
  if (typeof source === "string") return source;
  if (typeof source === "object") return source.label || source.url || "";
  return String(source);
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

const PAGE_SIZE = 24;
let pendingPage = "";

function bumpPage(key) {
  const prefs = ui();
  prefs[key] = Math.max(PAGE_SIZE, Number(prefs[key]) || PAGE_SIZE) + PAGE_SIZE;
  pendingPage = key;
}

function pageOf(list, key) {
  const limit = Math.max(PAGE_SIZE, Number(ui()[key]) || PAGE_SIZE);
  return { rows: list.slice(0, limit), limit, total: list.length };
}

function moreButton(key, limit, total) {
  if (limit >= total) return null;
  return el("p", { class: "more-row" }, [
    el("button", { type: "button", class: "text-btn", "data-more": key, text: `Show more (${total - limit} left)` })
  ]);
}

function settlePage(panel, listId) {
  if (!pendingPage) return;
  const list = listId ? panel.querySelector(listId) : null;
  const last = list && list.lastElementChild;
  pendingPage = "";
  if (last) last.scrollIntoView({ block: "nearest" });
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
  const matShown = materials.filter((mat) => {
    if (!q) return true;
    const hay = [mat.name, mat.type, mat.description, mat.whereToFind, mat.usedFor].filter(Boolean).join("\n").toLowerCase();
    return hay.includes(q);
  });
  const recipePage = pageOf(shown, "craftLimit");
  const matPage = pageOf(matShown, "matLimit");
  const chips = el("div", { class: "chip-row", id: "craft-cats" }, [
    chip("data-craft-cat", "", "All", !cat),
    ...categories.filter((c) => c && c.id).map((c) => chip("data-craft-cat", c.id, c.name || c.id, cat === c.id))
  ]);
  fill(panel, 
    sampleBanner(data.meta),
    aboutNote("crafting") || noteBlock(data.meta),
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
    el("div", { class: "record-list", id: "craft-recipes" }, recipePage.rows.length ? recipePage.rows.map(recipeCard) : [el("p", { class: "empty", text: "No recipes match." })]),
    moreButton("craftLimit", recipePage.limit, recipePage.total),
    el("h2", { class: "section-title", text: "Materials" }),
    el("p", { class: "section-count", text: `${matShown.length} ${matShown.length === 1 ? "material" : "materials"}` }),
    el("div", { class: "record-list", id: "craft-materials" }, matPage.rows.length ? matPage.rows.map(materialCard) : [el("p", { class: "empty", text: "No materials match." })]),
    moreButton("matLimit", matPage.limit, matPage.total),
    guideList(data.guides)
  );
  settlePage(panel, pendingPage === "matLimit" ? "#craft-materials" : "#craft-recipes");
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
  if (!armorTab && type) rows = rows.filter((row) => sameWeaponType(row.type, type, types));
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
  const equipPage = pageOf(rows, armorTab ? "armorLimit" : "weaponLimit");
  const chips = armorTab ? null : el("div", { class: "chip-row" }, [
    chip("data-equip-type", "", "All", !type),
    ...types.filter((t) => t && t.id).map((t) => chip("data-equip-type", t.id, t.name || t.id, type === t.id))
  ]);
  fill(panel, 
    sampleBanner(data.meta),
    aboutNote("equipment") || noteBlock(data.meta),
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
    el("div", { class: "record-list", id: "equip-records" }, equipPage.rows.length ? equipPage.rows.map((row) => armorTab ? armorCard(row) : weaponCard(row, types)) : [el("p", { class: "empty", text: "Nothing matches." })]),
    moreButton(armorTab ? "armorLimit" : "weaponLimit", equipPage.limit, equipPage.total),
    guideList(data.guides)
  );
  settlePage(panel, "#equip-records");
}

function weaponCard(weapon, types) {
  const type = typeEntry(types, weapon.type);
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
  const type = typeEntry(data.weaponTypes, weapon.type);
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

function typeEntry(types, value) {
  const needle = String(value || "");
  return (types || []).find((entry) => entry && (entry.id === needle || entry.name === needle)) || null;
}

function sameWeaponType(rowType, selected, types) {
  if (!selected) return true;
  if (rowType === selected) return true;
  const entry = typeEntry(types, selected);
  return !!(entry && rowType === entry.name);
}

function labelForKey(key) {
  return String(key).replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function fieldBlock(title, obj) {
  if (!obj || typeof obj !== "object") return null;
  const rows = Object.entries(obj).filter(([, value]) => value != null && value !== "");
  if (!rows.length) return null;
  return el("section", { class: "block" }, [
    el("h3", { text: title }),
    el("dl", { class: "kv" }, rows.map(([key, value]) => {
      const inner = fieldValue(value);
      if (!inner) return null;
      return el("div", {}, [el("dt", { text: labelForKey(key) }), el("dd", {}, [inner])]);
    }))
  ]);
}

function fieldValue(value) {
  if (Array.isArray(value)) {
    const text = value.map((item) => (item && typeof item === "object" ? "" : String(item))).filter(Boolean).join(", ");
    return text ? el("span", { text }) : null;
  }
  if (value && typeof value === "object") {
    const rows = Object.entries(value).filter(([, inner]) => inner != null && inner !== "");
    if (!rows.length) return null;
    return el("dl", { class: "kv nested" }, rows.map(([key, inner]) => {
      const node = fieldValue(inner);
      if (!node) return null;
      return el("div", {}, [el("dt", { text: labelForKey(key) }), el("dd", {}, [node])]);
    }));
  }
  return el("span", { text: String(value) });
}

const NAME_ALIASES = {
  "blade of mercy": ["blades of mercy"],
  "blades of mercy": ["blade of mercy"],
  "monk's head wrappings": ["monk's head collar"],
  "monk's head collar": ["monk's head wrappings"],
  "jar": ["jar helm"]
};

function nameNeedles(name) {
  const needle = String(name || "").trim().toLowerCase();
  const aliases = NAME_ALIASES[needle] || [];
  const needles = [];
  if (needle.length >= 4) needles.push(needle);
  aliases.forEach((alias) => {
    if (alias.length >= 4 && !needles.includes(alias)) needles.push(alias);
  });
  return needles;
}

function relatedBlock(names) {
  const list = String(names || "").split("\n").map((name) => name.trim()).filter((name) => {
    if (name.length >= 4) return true;
    return (NAME_ALIASES[name.toLowerCase()] || []).some((alias) => alias.length >= 4);
  });
  const seen = new Set();
  const builds = [];
  for (const name of list) {
    const needles = nameNeedles(name);
    if (!needles.length) continue;
    for (const build of state.data.builds || []) {
      if (seen.has(build.id)) continue;
      const hay = [build.name, ...(build.weapons || []), build.firearm || "", ...(build.runesGear || [])].join("\n").toLowerCase();
      if (needles.some((needle) => hay.includes(needle))) {
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

function mapMode(data) {
  if (!data) return "images";
  if (data.mode === "embed" || data.mode === "images") return data.mode;
  if (Array.isArray(data.embeds) && data.embeds.length) return "embed";
  return "images";
}

function mapEntries(data) {
  const mode = mapMode(data);
  const list = mode === "embed" ? data.embeds : data.images;
  return (Array.isArray(list) ? list : []).filter((item) => item && (item.id || item.label || item.title || item.embedUrl || item.file));
}

function selectedMapEntry(list, route) {
  const id = route && route.focus && route.focus.kind === "map-view" ? route.focus.id : "";
  return list.find((item) => item.id === id) || list[0] || null;
}

function mapAsset(file) {
  const value = String(file || "").trim();
  if (!value) return "";
  if (/^(https?:|data:)/.test(value)) return value;
  return `./${value.replace(/^\.\//, "")}`;
}

function mapNeedsGate() {
  return window.matchMedia("(pointer: coarse), (max-width: 800px)").matches;
}

function renderMap(panel, ctx) {
  const data = ctx.extra || {};
  const route = ctx.route || (typeof parseHash === "function" ? parseHash() : null);
  if (mapMode(data) === "embed") renderEmbedMap(panel, data, route);
  else renderImageMap(panel, data, route);
}

function renderEmbedMap(panel, data, route) {
  const entries = mapEntries(data);
  const current = selectedMapEntry(entries, route);
  if (!current || !current.embedUrl) {
    fill(panel,
      el("p", { class: "map-placeholder", text: "This game has no embedded map yet." }),
      mapLinkBlock(data.mapLinks)
    );
    return;
  }
  const gated = mapNeedsGate();
  const chips = entries.length > 1
    ? el("div", { class: "chip-row", role: "tablist", "aria-label": "Maps" }, entries.map((item) =>
        chip("data-map-choice", item.id || "", item.label || item.title || item.id || "Map", item === current)
      ))
    : null;
  const open = externalLink(current.url || current.embedUrl, "map-open");
  open.textContent = "Open full map";
  const frame = el("iframe", {
    class: "map-frame",
    title: `${current.label || "Map"} by MapGenie`,
    src: current.embedUrl,
    loading: "eager"
  });
  frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  const wrap = el("div", { class: gated ? "map-frame-wrap is-gated" : "map-frame-wrap" }, [
    frame,
    el("div", { class: "map-activate-layer" }, [
      el("button", { type: "button", class: "text-btn map-activate", "data-map-activate": "1", text: "Tap to use the map" })
    ]),
    el("div", { class: "map-failed" }, [
      el("p", { text: "The map did not load in the page." }),
      (() => {
        const link = externalLink(current.url || current.embedUrl);
        link.textContent = "Open full map";
        return link;
      })()
    ])
  ]);
  frame.addEventListener("error", () => wrap.classList.add("is-failed"));
  const release = el("button", { type: "button", class: "text-btn map-release", "data-map-release": "1", text: "Done" });
  fill(panel,
    el("div", { class: "map-shell" }, [
      el("div", { class: "map-bar" }, [
        chips,
        el("p", { class: "map-credit", text: current.credit || "Map by MapGenie" }),
        open,
        release
      ]),
      el("p", { class: "map-hint", text: "If the map stays blank, use Open full map." }),
      wrap
    ]),
    mapLinkBlock(data.mapLinks)
  );
}

function renderImageMap(panel, data, route) {
  const images = mapEntries(data);
  if (!images.length) {
    fill(panel,
      el("div", { class: "map-shell" }, [
        el("p", { class: "map-placeholder", text: "Map pictures for this game are not in this build yet." })
      ]),
      mapLinkBlock(data.mapLinks)
    );
    return;
  }
  const current = selectedMapEntry(images, route);
  const chips = el("div", { class: "chip-row", role: "tablist", "aria-label": "Map pictures" }, images.map((item) =>
    chip("data-map-choice", item.id || "", item.title || item.label || item.id || "Map", item === current)
  ));
  const src = mapAsset(current && current.file);
  const viewer = el("div", {
    class: "map-viewer",
    id: "map-viewer",
    tabindex: "0",
    role: "application",
    "aria-label": current && current.title ? `${current.title}. Drag to pan, scroll or pinch to zoom.` : "Map picture. Drag to pan, scroll or pinch to zoom."
  });
  const tools = el("div", { class: "map-viewer-tools" }, [
    el("button", { type: "button", class: "density", "data-zoom": "in", text: "Zoom in" }),
    el("button", { type: "button", class: "density", "data-zoom": "out", text: "Zoom out" }),
    el("button", { type: "button", class: "density", "data-map-reset": "1", text: "Reset" })
  ]);
  if (!src) {
    viewer.append(el("p", { class: "map-placeholder", text: "This map has no image file yet." }));
  } else {
    const img = el("img", { alt: (current && (current.title || current.description)) || "Map", draggable: "false" });
    img.src = src;
    viewer.append(img, tools);
    img.addEventListener("error", () => {
      img.remove();
      tools.remove();
      viewer.classList.add("is-broken");
      viewer.append(el("p", { class: "map-placeholder", text: "This map image could not be loaded." }));
    });
    attachImageViewer(viewer, img);
  }
  fill(panel,
    el("div", { class: "map-shell" }, [
      chips,
      viewer,
      imageMeta(current)
    ]),
    mapLinkBlock(data.mapLinks)
  );
  requestAnimationFrame(() => {
    if (viewer._reset) viewer._reset();
  });
}

function imageMeta(item) {
  if (!item) return null;
  const credit = [];
  if (item.credit) credit.push(document.createTextNode(item.credit));
  if (item.sourceUrl) {
    if (credit.length) credit.push(document.createTextNode(" · "));
    const link = externalLink(item.sourceUrl);
    link.textContent = "Source";
    credit.push(link);
  }
  const parts = [];
  if (credit.length) parts.push(el("p", { class: "map-credit" }, credit));
  if (item.license) parts.push(el("p", { class: "map-license", text: item.license }));
  if (item.description) parts.push(el("p", { class: "map-desc", text: item.description }));
  return parts.length ? el("div", { class: "map-meta" }, parts) : null;
}

function mapLinkBlock(links) {
  const list = Array.isArray(links) ? links.filter((link) => link && link.url) : [];
  if (!list.length) return null;
  return el("section", { class: "block map-links" }, [
    el("h2", { class: "section-title", text: "Other maps" }),
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

function attachImageViewer(stage, img) {
  const view = { x: 0, y: 0, s: 1, natW: 0, natH: 0, fit: 1 };
  const pointers = new Map();
  let pinch = null;
  let moved = false;
  let lastTap = 0;
  let ignoreDblClick = 0;

  function ready() {
    return view.natW > 0 && stage.clientWidth > 0;
  }
  function apply() {
    img.style.width = `${view.natW * view.s}px`;
    img.style.height = `${view.natH * view.s}px`;
    img.style.transform = `translate(${view.x}px, ${view.y}px)`;
  }
  function fit() {
    if (!ready()) return;
    const pad = 16;
    view.fit = Math.min((stage.clientWidth - pad) / view.natW, (stage.clientHeight - pad) / view.natH) || 1;
    view.s = view.fit;
    view.x = (stage.clientWidth - view.natW * view.s) / 2;
    view.y = (stage.clientHeight - view.natH * view.s) / 2;
    apply();
  }
  function zoomAt(px, py, next) {
    if (!ready()) return;
    const clamped = Math.min(view.fit * 8, Math.max(view.fit * 0.6, next));
    const wx = (px - view.x) / view.s;
    const wy = (py - view.y) / view.s;
    view.s = clamped;
    view.x = px - wx * view.s;
    view.y = py - wy * view.s;
    apply();
  }
  function localPoint(event) {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  stage._reset = fit;
  stage._zoom = (dir) => zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, view.s * (dir === "in" ? 1.25 : 0.8));

  function onLoad() {
    view.natW = img.naturalWidth;
    view.natH = img.naturalHeight;
    fit();
  }
  img.addEventListener("load", onLoad);
  if (img.complete && img.naturalWidth) onLoad();
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => {
      if (!stage.isConnected) {
        observer.disconnect();
        return;
      }
      fit();
    });
    observer.observe(stage);
  }

  stage.addEventListener("wheel", (event) => {
    if (!ready()) return;
    event.preventDefault();
    const point = localPoint(event);
    zoomAt(point.x, point.y, view.s * (event.deltaY < 0 ? 1.12 : 1 / 1.12));
  }, { passive: false });

  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest("[data-zoom], [data-map-reset]")) return;
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved = false;
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      pinch = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, s: view.s };
    }
  });
  stage.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    const prev = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2 && pinch) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const rect = stage.getBoundingClientRect();
      const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
      const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
      zoomAt(midX, midY, pinch.s * (dist / pinch.dist));
      moved = true;
      return;
    }
    const dx = event.clientX - prev.x;
    const dy = event.clientY - prev.y;
    if (Math.hypot(dx, dy) > 6) moved = true;
    view.x += dx;
    view.y += dy;
    apply();
  });
  function endPointer(event) {
    const wasTouch = event.pointerType === "touch" || event.pointerType === "pen";
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size) return;
    if (wasTouch && !moved && ready()) {
      const now = Date.now();
      if (now - lastTap < 320) {
        const point = localPoint(event);
        if (view.s > view.fit * 1.2) fit();
        else zoomAt(point.x, point.y, view.fit * 2.5);
        lastTap = 0;
        ignoreDblClick = now + 500;
      } else lastTap = now;
    }
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
  stage.addEventListener("dblclick", (event) => {
    if (!ready() || Date.now() < ignoreDblClick) return;
    if (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) return;
    event.preventDefault();
    const point = localPoint(event);
    if (view.s > view.fit * 1.2) fit();
    else zoomAt(point.x, point.y, view.fit * 2.5);
  });
  stage.addEventListener("keydown", (event) => {
    if (event.key === "+" || event.key === "=") stage._zoom("in");
    else if (event.key === "-" || event.key === "_") stage._zoom("out");
    else if (event.key === "0") fit();
    else return;
    event.preventDefault();
  });
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

function closeEmbed() {
  document.querySelectorAll("#panel-map iframe").forEach((frame) => {
    frame.src = "about:blank";
  });
}
