/**
 * DashMsg Editors
 *
 * Template editor + store editor
 */

const DashMsgEditors = (() => {

    const app = document.getElementById("app");


    /* ---------------------------
       TEMPLATE EDITOR
    ---------------------------- */

    function showTemplateEditor() {

        const templates = DashMsg.defaults().templates;

        let html = `<h1>Edit Templates</h1>`;
        html += `<div class="list">`;

        Object.keys(templates).forEach((key, idx) => {

            html += `
            <button class="row"
                onclick="DashMsgEditors.editTemplate('${key}')">
                ${key}
                <span>›</span>
            </button>
            `;
        });

        html += `</div>`;

        html += `
        <div class="list">
            <button class="row back"
                onclick="DashMsgUI.navigateTo('settings')">
                Back
            </button>
        </div>
        `;

        app.innerHTML = html;
    }



    function editTemplate(key) {

        const defaultValue = DashMsg.defaults().templates[key];
        const currentValue = DashMsg.getTemplate(key);

        let html = `<h1>${key}</h1>`;

        html += `
        <div style="padding:16px">

        <textarea id="tpl-input"
        style="
        width:100%;
        min-height:120px;
        padding:12px;
        border-radius:10px;
        font-family:monospace;
        font-size:14px;"
        >${currentValue}</textarea>

        <button class="row"
        style="margin-top:12px;background:#0A84FF;color:white;border:none;border-radius:10px"
        onclick="DashMsgEditors.saveTemplate('${key}')">
        Save
        </button>

        <button class="row"
        style="margin-top:8px;border-radius:10px"
        onclick="DashMsgEditors.resetTemplate('${key}')">
        Reset to Default
        </button>

        <div style="margin-top:14px;font-size:12px;opacity:.7">
        Default:<br>
        <pre>${defaultValue}</pre>
        </div>

        <button class="row back"
        style="margin-top:14px"
        onclick="DashMsgEditors.showTemplateEditor()">
        Back
        </button>

        </div>
        `;

        app.innerHTML = html;

        setTimeout(() => {
            document.getElementById("tpl-input")?.focus();
        }, 100);
    }



    function saveTemplate(key) {

        const input = document.getElementById("tpl-input");

        if (!input) return;

        const value = input.value.trim();

        if (!value) return;

        DashMsg.setTemplate(key, value);

        DashMsgUI.showCopied("Template saved");

        editTemplate(key);
    }



    function resetTemplate(key) {

        if (!confirm("Reset this template?")) return;

        DashMsg.resetTemplate(key);

        editTemplate(key);
    }



    /* ---------------------------
       STORE EDITOR
    ---------------------------- */

    function showStoreEditor() {

        const stores = DashMsg.getStores();

        let html = `<h1>Manage Stores</h1>`;
        html += `<div class="list">`;

        stores.forEach((store, idx) => {

            html += `
            <button class="row"
            onclick="DashMsgEditors.editStore(${idx})">
            ${store}
            <span>›</span>
            </button>
            `;
        });

        html += `</div>`;

        html += `
        <button class="row"
        style="margin-top:12px"
        onclick="DashMsgEditors.addStore()">
        + Add Store
        </button>

        <button class="row back"
        onclick="DashMsgUI.navigateTo('settings')">
        Back
        </button>
        `;

        app.innerHTML = html;
    }



    function editStore(idx) {

        const stores = DashMsg.getStores();
        const store = stores[idx];

        let html = `
        <h1>Edit Store</h1>

        <div style="padding:16px">

        <input id="store-input"
        value="${store}"
        style="
        width:100%;
        padding:12px;
        font-size:16px;
        border-radius:10px"
        />

        <button class="row"
        style="margin-top:12px;background:#0A84FF;color:white;border:none;border-radius:10px"
        onclick="DashMsgEditors.updateStore(${idx})">
        Save
        </button>

        <button class="row destructive"
        style="margin-top:8px"
        onclick="DashMsgEditors.removeStore(${idx})">
        Remove
        </button>

        <button class="row back"
        style="margin-top:12px"
        onclick="DashMsgEditors.showStoreEditor()">
        Back
        </button>

        </div>
        `;

        app.innerHTML = html;

        setTimeout(() => {
            document.getElementById("store-input")?.focus();
        }, 100);
    }



    function updateStore(idx) {

        const input = document.getElementById("store-input");

        if (!input) return;

        const value = input.value.trim();

        if (!value) return;

        const stores = [...DashMsg.getStores()];

        stores[idx] = value;

        DashMsg.setStores(stores);

        showStoreEditor();
    }



    function removeStore(idx) {

        if (!confirm("Remove this store?")) return;

        const stores = [...DashMsg.getStores()];

        stores.splice(idx, 1);

        DashMsg.setStores(stores);

        showStoreEditor();
    }



    function addStore() {

        let html = `
        <h1>Add Store</h1>

        <div style="padding:16px">

        <input id="new-store"
        placeholder="Store name"
        style="
        width:100%;
        padding:12px;
        font-size:16px;
        border-radius:10px"
        />

        <button class="row"
        style="margin-top:12px;background:#0A84FF;color:white;border:none;border-radius:10px"
        onclick="DashMsgEditors.saveNewStore()">
        Add
        </button>

        <button class="row back"
        style="margin-top:8px"
        onclick="DashMsgEditors.showStoreEditor()">
        Back
        </button>

        </div>
        `;

        app.innerHTML = html;

        setTimeout(() => {
            document.getElementById("new-store")?.focus();
        }, 100);
    }



    function saveNewStore() {

        const input = document.getElementById("new-store");

        if (!input) return;

        const value = input.value.trim();

        if (!value) return;

        const stores = [...DashMsg.getStores()];

        stores.push(value);

        DashMsg.setStores(stores);

        showStoreEditor();
    }



    /* ---------------------------
       RESET
    ---------------------------- */

    function resetAll() {

        if (!confirm("Clear ALL DashMsg data?")) return;

        localStorage.clear();

        location.reload();
    }



    return {

        showTemplateEditor,
        editTemplate,
        saveTemplate,
        resetTemplate,

        showStoreEditor,
        editStore,
        updateStore,
        removeStore,
        addStore,
        saveNewStore,

        resetAll

    };

})();


window.DashMsgEditors = DashMsgEditors;