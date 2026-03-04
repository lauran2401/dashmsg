/**
 * DashMsg Editors
 * 
 * Provides:
 * - Template Editor (list, edit, save, reset)
 * - Store Editor (add, remove, reorder)
 */

const DashMsgEditors = (() => {
    const app = document.getElementById('app');

    /**
     * Show template editor
     */
    function showTemplateEditor() {
        const templates = DashMsg.defaults().templates;
        const app_container = document.getElementById('app');
        
        let html = '<h1>Edit Templates</h1>';
        html += '<div class="list">';
        
        Object.keys(templates).forEach((key, idx) => {
            const isLast = idx === Object.keys(templates).length - 1;
            html += `<button class="row" onclick="DashMsgEditors.editTemplate('${key}')" style="border-bottom: ${isLast ? 'none' : '0.5px solid var(--border)'}">${key} <span>›</span></button>`;
        });
        
        html += '</div>';
        html += '<div class="list"><button class="row back" onclick="DashMsgUI.navigateTo(\'settings\')" style="border: none;">Back</button></div>';
        
        app_container.innerHTML = html;
    }

    /**
     * Edit individual template
     */
    function editTemplate(key) {
        const defaultValue = DashMsg.defaults().templates[key];
        const currentValue = DashMsg.getTemplate(key);
        
        const app_container = document.getElementById('app');
        let html = `<h1>${key}</h1>`;
        
        html += '<div style="padding: 15px;">';
        html += `<label style="display: block; font-size: 13px; color: var(--gray); margin-bottom: 8px; font-weight: 600;">Edit Template</label>`;
        html += `<textarea id="tpl-input" style="width: 100%; padding: 12px; border: 0.5px solid var(--border); border-radius: 8px; background: var(--card); color: var(--text); font-size: 14px; font-family: monospace; min-height: 120px;">${currentValue}</textarea>`;
        
        html += `<button class="row" onclick="DashMsgEditors.saveTemplate('${key}')" style="margin-top: 10px; border-radius: 8px; border: none; background: var(--blue); color: white; text-align: center; justify-content: center;">Save Changes</button>`;
        
        html += `<button class="row" onclick="DashMsgEditors.resetTemplate('${key}')" style="margin-top: 8px; border-radius: 8px; border: none; background: var(--gray); color: var(--card); text-align: center; justify-content: center;">Reset to Default</button>`;
        
        html += '<div style="background: var(--card); border: 0.5px solid var(--border); border-radius: 8px; padding: 12px; margin-top: 12px; font-size: 13px;">';
        html += '<strong>Default:</strong><br>';
        html += `<pre style="margin: 8px 0 0 0; font-size: 12px; overflow: auto; color: var(--gray);">${defaultValue}</pre>`;
        html += '</div>';
        
        html += '<button class="row back" onclick="DashMsgEditors.showTemplateEditor()" style="margin-top: 15px; border: none; border-radius: 8px; background: var(--card); text-align: center; justify-content: center;">Back to Templates</button>';
        html += '</div>';
        
        app_container.innerHTML = html;
        
        // Focus textarea
        setTimeout(() => {
            const input = document.getElementById('tpl-input');
            if (input) input.focus();
        }, 100);
    }

    /**
     * Save template changes
     */
    function saveTemplate(key) {
        const input = document.getElementById('tpl-input');
        if (input) {
            const value = input.value.trim();
            if (value) {
                DashMsg.setTemplate(key, value);
                alert('Template saved!');
                editTemplate(key);
            }
        }
    }

    /**
     * Reset template to default
     */
    function resetTemplate(key) {
        if (confirm('Reset this template to default?')) {
            DashMsg.resetTemplate(key);
            editTemplate(key);
        }
    }

    /**
     * Show store editor
     */
    function showStoreEditor() {
        const stores = DashMsg.getStores();
        const app_container = document.getElementById('app');
        
        let html = '<h1>Manage Stores</h1>';
        html += '<div class="list">';
        
        stores.forEach((store, idx) => {
            const isLast = idx === stores.length - 1;
            html += `<button class="row" onclick="DashMsgEditors.editStore(${idx})" style="border-bottom: ${isLast ? 'none' : '0.5px solid var(--border)'};">${store} <span>›</span></button>`;
        });
        
        html += '</div>';
        html += '<button class="row" onclick="DashMsgEditors.addStore()" style="background: var(--card); border-radius: 8px; border: 0.5px solid var(--border); margin-bottom: 20px; text-align: center; justify-content: center;">+ Add Store</button>';
        html += '<button class="row back" onclick="DashMsgUI.navigateTo(\'settings\')" style="border: none; border-radius: 8px; background: var(--card);">Back</button>';
        
        app_container.innerHTML = html;
    }

    /**
     * Edit individual store
     */
    function editStore(idx) {
        const stores = DashMsg.getStores();
        const store = stores[idx];
        const app_container = document.getElementById('app');
        
        let html = `<h1>Edit Store</h1>`;
        html += '<div style="padding: 15px;">';
        html += `<input id="store-input" type="text" value="${store}" placeholder="Store name" style="padding: 10px; border: 0.5px solid var(--border); border-radius: 8px; font-size: 16px;">`;
        
        html += `<button class="row" onclick="DashMsgEditors.updateStore(${idx})" style="margin-top: 10px; border-radius: 8px; border: none; background: var(--blue); color: white; text-align: center; justify-content: center;">Save</button>`;
        html += `<button class="row destructive" onclick="DashMsgEditors.removeStore(${idx})" style="margin-top: 8px; border-radius: 8px; border: none; background: var(--card); text-align: center; justify-content: center;">Remove</button>`;
        html += '<button class="row back" onclick="DashMsgEditors.showStoreEditor()" style="margin-top: 15px; border: none; border-radius: 8px; background: var(--card); text-align: center; justify-content: center;">Back</button>';
        html += '</div>';
        
        app_container.innerHTML = html;
        setTimeout(() => document.getElementById('store-input')?.focus(), 100);
    }

    /**
     * Update store name
     */
    function updateStore(idx) {
        const input = document.getElementById('store-input');
        if (input && input.value.trim()) {
            const stores = DashMsg.getStores();
            stores[idx] = input.value.trim();
            DashMsg.state().overrides.stores = stores;
            DashMsg.saveState();
            showStoreEditor();
        }
    }

    /**
     * Remove store
     */
    function removeStore(idx) {
        if (confirm('Remove this store?')) {
            const stores = DashMsg.getStores();
            stores.splice(idx, 1);
            DashMsg.state().overrides.stores = stores;
            DashMsg.saveState();
            showStoreEditor();
        }
    }

    /**
     * Add new store
     */
    function addStore() {
        const app_container = document.getElementById('app');
        let html = '<h1>Add Store</h1>';
        html += '<div style="padding: 15px;">';
        html += '<input id="new-store-input" type="text" placeholder="Store name" style="padding: 10px; border: 0.5px solid var(--border); border-radius: 8px; font-size: 16px;">';
        html += `<button class="row" onclick="DashMsgEditors.saveNewStore()" style="margin-top: 10px; border-radius: 8px; border: none; background: var(--blue); color: white; text-align: center; justify-content: center;">Add</button>`;
        html += '<button class="row back" onclick="DashMsgEditors.showStoreEditor()" style="margin-top: 8px; border: none; border-radius: 8px; background: var(--card); text-align: center; justify-content: center;">Back</button>';
        html += '</div>';
        app_container.innerHTML = html;
        setTimeout(() => document.getElementById('new-store-input')?.focus(), 100);
    }

    /**
     * Save new store
     */
    function saveNewStore() {
        const input = document.getElementById('new-store-input');
        if (input && input.value.trim()) {
            const stores = DashMsg.getStores();
            stores.push(input.value.trim());
            DashMsg.state().overrides.stores = stores;
            DashMsg.saveState();
            showStoreEditor();
        }
    }

    /**
     * Reset all data
     */
    function resetAll() {
        if (confirm('Clear ALL settings and data? This cannot be undone.')) {
            localStorage.clear();
            location.reload();
        }
    }

    /**
     * Public API
     */
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
