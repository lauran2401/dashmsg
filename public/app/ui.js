import { API_HEADERS } from "./config.js";

// public/app/ui.js — fixed (Home upper-left, Back only at bottom, no broken braces)

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
        const cls = item.class ? ` ${escapeHtml(item.class)}` : "";

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
      sendFeedback: openFeedback,
      exportData,
      importData,

      copyTesterId,

      setEmojiOn: () => setPrefAndRefresh("emoji_on", true),
      setEmojiOff: () => setPrefAndRefresh("emoji_on", false),
      setNamePromptOn: () => setPrefAndRefresh("name_prompt", true),
      setNamePromptOff: () => setPrefAndRefresh("name_prompt", false),

      submitFeedback
    };

    switch (action.type) {
      case "template":
        return useTemplate(action.key, action.category, action.extras);

      case "nav":
        return navigateTo(action.screen);

      case "navBack":
        return navBack();

      case "cancel":
        return window.DashMsg?.exitApp?.();

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
      const btn = e.target.closest("button.row, button.nav-btn");
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
    navigateTo("main", { push: true });
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
    const eta = prompt("ETA? (example: 5 min)");
    if (!eta) return;

    const tpl = window.DashMsg?.getTemplate?.("HEADING_WITH_ETA") || "";
    const rendered = window.DashMsg?.renderTemplate?.(tpl, { ETA: eta }) || "";

    window.DashMsg?.finishMessage?.(
      rendered,
      "HEADING_WITH_ETA",
      "Delivery",
      { used_eta: 1 }
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
        header: "Need Help?",
        items: [
          { label: "Send Feedback", action: { type: "function", name: "sendFeedback" } }
        ]
      },
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
  function openFeedback() {
    currentScreen = "feedback";

    app.innerHTML = `
      ${headerHtml("Feedback")}
      <div class="list feedback-panel">
        <div class="feedback-wrap">
          <textarea id="feedback-input" class="feedback-input"
            placeholder="Tell us what happened or what you'd like improved"></textarea>
          <button class="row" data-action='{"type":"function","name":"submitFeedback"}'>
            <span>Send Feedback</span>
          </button>
        </div>
      </div>
      <div class="list bottom-back">
        <button class="row back" data-action='{"type":"navBack"}'>Back</button>
      </div>
    `;
  }

  async function submitFeedback() {
    const input = document.getElementById("feedback-input");
    const message = input?.value?.trim();
    if (!message) return toast("Please enter feedback", false);

    const res = await window.DashMsg?.sendFeedback?.(message);
    if (res?.ok) {
      toast("Feedback sent", true, "Thank you");
      navigateTo("main", { push: true });
    } else {
      toast("Feedback failed", false);
    }
  }

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
    openFeedback,

    exportData,
    importData,

    populateShoppingMenu,

    setEmojiOn: () => setPrefAndRefresh("emoji_on", true),
    setEmojiOff: () => setPrefAndRefresh("emoji_on", false),

    setNamePromptOn: () => setPrefAndRefresh("name_prompt", true),
    setNamePromptOff: () => setPrefAndRefresh("name_prompt", false),

    copyTesterId
  };
})();

window.DashMsgUI = DashMsgUI;