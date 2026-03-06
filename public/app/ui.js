// public/app/ui.js — fixed (Home upper-left, Back only at bottom, no broken braces)

const CUSTOMER_NAME_KEY = "dashmsg_customer_name";

function getCustomerName() {
  return (localStorage.getItem(CUSTOMER_NAME_KEY) || "").trim();
}

function setCustomerName(value) {
  localStorage.setItem(CUSTOMER_NAME_KEY, value || "");
}

function clearCustomerName() {
  localStorage.removeItem(CUSTOMER_NAME_KEY);
  const input = document.getElementById("customerName");
  if (input) input.value = "";
}

import { mountFeedbackWidget } from "./feedback-widget.js";

mountFeedbackWidget({
  onSubmit: async (payload) => {
    await window.DashMsg?.sendFeedback?.(payload);
    return { ok: true };
  }
});







const DashMsgUI = (() => {
  const app = document.getElementById("app");
  let currentScreen = "main";
  let toastTimer = null;

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function safeAction(action) {
    try {
      return JSON.stringify(action || {});
    } catch {
      return "{}";
    }
  }

  /* -----------------------
     TOAST
  ----------------------- */
  function toast(text, ok = true, titleOverride = null) {
    let banner = document.getElementById("dashmsg-toast");

    if (!banner) {
      banner = document.createElement("div");
      banner.id = "dashmsg-toast";
      banner.className = "toast";
      banner.innerHTML = `
        <div class="toast-title"></div>
        <div class="toast-msg"></div>
      `;
      document.body.appendChild(banner);
    }

    const title = titleOverride || (ok ? "✓ Message Copied" : "Error");

    banner.classList.toggle("ok", !!ok);
    banner.classList.toggle("error", !ok);

    banner.querySelector(".toast-title").textContent = title;
    banner.querySelector(".toast-msg").textContent = String(text ?? "");

    banner.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => banner.classList.remove("show"), 2600);

    try {
      if (navigator.vibrate) navigator.vibrate(40);
    } catch {}
  }

  /* -----------------------
     HEADER (Home upper-left)
  ----------------------- */
  function headerHtml(title) {
    return `
      <div class="nav-bar">
        <button class="nav-btn home" data-action='{"type":"home"}'>Home</button>
        <div class="nav-title">${escapeHtml(title || "")}</div>
        <div class="nav-spacer"></div>
      </div>
    `;
  }

  /* -----------------------
     RENDER SCREEN
  ----------------------- */
  function renderScreen(title, sections = []) {
    if (!app) return;

    let html = headerHtml(title);

    if (currentScreen === "main") {
      html += `
        <div class="customer-name-wrap">
          <label for="customerName">Customer name (optional)</label>
          <div class="customer-name-row">
            <input id="customerName" type="text" placeholder="Enter name..." autocomplete="off" />
            <button id="clearCustomerName" type="button">Clear</button>
          </div>
        </div>
      `;
    }

    sections.forEach((section) => {
      if (section.header) {
        html += `<div class="menu-title">${escapeHtml(section.header)}</div>`;
      }

      html += `<div class="list">`;

      (section.items || []).forEach((item) => {
        if (item.static) {
          html += `
            <div class="row static-row">
              <span>${escapeHtml(item.label)}</span>
            </div>
          `;
          return;
        }

        const more = item.more ? `<span class="chev">›</span>` : "";
        const hasInput = !!item.input;
        const cls = `${item.class ? ` ${escapeHtml(item.class)}` : ""}${hasInput ? " has-input" : ""}`;

        if (hasInput) {
          html += `
          <div class="row has-input">
            <button class="row-input-action${item.class ? ` ${escapeHtml(item.class)}` : ""}" data-action='${safeAction(item.action)}'>
              <span>${escapeHtml(item.label)}</span>
            </button>
            <input
              class="row-inline-input"
              id="${escapeHtml(item.input.id)}"
              type="${escapeHtml(item.input.type || "text")}" 
              inputmode="numeric"
              min="${escapeHtml(item.input.min ?? "")}" 
              max="${escapeHtml(item.input.max ?? "")}" 
              placeholder="${escapeHtml(item.input.placeholder || "")}" 
            />
          </div>
        `;
          return;
        }

        html += `
          <button class="row${cls}" data-action='${safeAction(item.action)}'>
            <span>${escapeHtml(item.label)}</span>
            ${more}
          </button>
        `;
      });

      html += `</div>`;
    });

    // Back only at bottom (not in header, not on main)
    if (currentScreen !== "main") {
      html += `
        <div class="list bottom-back">
          <button class="row back" data-action='{"type":"navBack"}'>Back</button>
        </div>
      `;
    }

    app.innerHTML = html;

    const customerNameInput = document.getElementById("customerName");
    const clearCustomerNameBtn = document.getElementById("clearCustomerName");

    if (customerNameInput) {
      customerNameInput.value = localStorage.getItem(CUSTOMER_NAME_KEY) || "";

      customerNameInput.addEventListener("input", () => {
        setCustomerName(customerNameInput.value);
      });
    }

    if (clearCustomerNameBtn) {
      clearCustomerNameBtn.addEventListener("click", () => {
        clearCustomerName();
      });
    }
  }

  /* -----------------------
     ACTION DISPATCH
  ----------------------- */
  function dispatchAction(action) {
    if (!action || typeof action !== "object") return;

    const FN = {
      setETA,

      showTemplateEditor: () => window.DashMsgEditors?.showTemplateEditor(),
      showStoreEditor: () => window.DashMsgEditors?.showStoreEditor(),
      resetAll: () => window.DashMsgEditors?.resetAll(),

      editTemplate: () => window.DashMsgEditors?.editTemplate(action.key),
      saveTemplate: () => window.DashMsgEditors?.saveTemplate(action.key),
      resetTemplate: () => window.DashMsgEditors?.resetTemplate(action.key),

      editStore: () => window.DashMsgEditors?.editStore(action.idx),
      updateStore: () => window.DashMsgEditors?.updateStore(action.idx),
      removeStore: () => window.DashMsgEditors?.removeStore(action.idx),

      addStore: () => window.DashMsgEditors?.addStore(),
      saveNewStore: () => window.DashMsgEditors?.saveNewStore(),

      openBeta,
      exportData,
      importData,

      copyTesterId,

      setEmojiOn: () => setPrefAndRefresh("emoji_on", true),
      setEmojiOff: () => setPrefAndRefresh("emoji_on", false),

    };

    switch (action.type) {
      case "template":
        return useTemplate(action.key, action.category, action.extras);

      case "nav":
        return navigateTo(action.screen);

      case "navBack":
        return navBack();


      case "home":
        return goHome();

      case "function":
        if (FN[action.name]) return FN[action.name]();
        return toast("Action missing", false);

      default:
        return toast("Action missing", false);
    }
  }

  if (app) {
    app.addEventListener("click", (e) => {
      if (e.target.closest(".row-inline-input")) return;

      const btn = e.target.closest("button.row, button.nav-btn, .row-input-action");
      if (!btn) return;

      let action = null;
      try {
        action = JSON.parse(btn.dataset.action || "{}");
      } catch {
        return toast("Action missing", false);
      }

      dispatchAction(action);
    });
  }

  /* -----------------------
     NAVIGATION
  ----------------------- */
  function navigateTo(screen, options = {}) {
    const menu = window.DashMsgMenus?.[screen];
    if (!menu) return;

    const push = options.push !== false;
    if (push) window.DashMsg?.pushNav?.(screen);

    currentScreen = screen;

    if (screen === "shopping") populateShoppingMenu();

    renderScreen(menu.title, menu.sections);
  }

  function navBack() {
    window.DashMsg?.popNav?.();

    const stack = window.DashMsg?.navStack?.() || [];
    const prev = stack[stack.length - 1] || "main";

    navigateTo(prev, { push: false });
  }

  function goHome() {
    while ((window.DashMsg?.getNavDepth?.() || 0) > 0) {
      window.DashMsg.popNav();
    }
    navigateTo("main", { push: false });
  }

  /* -----------------------
     TEMPLATE ACTION
  ----------------------- */
  async function useTemplate(key, category = "General", extras = {}) {
    const tpl = window.DashMsg?.getTemplate?.(key);
    if (!tpl) return toast("Template missing", false);

    await window.DashMsg?.finishMessage?.(tpl, key, category, extras);
  }

  /* -----------------------
     ETA
  ----------------------- */
  function setETA() {
    const input = document.getElementById("etaMinutes");
    const raw = String(input?.value || "").trim();
    const minutes = Number(raw);

    if (!raw || Number.isNaN(minutes) || minutes < 1 || minutes > 59) {
      toast("Enter 1-59 min", false, "Invalid ETA");
      if (input) input.focus();
      return;
    }

    const eta = `${minutes} min`;
    const tpl = window.DashMsg?.getTemplate?.("HEADING_WITH_ETA") || "";
    const rendered = window.DashMsg?.renderTemplate?.(tpl, { ETA: eta }) || "";

    window.DashMsg?.finishMessage?.(
      rendered,
      "HEADING_WITH_ETA",
      "Delivery",
      { used_eta: 1, eta_minutes: minutes }
    );
  }

  function setPrefAndRefresh(key, value) {
    window.DashMsg?.setPref?.(key, value);
    toast("Saved", true, "Saved");
    navigateTo(currentScreen, { push: false });
  }

  /* -----------------------
     SHOPPING
  ----------------------- */
  function populateShoppingMenu() {
    const menu = window.DashMsgMenus?.shopping;
    if (!menu?.sections?.[0]) return;

    const stores = window.DashMsg?.getStores?.() || [];

    menu.sections[0].items = stores.map((store) => ({
      label: store,
      action: {
        type: "template",
        key: "SHOP_SINGLE",
        category: "Shopping",
        extras: { store }
      }
    }));
  }

  /* -----------------------
     BETA / HELP
  ----------------------- */
  function openBeta() {
    const versions = window.DashMsg?.getVersions?.() || {};
    const state = window.DashMsg?.state?.() || {};
    const testerId = state.tester_id || "unknown";

    currentScreen = "beta";

    renderScreen("Help & Testing", [
      {
        header: "Backup",
        items: [
          { label: "Export My Settings", action: { type: "function", name: "exportData" } },
          { label: "Import My Settings", action: { type: "function", name: "importData" } }
        ]
      },
      {
        header: "App Info",
        items: [
          { label: `App Version: ${versions.app_version || "-"}`, static: true },
          { label: `Tester ID: ${testerId}`, static: true },
          { label: "Copy Tester ID", action: { type: "function", name: "copyTesterId" } }
        ]
      }
    ]);
  }

  /* -----------------------
     DATA
  ----------------------- */
  async function exportData() {
    const payload = window.DashMsg?.exportState?.();
    if (!payload) return toast("Export failed", false);

    const ok = await window.DashMsg?.copyToClipboard?.(payload);
    toast(ok ? "Export copied" : "Export failed", !!ok);
  }

  async function importData() {
    const raw = prompt("Paste export JSON");
    if (!raw) return;

    const result = window.DashMsg?.importState?.(raw);
    if (result?.ok) {
      populateShoppingMenu();
      toast("Settings imported", true);
      navigateTo("settings", { push: false });
    } else {
      toast(result?.error || "Import failed", false);
    }
  }

  /* -----------------------
     FEEDBACK
  ----------------------- */


  async function copyTesterId() {
    const tester = window.DashMsg?.getTesterId?.() || "";
    const ok = await window.DashMsg?.copyToClipboard?.(tester);
    toast(ok ? "Tester ID copied" : "Copy failed", !!ok);
  }




  return {
    renderScreen,
    navigateTo,
    navBack,
    goHome,

    dispatchAction,

    useTemplate,
    setETA,

    toast,

    openBeta,

    exportData,
    importData,

    populateShoppingMenu,

    setEmojiOn: () => setPrefAndRefresh("emoji_on", true),
    setEmojiOff: () => setPrefAndRefresh("emoji_on", false),

    copyTesterId,
    currentScreen: () => currentScreen
  };
})();

window.DashMsgUI = DashMsgUI;
