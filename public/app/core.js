/**
 * DashMsg Core Engine
 * 
 * Responsibilities:
 * - State management and persistence
 * - Template rendering with variable substitution
 * - Emoji toggle
 * - Clipboard copy
 * - Shortcut return system
 * - Logging integration
 * - Application initialization
 */

const DashMsg = (() => {
    const API_KEY = "DashMaster_2026!";
    const DEFAULTS_URL = "./defaults.json";
    const STORAGE_KEY = "dashmsg_state";
    const TESTER_ID_KEY = "dashmsg_tester_id";
    
    // Get query parameters
    const params = new URLSearchParams(location.search);
    const returnUrl = params.get("return");
    const source = params.get("source") || "web";
    
    let defaults = {};
    let state = {
        prefs: {
            emoji_on: true,
            name_prompt: true,
            hotbag_default: true
        },
        overrides: {
            templates: {},
            stores: []
        },
        session: {
            customerName: ""
        }
    };
    
    let navStack = [];
    
    /**
     * Load defaults.json and merge with localStorage
     */
    async function loadDefaults() {
        try {
            const response = await fetch(DEFAULTS_URL);
            defaults = await response.json();
            
            // Load saved state from localStorage
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const savedState = JSON.parse(saved);
                state = {
                    prefs: { ...state.prefs, ...savedState.prefs },
                    overrides: { ...state.overrides, ...savedState.overrides },
                    session: { ...state.session, ...savedState.session }
                };
            }
            
            // Use custom stores if override exists
            if (state.overrides.stores.length === 0) {
                state.overrides.stores = [...defaults.stores];
            }
            
            return true;
        } catch (e) {
            console.error("Failed to load defaults.json", e);
            return false;
        }
    }
    
    /**
     * Get app and schema version from defaults
     */
    function getVersions() {
        return {
            app_version: defaults.app_version || "0.1.0",
            schema_version: defaults.schema_version || 1
        };
    }
    
    /**
     * Get unique tester ID for logging
     */
    function getTesterId() {
        let id = localStorage.getItem(TESTER_ID_KEY);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(TESTER_ID_KEY, id);
        }
        return id;
    }
    
    /**
     * Save current state to localStorage
     */
    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    
    /**
     * Get a template by key, with overrides from localStorage
     */
    function getTemplate(key) {
        if (state.overrides.templates[key]) {
            return state.overrides.templates[key];
        }
        return defaults.templates?.[key] || "";
    }
    
    /**
     * Get list of stores (with overrides)
     */
    function getStores() {
        return state.overrides.stores || defaults.stores || [];
    }
    
    /**
     * Set custom template override
     */
    function setTemplate(key, value) {
        state.overrides.templates[key] = value;
        saveState();
    }
    
    /**
     * Reset template to default
     */
    function resetTemplate(key) {
        delete state.overrides.templates[key];
        saveState();
    }
    
    /**
     * Render template with variable substitution
     */
    function renderTemplate(tpl, vars = {}) {
        let s = tpl;
        for (const [k, v] of Object.entries(vars)) {
            s = s.split(`{${k}}`).join(v);
        }
        return s;
    }
    
    /**
     * Strip emoji from text based on prefs
     */
    function withEmoji(text, on) {
        if (on) return text;
        // Remove emojis and diacriticals
        return text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDDFF]/g, '').trim();
    }
    
    /**
     * Log event to API
     */
    async function logEvent(key, category, extras = {}) {
        try {
            const versions = getVersions();
            await fetch("/api/log", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-dashmsg-key": API_KEY
                },
                body: JSON.stringify({
                    tester_id: getTesterId(),
                    source: source,
                    app_version: versions.app_version,
                    schema_version: versions.schema_version,
                    category: category,
                    template_key: key,
                    ...extras
                })
            });
        } catch (e) {
            console.error("Log failed", e);
        }
    }
    
    /**
     * Copy text to clipboard
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error("Failed to copy to clipboard", err);
            return false;
        }
    }
    
    /**
     * Finalize and send message
     */
    async function finishMessage(msg, key, category, extras = {}) {
        let usedName = 0;
        
        // If this is a shopping message with store, render it
        if (key === 'SHOP_SINGLE' && extras.store) {
            msg = renderTemplate(msg, {STORE: extras.store});
        }
        
        // Prompt for customer name if enabled and message starts with "Hi!"
        if (state.prefs.name_prompt && msg.startsWith("Hi!")) {
            const name = prompt("Customer name? (Cancel to skip)");
            if (name) {
                msg = msg.replace("Hi!", `Hi, ${name}!`);
                usedName = 1;
            }
        }
        
        // Apply emoji preference
        const final = withEmoji(msg, state.prefs.emoji_on);
        
        // Log the event
        await logEvent(key, category, { used_name: usedName, ...extras });
        
        // Copy to clipboard
        const copied = await copyToClipboard(final);
        
        if (copied) {
            alert("Copied to clipboard!");
            
            // If return URL provided, return to shortcut with message
            if (returnUrl) {
                const encodedMsg = encodeURIComponent(final);
                window.location.href = returnUrl + encodedMsg;
            } else {
                // Optional: close window on success
                window.close();
            }
        } else {
            alert("Failed to copy to clipboard");
        }
    }
    
    /**
     * Navigation: push screen to stack
     */
    function pushNav(screen) {
        navStack.push(screen);
    }
    
    /**
     * Navigation: pop from stack
     */
    function popNav() {
        if (navStack.length > 0) {
            navStack.pop();
        }
    }
    
    /**
     * Get current navigation depth
     */
    function getNavDepth() {
        return navStack.length;
    }
    
    /**
     * Initialize the application
     */
    async function init() {
        const loaded = await loadDefaults();
        if (!loaded) {
            console.error("Failed to initialize DashMsg");
            return;
        }
        
        // Populate shopping menu with stores
        if (window.DashMsgUI?.populateShoppingMenu) {
            DashMsgUI.populateShoppingMenu();
        }
        
        // Render the main menu
        const mainMenu = DashMsgMenus?.main;
        if (mainMenu && window.DashMsgUI) {
            window.DashMsgUI.renderScreen(mainMenu.title, mainMenu.sections);
            pushNav("main");
        }
    }
    
    /**
     * Toggle preference
     */
    function togglePref(key) {
        if (state.prefs.hasOwnProperty(key)) {
            state.prefs[key] = !state.prefs[key];
            saveState();
            return true;
        }
        return false;
    }
    
    /**
     * Get preference value
     */
    function getPref(key) {
        return state.prefs[key];
    }
    
    /**
     * Set preference value
     */
    function setPref(key, value) {
        state.prefs[key] = value;
        saveState();
    }
    
    /**
     * Public API
     */
    return {
        init,
        state: () => JSON.parse(JSON.stringify(state)),
        defaults: () => JSON.parse(JSON.stringify(defaults)),
        
        // State management
        saveState,
        getPref,
        setPref,
        togglePref,
        
        // Templates
        getTemplate,
        setTemplate,
        resetTemplate,
        renderTemplate,
        
        // Stores
        getStores,
        
        // Messaging
        finishMessage,
        copyToClipboard,
        withEmoji,
        
        // Logging
        logEvent,
        
        // Navigation
        pushNav,
        popNav,
        getNavDepth,
        navStack: () => [...navStack],
        
        // Utilities
        getTesterId,
        getVersions
    };
})();
