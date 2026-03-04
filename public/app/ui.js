/**
 * DashMsg UI Rendering System (SAFE: no inline onclick)
 *
 * - Renders screens from DashMsgMenus
 * - Uses data-action + delegated click handler
 * - Calls DashMsg / DashMsgEditors safely
 */

const DashMsgUI = (() => {
  const app = document.getElementById("app");
  if (!app) console.error("DashMsgUI: #app container missing");

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
  }

  function encodeAction(obj) {
    // Safe for HTML attributes
    return encodeURIComponent(JSON.stringify(obj));
  }

  function decodeAction(str) {
    return JSON.parse(decodeURIComponent(str));
  }

  function showCopied(text) {
    let banner = document.getElementById("copy-preview");
    let txt = document.getElementById("preview-text");

    if (!banner) {
      banner = document.createElement("div");
      banner.id = "copy-preview";
      banner.style.background = "#34c759";
      banner.style.color = "white";
      banner.style.padding = "14px";
      banner.style.borderRadius = "12px";
      banner.style.marginBottom = "16px";
      banner.style.fontSize = "15px";
      banner.innerHTML =
        `<div style="font-size:11px;text-transform:uppercase;margin-bottom:4px;opacity:.85">Copied</div>
         <div id="preview-text"></div>`;
      document.body.prepend(banner);
      txt = document.getElementById("preview-text");
    }

    txt.textContent = String(text ?? "");
    banner.style.display = "block";
    setTimeout(() => (banner.style.display = "none"), 2200);
  }
  
  function renderScreen(title, sections) {
    let html = `
  <div class="topbar">
    <button class="home-btn" onclick="DashMsgUI.goHome()">Home</button>
    <h1>${escapeHtml(title)}</h1>
  </div>
  `;
    sections.forEach((section) => {
      if (section.header) {
        html += `<div class="menu-title">${escapeHtml(section.header)}</div>`;
      }

      html += `<div class="list">`;

      (section.items || []).forEach((item) => {
        const itemClass = item.class ? ` ${item.class}` : "";
        const more = item.more ? `<span>›</span>` : `<span></span>`;

        // Normalize to an action object
        const actionObj = item.action
          ? { kind: "action", action: item.action }
          : item.click
          ? { kind: "expr", expr: item.click }
          : { kind: "noop" };

        html += `
          <button class="row${itemClass}" data-dashmsg-action="${encodeAction(actionObj)}">
            ${escapeHtml(item.label)}
            ${more}
          </button>
        `;
      });

      html += `</div>`;
    });

    app.innerHTML = html;
  }

  // Single delegated handler (no inline JS)
  app.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-dashmsg-action]");
    if (!btn) return;

    let payload;
    try {
      payload = decodeAction(btn.getAttribute("data-dashmsg-action"));
    } catch (e) {
      console.error("Bad action payload", e);
      alert("Action error (bad payload).");
      return;
    }

    try {
      if (payload.kind === "expr") {
        // Last-resort compatibility for old click strings
        (new Function(payload.expr))();
        return;
      }

      if (payload.kind !== "action") return;

      const a = payload.action || {};
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

        case "cancel":
          // Global exit
          DashMsg.exitApp();
          return;

        case "function":
          // Explicit, safe dispatch (no arbitrary eval)
          // Allow:
          // - DashMsgUI.setETA()
          // - DashMsgEditors.showTemplateEditor()
          // - DashMsgEditors.showStoreEditor()
          // - DashMsgEditors.resetAll()
          dispatchFunction(a.handler);
          return;

        default:
          console.warn("Unknown action", a);
          return;
      }
    } catch (e) {
      console.error(e);
      alert(String(e?.message || e));
    }
  });
  function goHome() {

  const main = DashMsgMenus?.main;
  if (!main) return;

  while (DashMsg.getNavDepth() > 0) {
    DashMsg.popNav();
  }

  DashMsg.pushNav("main");

  renderScreen(main.title, main.sections);
}
  function dispatchFunction(handler) {
    const h = String(handler || "").trim();

    if (h === "DashMsgUI.setETA()") return setETA();
    if (h === "DashMsgEditors.showTemplateEditor()") return DashMsgEditors.showTemplateEditor();
    if (h === "DashMsgEditors.showStoreEditor()") return DashMsgEditors.showStoreEditor();
    if (h === "DashMsgEditors.resetAll()") return DashMsgEditors.resetAll();
    if (h.includes("DashMsg.setPref")) return new Function(h)();
    if (h.includes("DashMsgUI.navigateTo")) return new Function(h)();
    throw new Error("Blocked handler: " + h);
  }

  function useTemplate(key, category = "Message", extras = {}) {
    const template = DashMsg.getTemplate(key);
    if (!template) {
      console.error("Template not found:", key);
      return;
    }
    DashMsg.finishMessage(template, key, category, extras);
  }
  function goHome() {

  const main = DashMsgMenus?.main;
  if (!main) return;

  while (DashMsg.getNavDepth() > 0) {
    DashMsg.popNav();
  }

  DashMsg.pushNav("main");

  renderScreen(main.title, main.sections);
}
  function navigateTo(screenName) {
    const menu = window.DashMsgMenus?.[screenName];
    if (!menu) {
      console.error("Menu not found:", screenName);
      return;
    }
    DashMsg.pushNav(screenName);
    renderScreen(menu.title, menu.sections);
  }

  function navBack() {
    DashMsg.popNav();
    const stack = DashMsg.navStack();
    if (!stack.length) return navigateTo("main");

    const screen = stack[stack.length - 1];
    const menu = window.DashMsgMenus?.[screen];
    if (menu) renderScreen(menu.title, menu.sections);
    else navigateTo("main");
  }

  function setETA() {
    const eta = prompt("ETA? (example: 5 min)");
    if (!eta) return;

    const msg = DashMsg.renderTemplate(DashMsg.getTemplate("HEADING_WITH_ETA"), { ETA: eta });
    DashMsg.finishMessage(msg, "HEADING_WITH_ETA", "Delivery", { used_eta: 1 });
  }

  function populateShoppingMenu() {
    const stores = DashMsg.getStores();
    const shoppingMenu = window.DashMsgMenus?.shopping;
    if (!shoppingMenu) return;

    shoppingMenu.sections[0].items = [];
    stores.forEach((store) => {
      shoppingMenu.sections[0].items.push({
        label: store,
        action: {
          type: "template",
          key: "SHOP_SINGLE",
          category: "Shopping",
          extras: { store }
        }
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
    showCopied,
    escapeHtml
  };
})();

window.DashMsgUI = DashMsgUI;