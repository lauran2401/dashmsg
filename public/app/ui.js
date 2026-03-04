/**
 * DashMsg UI Rendering System (NO inline onclick)
 *
 * Fixes:
 * - “Unexpected end of script” from broken onclick attributes
 * - Safe passing of extras/store names containing quotes/apostrophes
 */

const DashMsgUI = (() => {
  const app = document.getElementById("app");

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
  }

  function b64EncodeUnicode(obj) {
    const json = JSON.stringify(obj ?? {});
    return btoa(unescape(encodeURIComponent(json)));
  }

  function b64DecodeUnicode(b64) {
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  }

  function renderScreen(title, sections) {
    if (!app) return;

    let html = `<h1>${escapeHtml(title)}</h1>`;

    (sections || []).forEach((section) => {
      if (section.header) {
        html += `<div class="menu-title">${escapeHtml(section.header)}</div>`;
      }

      const items = section.items || [];
      if (!items.length) return;

      html += `<div class="list">`;

      items.forEach((item, index) => {
        const itemClass = item.class ? ` ${item.class}` : "";
        const more = item.more ? "<span>›</span>" : "<span></span>";

        // Store ONLY the action/click payload; never inline JS.
        const payload = {
          action: item.action || null,
          click: item.click || null, // legacy support
        };

        html +=
          `<button class="row${itemClass}" ` +
          `data-dashmsg-action="${b64EncodeUnicode(payload)}">` +
          `${escapeHtml(item.label)} ${more}</button>`;
      });

      html += `</div>`;
    });

    app.innerHTML = html;

    // Attach listeners AFTER render
    app.querySelectorAll("button[data-dashmsg-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const raw = btn.getAttribute("data-dashmsg-action");
        if (!raw) return;
        try {
          const payload = b64DecodeUnicode(raw);
          dispatch(payload);
        } catch (e) {
          console.error("Bad action payload", e);
          alert("DashMsg UI error: bad action payload");
        }
      });
    });
  }

  function dispatch(payload) {
    // Legacy string click like "DashMsgUI.setETA()"
    if (payload?.click) {
      try {
        new Function(String(payload.click))();
      } catch (e) {
        console.error(e);
        alert(String(e?.message || e));
      }
      return;
    }

    const a = payload?.action;
    if (!a || !a.type) return;

    switch (a.type) {
      case "template":
        useTemplate(a.key, a.category || "Message", a.extras || {});
        return;

      case "nav":
        navigateTo(a.screen);
        return;

      case "navBack":
        navBack();
        return;

      case "function":
        // handler is a string like "DashMsgUI.setETA()" or "DashMsgEditors.showTemplateEditor()"
        try {
          new Function(String(a.handler || ""))();
        } catch (e) {
          console.error(e);
          alert(String(e?.message || e));
        }
        return;

      default:
        console.warn("Unknown action type:", a.type);
        return;
    }
  }

  function useTemplate(key, category = "Message", extras = {}) {
    const template = window.DashMsg?.getTemplate?.(key);
    if (template == null) {
      console.error(`Template ${key} not found`);
      alert(`Missing template: ${key}`);
      return;
    }
    window.DashMsg.finishMessage(template, key, category, extras);
  }

  function navigateTo(screenName) {
    const menu = window.DashMsgMenus?.[screenName];
    if (!menu) {
      console.error(`Menu screen "${screenName}" not found`);
      alert(`Missing menu: ${screenName}`);
      return;
    }
    window.DashMsg.pushNav(screenName);
    renderScreen(menu.title, menu.sections);
  }

  function navBack() {
    window.DashMsg.popNav();
    const stack = window.DashMsg.navStack();
    const current = stack[stack.length - 1] || "main";
    const menu = window.DashMsgMenus?.[current];
    if (!menu) return;
    renderScreen(menu.title, menu.sections);
  }

  function setETA() {
    const eta = prompt("ETA? (e.g. 5 mins)");
    if (!eta) return;
    const tpl = window.DashMsg.getTemplate("HEADING_WITH_ETA");
    const msg = window.DashMsg.renderTemplate(tpl, { ETA: eta });
    window.DashMsg.finishMessage(msg, "HEADING_WITH_ETA", "Delivery", { used_eta: 1 });
  }

  function populateShoppingMenu() {
    const stores = window.DashMsg.getStores();
    const shoppingMenu = window.DashMsgMenus.shopping;

    shoppingMenu.sections[0].items = [];

    stores.forEach((store) => {
      shoppingMenu.sections[0].items.push({
        label: store,
        action: {
          type: "template",
          key: "SHOP_SINGLE",
          category: "Shopping",
          extras: { store }, // safe now
        },
      });
    });
  }

  return {
    renderScreen,
    navigateTo,
    navBack,
    useTemplate,
    setETA,
    populateShoppingMenu,
  };
})();

window.DashMsgUI = DashMsgUI;