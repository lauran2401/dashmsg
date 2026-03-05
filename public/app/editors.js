const DashMsgEditors = (() => {
  const app = document.getElementById("app");

  function esc(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function action(obj) {
    return JSON.stringify(obj);
  }

  function showTemplateEditor() {
    const templates = window.DashMsg?.defaults?.().templates || {};
    const rows = Object.keys(templates).map((key) => `
      <button class="row" data-action='${action({ type: "function", name: "editTemplate", key })}'>
        <span>${esc(key)}</span><span class="chev">›</span>
      </button>
    `).join("");

    app.innerHTML = `
      <h1>Edit Templates</h1>
      <div class="list">${rows}</div>
      <div class="list bottom-nav">
        <button class="row back" data-action='${action({ type: "nav", screen: "settings" })}'>Back</button>
        <button class="row" data-action='${action({ type: "home" })}'>Home</button>
      </div>
    `;
  }

  function editTemplate(key) {
    const defs = window.DashMsg?.defaults?.().templates || {};
    const current = window.DashMsg?.getTemplate?.(key) || "";

    app.innerHTML = `
      <h1>${esc(key)}</h1>
      <div class="list feedback-panel">
        <div class="feedback-wrap">
          <textarea id="tpl-input" class="feedback-input">${esc(current)}</textarea>
          <button class="row" data-action='${action({ type: "function", name: "saveTemplate", key })}'>Save</button>
          <button class="row" data-action='${action({ type: "function", name: "resetTemplate", key })}'>Reset to Default</button>
          <div class="beta-meta">Default: ${esc(defs[key] || "")}</div>
        </div>
      </div>
      <div class="list bottom-nav">
        <button class="row back" data-action='${action({ type: "function", name: "showTemplateEditor" })}'>Back</button>
      </div>
    `;
  }

  function saveTemplate(key) {
    const value = document.getElementById("tpl-input")?.value?.trim();
    if (!value) return;
    window.DashMsg?.setTemplate?.(key, value);
    window.DashMsgUI?.toast?.("Saved", true, "Saved");
    editTemplate(key);
  }

  function resetTemplate(key) {
    if (!confirm("Reset this template?")) return;
    window.DashMsg?.resetTemplate?.(key);
    window.DashMsgUI?.toast?.("Reset", true, "Saved");
    editTemplate(key);
  }

  function showStoreEditor() {
    const stores = window.DashMsg?.getStores?.() || [];
    const rows = stores.map((store, idx) => `
      <button class="row" data-action='${action({ type: "function", name: "editStore", idx })}'>
        <span>${esc(store)}</span><span class="chev">›</span>
      </button>
    `).join("");

    app.innerHTML = `
      <h1>Manage Stores</h1>
      <div class="list">${rows}</div>
      <div class="list"><button class="row" data-action='${action({ type: "function", name: "addStore" })}'>+ Add Store</button></div>
      <div class="list bottom-nav">
        <button class="row back" data-action='${action({ type: "nav", screen: "settings" })}'>Back</button>
        <button class="row" data-action='${action({ type: "home" })}'>Home</button>
      </div>
    `;
  }

  function editStore(idx) {
    const stores = window.DashMsg?.getStores?.() || [];
    app.innerHTML = `
      <h1>Edit Store</h1>
      <div class="list feedback-panel">
        <div class="feedback-wrap">
          <input id="store-input" type="text" value="${esc(stores[idx] || "")}" />
          <button class="row" data-action='${action({ type: "function", name: "updateStore", idx })}'>Save</button>
          <button class="row destructive" data-action='${action({ type: "function", name: "removeStore", idx })}'>Remove</button>
        </div>
      </div>
      <div class="list bottom-nav"><button class="row back" data-action='${action({ type: "function", name: "showStoreEditor" })}'>Back</button></div>
    `;
  }

  function updateStore(idx) {
    const value = document.getElementById("store-input")?.value?.trim();
    if (!value) return;
    const stores = window.DashMsg?.getStores?.().slice() || [];
    stores[idx] = value;
    window.DashMsg?.setStores?.(stores);
    window.DashMsgUI?.toast?.("Saved", true, "Saved");
    showStoreEditor();
  }

  function removeStore(idx) {
    if (!confirm("Remove this store?")) return;
    const stores = window.DashMsg?.getStores?.().slice() || [];
    stores.splice(idx, 1);
    window.DashMsg?.setStores?.(stores);
    window.DashMsgUI?.toast?.("Removed", true, "Saved");
    showStoreEditor();
  }

  function addStore() {
    app.innerHTML = `
      <h1>Add Store</h1>
      <div class="list feedback-panel">
        <div class="feedback-wrap">
          <input id="new-store" type="text" placeholder="Store name" />
          <button class="row" data-action='${action({ type: "function", name: "saveNewStore" })}'>Add</button>
        </div>
      </div>
      <div class="list bottom-nav"><button class="row back" data-action='${action({ type: "function", name: "showStoreEditor" })}'>Back</button></div>
    `;
  }

  function saveNewStore() {
    const value = document.getElementById("new-store")?.value?.trim();
    if (!value) return;
    const stores = window.DashMsg?.getStores?.().slice() || [];
    stores.push(value);
    window.DashMsg?.setStores?.(stores);
    window.DashMsgUI?.toast?.("Added", true, "Saved");
    showStoreEditor();
  }

  function resetAll() {
    if (!confirm("Clear ALL DashMsg data?")) return;
    localStorage.removeItem("dashmsg_state");
    window.DashMsg?.setDebug?.(false);
    window.DashMsgUI?.toast?.("Reset", true, "Saved");
    location.reload();
  }

  return { showTemplateEditor, editTemplate, saveTemplate, resetTemplate, showStoreEditor, editStore, updateStore, removeStore, addStore, saveNewStore, resetAll };
})();

window.DashMsgEditors = DashMsgEditors;
