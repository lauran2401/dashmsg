/**
 * DashMsg UI Rendering System
 * 
 * Responsibilities:
 * - Generate HTML from menu definitions
 * - Attach click handlers to buttons
 * - Manage the app container
 * - Call DashMsg actions
 */

const DashMsgUI = (() => {
    const app = document.getElementById('app');
    
    if (!app) {
        console.error("No #app element found in DOM");
    }
    
    /**
     * Render a screen with title and sections
     * 
     * sections format:
     * [
     *   {
     *     header: "Status",
     *     items: [
     *       {
     *         label: "Arrived - Working",
     *         action: { type: "template", key: "ARRIVED_WORKING" }
     *       },
     *       {
     *         label: "Back",
     *         action: { type: "nav", screen: "main" }
     *       }
     *     ]
     *   }
     * ]
     */
    function renderScreen(title, sections) {
        let html = `<h1>${escapeHtml(title)}</h1>`;
        
        sections.forEach(section => {
            // Section header (optional)
            if (section.header) {
                html += `<div class="menu-title">${escapeHtml(section.header)}</div>`;
            }
            
            // Items list
            if (section.items && section.items.length > 0) {
                html += `<div class="list">`;
                
                section.items.forEach((item, index) => {
                    const isLast = index === section.items.length - 1;
                    const itemClass = item.class ? ` ${item.class}` : '';
                    const more = item.more ? '<span>›</span>' : '<span></span>';
                    
                    // Generate appropriate onclick handler
                    let onClickCode = generateActionHandler(item);
                    
                    html += `<button class="row${itemClass}" onclick="${onClickCode}">${escapeHtml(item.label)} ${more}</button>`;
                });
                
                html += `</div>`;
            }
        });
        
        if (app) {
            app.innerHTML = html;
        }
    }
    
    /**
     * Generate onclick handler code for an item
     */
    function generateActionHandler(item) {
        if (item.action) {
            switch (item.action.type) {
                case 'template':
                    return `DashMsgUI.useTemplate('${item.action.key}', '${item.action.category || ''}', ${JSON.stringify(item.action.extras || {})})`;
                case 'nav':
                    return `DashMsgUI.navigateTo('${item.action.screen}')`;
                case 'navBack':
                    return `DashMsgUI.navBack()`;
                case 'function':
                    return item.action.handler || '';
                default:
                    return '';
            }
        }
        
        // Fallback to custom click if provided
        if (item.click) {
            return item.click;
        }
        
        return '';
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Use a template and finish the message
     */
    function useTemplate(key, category = '', extras = {}) {
        const template = DashMsg.getTemplate(key);
        if (!template) {
            console.error(`Template ${key} not found`);
            return;
        }
        
        DashMsg.finishMessage(template, key, category || 'Message', extras);
    }
    
    /**
     * Navigate to a menu screen
     */
    function navigateTo(screenName) {
        const menu = DashMsgMenus?.[screenName];
        if (menu) {
            DashMsg.pushNav(screenName);
            renderScreen(menu.title, menu.sections);
        } else {
            console.error(`Menu screen "${screenName}" not found`);
        }
    }
    
    /**
     * Navigate back using nav stack
     */
    function navBack() {
        DashMsg.popNav();
        const navStack = DashMsg.navStack();
        
        if (navStack.length > 0) {
            const currentScreen = navStack[navStack.length - 1];
            const menu = DashMsgMenus?.[currentScreen];
            if (menu) {
                renderScreen(menu.title, menu.sections);
            }
        }
    }
    
    /**
     * Handle ETA input and finish message
     */
    function setETA() {
        const eta = prompt("ETA? (e.g. 5 mins)");
        if (eta) {
            const template = DashMsg.renderTemplate(DashMsg.getTemplate('HEADING_WITH_ETA'), {ETA: eta});
            DashMsg.finishMessage(template, 'HEADING_WITH_ETA', 'Delivery', {used_eta: 1});
        }
    }
    
    /**
     * Dynamically populate shopping stores
     */
    function populateShoppingMenu() {
        const stores = DashMsg.getStores();
        const shoppingMenu = DashMsgMenus.shopping;
        
        // Clear existing items
        shoppingMenu.sections[0].items = [];
        
        // Add store items
        stores.forEach(store => {
            shoppingMenu.sections[0].items.push({
                label: store,
                action: {
                    type: "template",
                    key: "SHOP_SINGLE",
                    category: "Shopping",
                    extras: { store: store }
                }
            });
        });
    }
    
    /**
     * Public API
     */
    return {
        renderScreen,
        useTemplate,
        navigateTo,
        navBack,
        setETA,
        populateShoppingMenu,
        escapeHtml
    };
})();

window.DashMsgUI = DashMsgUI;
