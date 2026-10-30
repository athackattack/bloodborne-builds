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

const state = {
  data: null,
  arch: "",
  best: "",
  query: "",
  sort: "listed",
  guideType: ""
};

const sheet = document.getElementById("sheet");
const sheetBody = document.getElementById("sheet-body");

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

function archetypeMatch(build, filter) {
  if (!filter) return true;
  const a = build.archetype.toLowerCase();
  const name = build.name.toLowerCase();
  const has = (word) => a.includes(word);
  switch (filter) {
    case "Strength":
      return has("strength");
    case "Skill":
      return has("skill");
    case "Bloodtinge":
      return has("bloodtinge");
    case "Arcane":
      return has("arcane");
    case "Quality":
      return has("quality") || (has("strength") && has("skill") && !has("bloodtinge") && !has("arcane"));
    case "Hybrid": {
      if (name.includes("hybrid")) return true;
      const families = ["strength", "skill", "bloodtinge", "arcane", "quality"].filter(has);
      if (families.length < 2) return false;
      if (families.includes("quality") && families.every((family) => ["quality", "strength", "skill"].includes(family))) {
        return false;
      }
      return true;
    }
    default:
      return true;
  }
}

function bestForMatch(build, filter) {
  if (!filter) return true;
  const tags = build.bestFor.join(" ").toLowerCase();
  const archetype = build.archetype.toLowerCase();
  const name = build.name.toLowerCase();
  const ng = build.ngNotes.toLowerCase();
  const blob = [
    build.name,
    build.archetype,
    build.playstyle,
    build.ngNotes,
    build.tierReason,
    ...build.bestFor,
    ...build.pros,
    ...build.cons
  ].join(" ").toLowerCase();
  switch (filter) {
    case "PvP":
      return /\bpvp\b/.test(tags) || /\bpvp\b/.test(archetype) || /\bpvp\b/.test(name);
    case "beginner":
      return /beginner|first playthrough|brand-new|starter|first run/.test(`${tags} ${archetype} ${name}`);
    case "chalice":
      return blob.includes("chalice");
    case "NG+": {
      const text = `${tags}\n${ng}`;
      return text.includes("ng+") && !text.includes("poor on ng+");
    }
    case "PvE": {
      if (blob.includes("not a general pve")) return false;
      const onlyPvpOrMeme = build.bestFor.length > 0 && build.bestFor.every((tag) => /\bpvp\b|meme/i.test(tag));
      if (onlyPvpOrMeme && !/\bpve\b/.test(tags)) return false;
      return true;
    }
    default:
      return true;
  }
}

function queryMatch(build, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [build.name, build.archetype, build.playstyle, build.firearm, ...build.weapons, ...build.bestFor]
    .join("\n")
    .toLowerCase();
  return hay.includes(q);
}

function visibleBuilds() {
  const matched = state.data.builds.filter(
    (build) => archetypeMatch(build, state.arch) && bestForMatch(build, state.best) && queryMatch(build, state.query)
  );
  if (state.sort === "name") {
    matched.sort((a, b) => a.name.localeCompare(b.name));
  } else if (state.sort === "weapon") {
    matched.sort((a, b) => (a.weapons[0] || "").localeCompare(b.weapons[0] || "") || a.name.localeCompare(b.name));
  }
  return matched;
}

function syncHeaderHeight() {
  const header = document.querySelector("header");
  if (header) document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
}

function syncChips() {
  document.querySelectorAll("[data-arch]").forEach((button) => {
    button.setAttribute("aria-pressed", (button.dataset.arch || "") === state.arch ? "true" : "false");
  });
  document.querySelectorAll("[data-best]").forEach((button) => {
    button.setAttribute("aria-pressed", (button.dataset.best || "") === state.best ? "true" : "false");
  });
  document.querySelectorAll("[data-guide]").forEach((button) => {
    button.setAttribute("aria-pressed", (button.dataset.guide || "") === state.guideType ? "true" : "false");
  });
}

function renderCard(build) {
  const extra = build.weapons.length > 1 ? build.weapons.length - 1 : 0;
  const weapon = el("span", { class: "card-weapon" }, [
    build.weapons[0] || "",
    extra ? el("em", { text: `+${extra} more` }) : null
  ]);
  return el(
    "button",
    { type: "button", class: "card", "data-tier": build.tier, "data-id": build.id },
    [
      el("span", { class: "card-kicker", text: build.archetype }),
      el("span", { class: "card-name", text: build.name }),
      weapon,
      el("span", { class: "card-play", text: build.playstyle })
    ]
  );
}

function renderList() {
  const host = document.getElementById("tier-list");
  const count = document.getElementById("count");
  if (!state.data) return;
  const builds = visibleBuilds();
  const noun = builds.length === 1 ? "build" : "builds";
  count.textContent = `${builds.length} ${noun}`;
  host.replaceChildren();
  if (!builds.length) {
    host.append(
      el("div", { class: "empty" }, [
        el("p", { text: "No builds match these filters." }),
        el("button", { type: "button", class: "text-btn", id: "clear-filters", text: "Clear filters" })
      ])
    );
    document.getElementById("clear-filters").addEventListener("click", () => {
      state.arch = "";
      state.best = "";
      state.query = "";
      document.getElementById("q").value = "";
      syncChips();
      renderList();
    });
    return;
  }
  for (const tier of TIERS) {
    const items = builds.filter((build) => build.tier === tier);
    if (!items.length) continue;
    const heading = el("h2", { class: "tier-letter" });
    heading.setAttribute("aria-label", `Tier ${tier}, ${items.length} ${items.length === 1 ? "build" : "builds"}`);
    heading.append(el("span", { "aria-hidden": "true", text: tier }), el("small", { "aria-hidden": "true", text: String(items.length) }));
    const cards = el("div", { class: "tier-cards" }, items.map(renderCard));
    cards.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", () => setHash(`build/${card.dataset.id}`));
    });
    host.append(el("section", { class: "tier", "data-tier": tier }, [heading, cards]));
  }
}

function renderGuides() {
  const host = document.getElementById("guide-list");
  const count = document.getElementById("guide-count");
  if (!state.data) return;
  const guides = state.data.guides.filter((guide) => !state.guideType || guide.siteType === state.guideType);
  count.textContent = `${guides.length} ${guides.length === 1 ? "guide" : "guides"}`;
  host.replaceChildren();
  if (!guides.length) {
    host.append(el("p", { class: "empty", text: "No guides in this group." }));
    return;
  }
  for (const guide of guides) {
    const link = externalLink(guide.url, "guide-card");
    const top = el("span", { class: "guide-top" }, [
      el("span", { class: `badge ${guide.siteType}`, text: siteLabel(guide.siteType) }),
      guide.site ? el("span", { class: "site-name", text: guide.site }) : null,
      guide.unverified ? el("span", { class: "flag", text: "Unverified" }) : null
    ]);
    link.append(
      top,
      el("span", { class: "guide-title", text: guide.title }),
      guide.description ? el("span", { class: "guide-desc", text: guide.description }) : null,
      el("span", { class: "visually-hidden", text: " (opens in a new tab)" })
    );
    host.append(link);
  }
}

function statGrid(build) {
  const order = state.data.meta.statOrder || ["VIT", "END", "STR", "SKL", "BLT", "ARC"];
  return el(
    "div",
    { class: "stat-grid" },
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
      const title = el("span", { class: "source-title" }, [
        source.title,
        source.unverified ? el("span", { class: "flag", text: "Unverified" }) : null,
        el("span", { class: "visually-hidden", text: " (opens in a new tab)" })
      ]);
      link.append(el("span", { class: `badge ${key}`, text: siteLabel(key) }), title);
      if (source.note) link.append(el("span", { class: "source-note", text: source.note }));
      group.append(link);
    }
    wrap.append(group);
  }
  return wrap;
}

function renderBuild(build) {
  const alts = build.stats.altSpreads || [];
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
      el("h3", { text: "Weapons" }),
      el("ul", { class: "clean" }, build.weapons.map((weapon) => el("li", { text: weapon }))),
      el("h3", { text: "Firearm" }),
      el("p", { text: build.firearm })
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: "Stat spread" }),
      el("p", { class: "stat-label" }, [
        el("strong", { text: `BL ${build.stats.level}` }),
        build.stats.label
      ]),
      statGrid(build),
      alts.length
        ? el("div", { class: "block" }, [
            el("h3", { text: "Alternatives" }),
            el("ul", { class: "clean" }, alts.map((alt) => el("li", { text: alt })))
          ])
        : null
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: "Runes and gear" }),
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
  const pill = root.querySelector(".tier-pill");
  pill.style.setProperty("--tier", `var(--${build.tier.toLowerCase()})`);
  return root;
}

function renderAbout() {
  const meta = state.data.meta;
  const defs = el("dl", { class: "defs" });
  for (const tier of TIERS) {
    if (!meta.tierScale || !meta.tierScale[tier]) continue;
    defs.append(el("div", {}, [el("dt", { class: tier, text: tier }), el("dd", { text: meta.tierScale[tier] })]));
  }
  return el("article", {}, [
    el("p", { class: "sheet-kicker", text: "About" }),
    el("h2", { id: "sheet-title", text: meta.title || "Bloodborne Builds" }),
    el("section", { class: "block" }, [el("h3", { text: "Tier definitions" }), defs]),
    el("section", { class: "block" }, [
      el("h3", { text: "Caveats" }),
      el("p", { text: meta.notes })
    ]),
    el("section", { class: "block" }, [
      el("h3", { text: "Stat spreads" }),
      el("p", { text: meta.levelConventions })
    ]),
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

function parseHash() {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (hash === "guides") return { tab: "guides" };
  if (hash === "about") return { tab: currentTab(), about: true };
  if (hash.startsWith("build/")) return { tab: "tiers", build: hash.slice("build/".length) };
  return { tab: "tiers" };
}

function currentTab() {
  return document.getElementById("tab-guides").getAttribute("aria-selected") === "true" ? "guides" : "tiers";
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
  const hash = location.hash;
  const onSheet = hash.startsWith("#build/") || hash === "#about";
  if (!onSheet) {
    if (sheet.open) sheet.close();
    return;
  }
  if (history.state && history.state.bb) {
    history.back();
    return;
  }
  history.replaceState({ bb: true }, "", `${location.pathname}${location.search}`);
  render();
}

function render() {
  if (!state.data) return;
  const route = parseHash();
  const onGuides = route.tab === "guides";
  document.getElementById("panel-tiers").hidden = onGuides;
  document.getElementById("panel-guides").hidden = !onGuides;
  document.getElementById("tab-tiers").setAttribute("aria-selected", onGuides ? "false" : "true");
  document.getElementById("tab-guides").setAttribute("aria-selected", onGuides ? "true" : "false");
  renderList();
  renderGuides();
  if (route.about) {
    showSheet(renderAbout());
  } else if (route.build) {
    const build = state.data.builds.find((item) => item.id === route.build);
    if (build) showSheet(renderBuild(build));
    else if (sheet.open) sheet.close();
  } else if (sheet.open) {
    sheet.close();
  }
  syncHeaderHeight();
}

function bind() {
  document.getElementById("q").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderList();
  });
  document.getElementById("sort").addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderList();
  });
  document.querySelectorAll("[data-arch]").forEach((button) => {
    button.addEventListener("click", () => {
      state.arch = button.dataset.arch === state.arch ? "" : button.dataset.arch || "";
      if (!button.dataset.arch) state.arch = "";
      syncChips();
      renderList();
    });
  });
  document.querySelectorAll("[data-best]").forEach((button) => {
    button.addEventListener("click", () => {
      state.best = button.dataset.best === state.best ? "" : button.dataset.best || "";
      if (!button.dataset.best) state.best = "";
      syncChips();
      renderList();
    });
  });
  document.querySelectorAll("[data-guide]").forEach((button) => {
    button.addEventListener("click", () => {
      state.guideType = button.dataset.guide || "";
      syncChips();
      renderGuides();
    });
  });
  document.getElementById("tab-tiers").addEventListener("click", () => setHash(""));
  document.getElementById("tab-guides").addEventListener("click", () => setHash("guides"));
  document.getElementById("tab-about").addEventListener("click", () => setHash("about"));
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
    const response = await fetch("./data/builds.json");
    if (!response.ok) throw new Error(String(response.status));
    state.data = await response.json();
  } catch (error) {
    list.replaceChildren(el("p", { class: "empty", text: "The build list could not be loaded." }));
    return;
  }
  const meta = state.data.meta;
  document.getElementById("colophon").textContent = meta.generatedDate ? `Research snapshot ${meta.generatedDate}.` : "";
  bind();
  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeaderHeight);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

init();
