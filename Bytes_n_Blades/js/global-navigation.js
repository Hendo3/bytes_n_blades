/**
 * BYTE & BLADES - GLOBAL DATATERM NAVIGATION
 * One navigation architecture for every authenticated route.
 */
(function (root) {
  const documentNode = root.document;
  const scriptSource = documentNode?.currentScript?.src || "https://bytes.invalid/js/global-navigation.js";
  const CART_KEY = "cyber_cart";

  function t(key, fallback, params = {}) {
    return root.I18n ? root.I18n.t(key, params, fallback) : fallback;
  }

  function route(file) {
    return new URL(file === "index.html" ? "../index.html" : `../html/${file}`, scriptSource).href;
  }

  const groups = [
    {
      id: "markets",
      label: () => t("nav.markets", "Markets"),
      sections: [
        {
          label: () => t("nav.body_gear", "Body & Gear"),
          links: [
            ["cyberwares.html", "nav.cyberware", "Cyberware"],
            ["accessories.html", "nav.equipment", "Equipment"],
            ["drugs.html", "nav.drugs", "Drugs"],
          ],
        },
        {
          label: () => t("nav.armory", "Armory"),
          links: [
            ["weapons.html", "nav.weapons", "Weapons"],
            ["ammo.html", "nav.ammo", "Ammo & Add-ons"],
          ],
        },
        {
          label: () => t("nav.skill_chips", "Skill Chips"),
          links: [
            ["aptr-chips.html", "nav.aptr", "APTR"],
            ["mram-chips.html", "nav.mram", "MRAM"],
            ["visual-rec-chips.html", "nav.visual_rec", "Visual Recognition"],
          ],
        },
      ],
    },
    {
      id: "netrunning",
      label: () => t("nav.netrunning", "Netrunning"),
      sections: [{
        label: () => t("nav.net_market", "Black ICE Exchange"),
        links: [
          ["programs.html", "nav.programs", "Programs"],
          ["cyberdecks.html", "nav.cyberdecks", "Cyberdecks"],
          ["deck-builder.html", "nav.deck_builder", "Build a Deck"],
        ],
      }],
    },
    {
      id: "tools",
      label: () => t("nav.tools", "Tools"),
      sections: [{
        label: () => t("nav.utilities", "DataTerm Utilities"),
        links: [
          ["drugs-generator.html", "nav.drug_forge", "Drug Forge"],
          ["debug.html", "nav.debug", "Debug Console"],
        ],
      }],
    },
  ];

  function currentFile() {
    const value = String(root.location?.pathname || "").split("/").filter(Boolean).pop();
    return value && value.includes(".") ? value : "index.html";
  }

  function makeLink(file, label, className = "") {
    const link = documentNode.createElement("a");
    link.href = route(file);
    link.textContent = label;
    if (className) link.className = className;
    link.dataset.navRoute = file;
    if (currentFile() === file) {
      link.classList.add("is-current", "nav-highlight");
      link.setAttribute("aria-current", "page");
    }
    return link;
  }

  function makeDirectItem(file, label, className = "") {
    const item = documentNode.createElement("li");
    item.className = className;
    item.appendChild(makeLink(file, label));
    return item;
  }

  function makeGroup(spec) {
    const item = documentNode.createElement("li");
    item.className = `global-nav-cluster global-nav-cluster--${spec.id}`;
    const details = documentNode.createElement("details");
    const summary = documentNode.createElement("summary");
    summary.className = "global-nav-summary";
    summary.textContent = spec.label();
    summary.setAttribute("aria-label", t("nav.open_group", "Open {group}", { group: spec.label() }));

    const menu = documentNode.createElement("div");
    menu.className = `global-nav-menu global-nav-menu--${spec.id}`;
    for (const sectionSpec of spec.sections) {
      const section = documentNode.createElement("section");
      const heading = documentNode.createElement("h2");
      heading.textContent = sectionSpec.label();
      const list = documentNode.createElement("ul");
      for (const [file, key, fallback] of sectionSpec.links) {
        const listItem = documentNode.createElement("li");
        listItem.appendChild(makeLink(file, t(key, fallback)));
        list.appendChild(listItem);
      }
      section.append(heading, list);
      menu.appendChild(section);
    }

    const active = menu.querySelector('[aria-current="page"]');
    if (active) {
      item.classList.add("is-current");
      summary.dataset.currentRoute = active.dataset.navRoute;
    }
    details.append(summary, menu);
    item.appendChild(details);
    return item;
  }

  function cartCount(storage = root.localStorage) {
    try {
      const cart = JSON.parse(storage?.getItem(CART_KEY) || "[]");
      if (!Array.isArray(cart)) return 0;
      return cart.reduce((total, item) => total + Math.max(1, Number.parseInt(item?.cartCount, 10) || 1), 0);
    } catch {
      return 0;
    }
  }

  function updateCartCount(storage = root.localStorage) {
    const badge = documentNode?.querySelector(".global-nav-cart-count");
    const link = documentNode?.querySelector(".global-nav-cart-link");
    if (!badge || !link) return 0;
    const count = cartCount(storage);
    badge.textContent = String(count);
    link.setAttribute("aria-label", t("nav.cart_count", "Cart, {count} items", { count }));
    return count;
  }

  function closeMenus(except = null) {
    documentNode?.querySelectorAll(".global-nav-cluster details[open]").forEach((details) => {
      if (details !== except) details.open = false;
    });
  }

  function bindMenuBehavior(nav) {
    nav.querySelectorAll(".global-nav-cluster details").forEach((details) => {
      details.addEventListener("toggle", () => {
        if (details.open) closeMenus(details);
      });
    });
    documentNode.addEventListener("click", (event) => {
      if (!event.target.closest?.(".global-nav-cluster")) closeMenus();
    });
    documentNode.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const active = nav.querySelector(".global-nav-cluster details[open]");
      if (!active) return;
      active.open = false;
      active.querySelector("summary")?.focus();
    });
  }

  function boot() {
    if (!documentNode || currentFile() === "login.html") return null;
    const nav = documentNode.querySelector(".navbar nav");
    if (!nav) return null;
    if (nav.dataset.unifiedNavigation === "true") {
      updateCartCount();
      return nav;
    }

    const selector = nav.querySelector(".language-selector") || documentNode.querySelector(".language-selector");
    const shell = documentNode.createElement("div");
    shell.className = "global-nav-shell";

    const main = documentNode.createElement("ul");
    main.className = "nav-links global-nav-groups";
    main.appendChild(makeDirectItem("index.html", t("nav.home", "Home"), "global-nav-home"));
    groups.forEach((group) => main.appendChild(makeGroup(group)));
    main.appendChild(makeDirectItem("bundles.html", t("nav.bundles", "Bundles"), "global-nav-bundles"));

    const controls = documentNode.createElement("div");
    controls.className = "global-nav-controls";
    const session = documentNode.createElement("ul");
    session.className = "nav-links nav-session-links";
    const cartItem = makeDirectItem("cart.html", t("nav.cart", "Cart"), "global-nav-cart");
    const cartLink = cartItem.querySelector("a");
    cartLink.classList.add("global-nav-cart-link");
    const badge = documentNode.createElement("span");
    badge.className = "global-nav-cart-count";
    badge.setAttribute("aria-hidden", "true");
    cartLink.appendChild(badge);
    session.appendChild(cartItem);
    controls.appendChild(session);
    if (selector) controls.appendChild(selector);

    shell.append(main, controls);
    nav.replaceChildren(shell);
    nav.classList.add("global-navigation");
    nav.dataset.unifiedNavigation = "true";
    nav.setAttribute("aria-label", t("nav.main", "Main Navigation"));
    bindMenuBehavior(nav);
    updateCartCount();
    root.addEventListener?.("stash-updated", () => updateCartCount());
    root.addEventListener?.("storage", (event) => {
      if (!event.key || event.key === CART_KEY) updateCartCount();
    });
    root.dispatchEvent?.(new root.CustomEvent("global-navigation-ready"));
    return nav;
  }

  const api = { groups, route, currentFile, cartCount, updateCartCount, closeMenus, boot };
  root.CyberNavigation = api;
  if (documentNode) documentNode.addEventListener("DOMContentLoaded", boot);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
