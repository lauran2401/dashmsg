// public/app/ui.js — fixed (Home upper-left, Back only at bottom, no broken braces)

const LS_RECENT = "dashmsg_beta_recent";
const LS_QUEUE = "dashmsg_beta_queue";
const LS_DRAFT = "dashmsg_feedback_draft";
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

function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || ""); } catch { return fallback; }
}

function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

const FEEDBACK_CATALOG = [
  { id:"tpl_rename", cat:"Templates", title:"Rename template", desc:"Improve labels people see in the editor", tags:["name","label","rename","title"], aliases:["change template name"], priority:3, prompt:"What should the new template name be?", promptSchema:{ fields:[{ key:"current_name", label:"Current template name", type:"text", required:true }, { key:"new_name", label:"New template name", type:"text", required:true }] } },
  { id:"tpl_reorder", cat:"Templates", title:"Change template order", desc:"Better default ordering and grouping", tags:["order","sort","group"], aliases:["reorder templates"], priority:3, prompt:"What order would you prefer?", promptSchema:{ fields:[{ key:"menu_name", label:"Which menu or list?", type:"text", required:true }, { key:"item_name", label:"Which item should move?", type:"text", required:true }, { key:"target_position", label:"Where should it move?", type:"text", required:true }] } },
  { id:"tpl_wording", cat:"Templates", title:"Improve template wording", desc:"Make message clearer, shorter, more polite", tags:["copy","tone","wording","text"], aliases:["rewrite template"], priority:2, prompt:"What wording change do you want?", promptSchema:{ fields:[{ key:"template_name", label:"Template name", type:"text", required:false }, { key:"current_wording", label:"Current wording", type:"textarea", required:true }, { key:"preferred_wording", label:"Preferred wording", type:"textarea", required:true }] } },
  { id:"tpl_add", cat:"Templates", title:"Add new template", desc:"Missing scenario, add a new preset", tags:["new","missing","scenario"], aliases:["new template"], priority:2, prompt:"What scenario should this template cover?", promptSchema:{ fields:[{ key:"feature_idea", label:"Template idea", type:"text", required:true }, { key:"why_helpful", label:"Why it would help", type:"textarea", required:true }] } },
  { id:"tpl_vars", cat:"Templates", title:"Add placeholder/variable", desc:"Name/ETA/store/hot bag placeholders", tags:["variable","placeholder","eta","name"], aliases:["dynamic field"], priority:2, prompt:"Which placeholder do you need?", promptSchema:{ fields:[{ key:"template_name", label:"Template name", type:"text", required:false }, { key:"placeholder_name", label:"Placeholder needed", type:"text", required:true }, { key:"usage_note", label:"How should it work?", type:"textarea", required:false }] } },
  { id:"ui_spacing", cat:"UI", title:"Fix spacing/layout", desc:"Padding, alignment, dense/airy", tags:["spacing","layout","padding"], aliases:["ui feels cramped"], priority:2, prompt:"Where does the layout feel off?", promptSchema:{ fields:[{ key:"screen", label:"Which screen?", type:"text", required:true }, { key:"issue", label:"What feels wrong?", type:"textarea", required:true }] } },
  { id:"ui_nav", cat:"UI", title:"Navigation confusion", desc:"Hard to find a screen or go back", tags:["navigation","back","home"], aliases:["too many taps"], priority:2, prompt:"Where did navigation feel confusing?", promptSchema:{ fields:[{ key:"task", label:"What were you trying to do?", type:"text", required:true }, { key:"blocked_step", label:"Where did it get confusing?", type:"textarea", required:true }] } },
  { id:"ui_scroll", cat:"UI", title:"Scrolling issue", desc:"Scroll area feels wrong or stuck", tags:["scroll","overflow"], aliases:["stuck scroll"], priority:1, prompt:"What scrolling behavior did you expect?", promptSchema:{ fields:[{ key:"screen", label:"Where did this happen?", type:"text", required:true }, { key:"expected", label:"What should have happened?", type:"textarea", required:true }, { key:"actual", label:"What happened instead?", type:"textarea", required:true }] } },
  { id:"auto_context", cat:"Automation", title:"Auto-suggest best template", desc:"Choose message based on context", tags:["auto","suggest","smart"], aliases:["smarter suggestions"], priority:2, prompt:"What context should the app use?", promptSchema:{ fields:[{ key:"situation", label:"Typical situation", type:"textarea", required:true }, { key:"expected_template", label:"Expected suggestion", type:"text", required:true }] } },
  { id:"auto_eta", cat:"Automation", title:"Better ETA handling", desc:"ETA prompts, formatting, toggles", tags:["eta","time"], aliases:["eta flow"], priority:2, prompt:"How should ETA handling work?", promptSchema:{ fields:[{ key:"current_behavior", label:"Current behavior", type:"textarea", required:true }, { key:"preferred_behavior", label:"Preferred behavior", type:"textarea", required:true }] } },
  { id:"bug_copy", cat:"Bug", title:"Copy/paste failure", desc:"Clipboard not working or wrong text", tags:["copy","clipboard","paste"], aliases:["clipboard bug"], priority:2, prompt:"What happened when copying or pasting?", promptSchema:{ fields:[{ key:"what_sent", label:"What text was copied/sent?", type:"textarea", required:true }, { key:"expected", label:"What should have happened?", type:"textarea", required:true }, { key:"repro", label:"Optional reproduction note", type:"textarea", required:false }] } },
  { id:"bug_save", cat:"Bug", title:"Save/reset failure", desc:"Edits not persisting or reset wrong", tags:["save","reset","storage"], aliases:["data lost"], priority:2, prompt:"What failed to save correctly?", promptSchema:{ fields:[{ key:"where", label:"Where did this happen?", type:"text", required:true }, { key:"lost_change", label:"What change was lost?", type:"textarea", required:true }] } },
  { id:"bug_crash", cat:"Bug", title:"Crash/error", desc:"Screen breaks or JS error", tags:["crash","error"], aliases:["app broken"], priority:3, prompt:"What did you do right before the error?", promptSchema:{ fields:[{ key:"action", label:"Action before error", type:"text", required:true }, { key:"error_text", label:"Error shown", type:"textarea", required:false }, { key:"expected", label:"What should have happened?", type:"textarea", required:true }] } }
];

function norm(s) { return String(s || "").toLowerCase().trim(); }

function scoreItem(q, item) {
  if (!q) return 0;
  const t = norm(item.title);
  const d = norm(item.desc);
  const tags = (item.tags || []).map(norm).join(" ");
  const aliases = (item.aliases || []).map(norm).join(" ");
  const qq = norm(q);
  const synonyms = {
    reorder: ["order", "sort", "arrange"],
    bug: ["error", "broken", "wrong"],
    rename: ["name", "label", "title"],
    clicks: ["taps", "steps", "navigation"]
  };

  if (t === qq) return 120;
  if (t.startsWith(qq)) return 90;
  if (t.includes(qq)) return 70;
  if (aliases.includes(qq)) return 66;
  if (tags.includes(qq)) return 58;
  if (d.includes(qq)) return 35;

  const toks = qq.split(/\s+/).filter(Boolean);
  let hits = 0;
  for (const tok of toks) {
    const syn = synonyms[tok] || [];
    if (t.includes(tok) || tags.includes(tok) || d.includes(tok) || aliases.includes(tok)) hits += 2;
    if (syn.some((s) => t.includes(s) || tags.includes(s) || aliases.includes(s) || d.includes(s))) hits++;
  }
  return hits ? 18 + hits * 7 : 0;
}

function uniqueById(arr) {
  const seen = new Set();
  return arr.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

function getFeedbackContext() {
  return {
    url: location.href,
    screen: window.DashMsgUI?.currentScreen?.() || null,
    app_version: window.DashMsg?.defaults?.()?.app_version || null,
    tester_id: localStorage.getItem("dashmsg_tester_id") || null,
    debug: !!localStorage.getItem("dashmsg_debug")
  };
}

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

    try {
      await window.DashMsg?.sendFeedback?.({ type: "legacy_feedback", notes: message, ts: Date.now() });
      toast("Feedback sent", true, "Thank you");
      navigateTo("main", { push: true });
    } catch {
      toast("Feedback failed", false);
    }
  }

  async function copyTesterId() {
    const tester = window.DashMsg?.getTesterId?.() || "";
    const ok = await window.DashMsg?.copyToClipboard?.(tester);
    toast(ok ? "Tester ID copied" : "Copy failed", !!ok);
  }


  function initFeedbackCommandPalette() {
    const fab = document.getElementById("beta-fab");
    const miniBar = document.getElementById("beta-minibar");
    const panel = document.getElementById("beta-panel");
    const minimize = document.getElementById("beta-minimize");
    const close = document.getElementById("beta-close");
    const search = document.getElementById("beta-search");
    const inlineResults = document.getElementById("beta-inline-results");
    const browseCats = document.getElementById("beta-browse-cats");
    const catsList = document.getElementById("beta-cats-list");
    const browseAz = document.getElementById("beta-browse-az");
    const azList = document.getElementById("beta-az-list");
    const dynamicFields = document.getElementById("beta-dynamic-fields");
    const send = document.getElementById("beta-send");

    if (!fab || !miniBar || !panel || !minimize || !close || !search || !inlineResults || !browseCats || !catsList || !browseAz || !azList || !dynamicFields || !send) return;

    const initialDraft = lsGet(LS_DRAFT, null);
    let selectedId = initialDraft?.selectedId || null;
    let selectedTitle = initialDraft?.selectedTitle || "";
    let panelState = ["closed", "open", "minimized"].includes(initialDraft?.state) ? initialDraft.state : "closed";
    let expandedCategory = initialDraft?.expandedCategory || null;
    let draftSchemaValues = initialDraft?.schemaValues || {};

    function hasDraft() {
      const hasSchemaFields = Object.values(getSchemaValues()).some((v) => String(v || "").trim());
      return !!(search.value.trim() || selectedId || selectedTitle.trim() || hasSchemaFields);
    }

    function getSelectedSuggestion() {
      if (!selectedId) return null;
      return FEEDBACK_CATALOG.find((x) => x.id === selectedId) || null;
    }

    function getSchemaValues() {
      const out = {};
      dynamicFields.querySelectorAll("[data-schema-key]").forEach((el) => {
        out[el.dataset.schemaKey] = el.value || "";
      });
      return out;
    }

    function syncPanelHeight() {
      panel.classList.toggle("has-details", !!getSelectedSuggestion());
    }

    function syncStateUI() {
      panel.classList.toggle("is-open", panelState === "open");
      fab.classList.toggle("is-open", panelState === "open");
      miniBar.classList.toggle("is-visible", panelState === "minimized" && hasDraft());
      syncPanelHeight();
    }

    function setPanelState(next) {
      panelState = next;
      syncStateUI();
    }

    function cycleFromButton() {
      if (panelState === "closed") return setPanelState("open");
      if (panelState === "open") return setPanelState("minimized");
      return setPanelState("open");
    }

    function schemaFieldHtml(field, value) {
      const id = `beta-schema-${field.key}`;
      if (field.type === "textarea") {
        return `
          <label class="beta-field-label" for="${id}">${field.label}${field.required ? " *" : ""}</label>
          <textarea id="${id}" class="beta-schema-input" data-schema-key="${field.key}" placeholder="${field.label}" ${field.required ? "required" : ""}>${escapeHtml(value || "")}</textarea>
        `;
      }
      return `
        <label class="beta-field-label" for="${id}">${field.label}${field.required ? " *" : ""}</label>
        <input id="${id}" class="beta-schema-input" data-schema-key="${field.key}" type="text" value="${escapeHtml(value || "")}" placeholder="${field.label}" ${field.required ? "required" : ""} />
      `;
    }

    function renderDynamicFields() {
      const selected = getSelectedSuggestion();
      if (!selected?.promptSchema?.fields?.length) {
        dynamicFields.hidden = true;
        dynamicFields.innerHTML = "";
        syncPanelHeight();
        return;
      }

      const saved = { ...draftSchemaValues, ...getSchemaValues() };
      dynamicFields.hidden = false;
      dynamicFields.innerHTML = `
        <div class="beta-fields-title">Details</div>
        ${selected.promptSchema.fields.map((field) => `<div class="beta-field-row">${schemaFieldHtml(field, saved[field.key])}</div>`).join("")}
      `;
      dynamicFields.querySelectorAll("[data-schema-key]").forEach((el) => {
        el.addEventListener("input", saveDraft);
      });
      syncPanelHeight();
    }

    function syncSelectionUI() {
      renderDynamicFields();
    }

    function searchResults(query) {
      if (!query) return [];
      return FEEDBACK_CATALOG
        .map((item) => ({ item, score: scoreItem(query, item) + (item.priority || 0) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item);
    }

    function recentItems() {
      const ids = lsGet(LS_RECENT, []);
      return ids.map((id) => FEEDBACK_CATALOG.find((x) => x.id === id)).filter(Boolean).slice(0, 5);
    }

    function rowHtml(item, meta = "") {
      const isSelected = selectedId === item.id ? " is-selected" : "";
      return `
        <button class="beta-inline-item${isSelected}" type="button" data-id="${item.id}">
          <span class="beta-inline-main">
            <span class="beta-inline-title">${item.title}</span>
            <span class="beta-inline-desc">${item.desc}</span>
          </span>
          <span class="beta-inline-meta">${meta || item.cat}</span>
        </button>
      `;
    }

    function renderInlineResults() {
      const q = search.value.trim();
      const matches = searchResults(q);
      if (!q) {
        const recent = recentItems();
        inlineResults.innerHTML = recent.length
          ? `<div class="beta-inline-label">Recent</div>${recent.map((it) => rowHtml(it, "Recent")).join("")}`
          : `<div class="beta-inline-empty">Start typing to find feedback suggestions.</div>`;
        return;
      }

      const top = matches.slice(0, 5);
      const more = matches.length > 5;
      inlineResults.innerHTML = top.length
        ? `<div class="beta-inline-label">Suggestions</div>${top.map((it) => rowHtml(it)).join("")}${more ? `<button id="beta-show-more" type="button" class="beta-show-more">Show more ▾</button>` : ""}`
        : `<div class="beta-inline-empty">No matches yet. Try another keyword.</div>`;

      const showMore = document.getElementById("beta-show-more");
      if (showMore) {
        showMore.onclick = () => {
          inlineResults.innerHTML = `<div class="beta-inline-label">Suggestions</div>${matches.map((it) => rowHtml(it)).join("")}`;
        };
      }
    }

    function renderCategories() {
      const grouped = {};
      FEEDBACK_CATALOG.forEach((item) => {
        grouped[item.cat] = grouped[item.cat] || [];
        grouped[item.cat].push(item);
      });

      const rows = Object.keys(grouped).sort().map((cat) => {
        const open = expandedCategory === cat;
        const items = open ? `<div class="beta-nested-list">${grouped[cat].map((item) => rowHtml(item)).join("")}</div>` : "";
        return `
          <div class="beta-cat-block">
            <button type="button" class="beta-nested-toggle" data-cat="${cat}" aria-expanded="${open ? "true" : "false"}">${cat} <span aria-hidden="true">${open ? "▾" : "▸"}</span></button>
            ${items}
          </div>
        `;
      }).join("");

      catsList.innerHTML = rows;
    }

    function renderAz() {
      const rows = FEEDBACK_CATALOG
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((item) => rowHtml(item, item.cat))
        .join("");
      azList.innerHTML = rows;
    }

    function selectSuggestion(id) {
      const item = FEEDBACK_CATALOG.find((x) => x.id === id);
      if (!item) return;
      selectedId = item.id;
      selectedTitle = item.title;
      search.value = item.title;
      syncSelectionUI();
      renderInlineResults();
      renderCategories();
      renderAz();
      saveDraft();
    }


    function saveDraft() {
      const schemaValues = getSchemaValues();
      const hasAny = !!(search.value.trim() || selectedId || selectedTitle.trim() || Object.values(schemaValues).some((v) => String(v || "").trim()));
      const persistedState = hasAny && panelState !== "closed" ? panelState : "closed";
      draftSchemaValues = schemaValues;
      lsSet(LS_DRAFT, {
        state: persistedState,
        search: search.value || "",
        selectedId,
        selectedTitle,
        expandedCategory,
        schemaValues,
        updatedAt: Date.now()
      });
      syncStateUI();
    }

    function restoreDraft() {
      const draft = lsGet(LS_DRAFT, null);
      if (!draft || typeof draft !== "object") return;
      search.value = draft.search || "";
      selectedId = draft.selectedId || null;
      selectedTitle = draft.selectedTitle || "";
      expandedCategory = draft.expandedCategory || null;
      draftSchemaValues = draft.schemaValues || {};
    }

    function pushRecent(id) {
      const r = lsGet(LS_RECENT, []);
      const next = [id, ...r.filter((x) => x !== id)].slice(0, 12);
      lsSet(LS_RECENT, next);
    }

    function closeWithDiscardFlow() {
      const schemaValues = getSchemaValues();
      const hasUnsent = !!(search.value.trim() || selectedId || selectedTitle.trim() || Object.values(schemaValues).some((v) => String(v || "").trim()));
      if (!hasUnsent) {
        setPanelState("closed");
        saveDraft();
        return;
      }
      const discard = window.confirm("Discard feedback?");
      if (discard) {
        localStorage.removeItem(LS_DRAFT);
        selectedId = null;
        selectedTitle = "";
        search.value = "";
        expandedCategory = null;
        dynamicFields.innerHTML = "";
        dynamicFields.hidden = true;
        draftSchemaValues = {};
        syncSelectionUI();
        renderInlineResults();
        renderCategories();
        renderAz();
        setPanelState("closed");
        saveDraft();
        return;
      }
      setPanelState("minimized");
      saveDraft();
    }

    fab.onclick = () => {
      cycleFromButton();
      if (panelState === "open") setTimeout(() => search.focus(), 0);
      saveDraft();
    };

    miniBar.onclick = () => {
      setPanelState("open");
      setTimeout(() => search.focus(), 0);
      saveDraft();
    };

    minimize.onclick = () => {
      setPanelState("minimized");
      saveDraft();
    };

    close.onclick = () => closeWithDiscardFlow();

    search.addEventListener("input", () => {
      if (selectedTitle && search.value.trim() !== selectedTitle.trim()) {
        selectedId = null;
        selectedTitle = "";
      }
      syncSelectionUI();
      renderInlineResults();
      saveDraft();
    });

    function onSuggestionClick(e) {
      const row = e.target.closest("[data-id]");
      if (!row) return;
      selectSuggestion(row.dataset.id);
    }

    inlineResults.addEventListener("click", onSuggestionClick);
    catsList.addEventListener("click", (e) => {
      const toggle = e.target.closest(".beta-nested-toggle");
      if (toggle) {
        const cat = toggle.dataset.cat;
        expandedCategory = expandedCategory === cat ? null : cat;
        renderCategories();
        saveDraft();
        return;
      }
      onSuggestionClick(e);
    });
    azList.addEventListener("click", onSuggestionClick);

    browseCats.onclick = () => {
      const open = browseCats.getAttribute("aria-expanded") === "true";
      browseCats.setAttribute("aria-expanded", open ? "false" : "true");
      browseCats.querySelector("span").textContent = open ? "▸" : "▾";
      catsList.hidden = open;
      if (!open) renderCategories();
      saveDraft();
    };

    browseAz.onclick = () => {
      const open = browseAz.getAttribute("aria-expanded") === "true";
      browseAz.setAttribute("aria-expanded", open ? "false" : "true");
      browseAz.querySelector("span").textContent = open ? "▸" : "▾";
      azList.hidden = open;
      if (!open) renderAz();
      saveDraft();
    };

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panelState !== "closed") closeWithDiscardFlow();
    });

    send.onclick = async () => {
      const selected = getSelectedSuggestion();
      const schemaValues = getSchemaValues();
      const payload = {
        type: "smart_feedback",
        command_id: selected?.id || null,
        command_title: selected?.title || search.value || null,
        category: selected?.cat || null,
        notes: JSON.stringify(schemaValues),
        free_text: search.value || null,
        context: getFeedbackContext(),
        ts: Date.now()
      };

      let ok = true;
      try {
        await window.DashMsg?.sendFeedback?.(payload);
      } catch {
        ok = false;
        const q = lsGet(LS_QUEUE, []);
        q.push(payload);
        lsSet(LS_QUEUE, q);
      }

      if (selected?.id) pushRecent(selected.id);

      if (ok) {
        localStorage.removeItem(LS_DRAFT);
        selectedId = null;
        selectedTitle = "";
        search.value = "";
        expandedCategory = null;
        dynamicFields.innerHTML = "";
        dynamicFields.hidden = true;
        draftSchemaValues = {};
        setPanelState("closed");
      } else {
        saveDraft();
        setPanelState("minimized");
      }

      syncSelectionUI();
      renderInlineResults();
      renderCategories();
      renderAz();
      syncStateUI();
      window.DashMsgUI?.toast?.(ok ? "Sent" : "Queued", true, "Saved");
    };

    restoreDraft();
    if (!hasDraft() && panelState !== "closed") panelState = "closed";
    syncSelectionUI();
    renderInlineResults();
    renderCategories();
    renderAz();
    syncStateUI();
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

    copyTesterId,
    initFeedbackCommandPalette,
    currentScreen: () => currentScreen
  };
})();

window.DashMsgUI = DashMsgUI;
