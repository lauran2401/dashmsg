/**
 * DashMsg UI Rendering System
 *
 * Responsibilities:
 * - Generate HTML from menu definitions
 * - Attach click handlers to buttons
 * - Manage the app container
 * - Show copy preview banner
 * - Navigation handling
 */

const DashMsgUI = (() => {

    const app = document.getElementById("app");

    if (!app) {
        console.error("DashMsgUI: #app container missing");
    }

    /**
     * Show green copied banner
     */
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
                `<div style="font-size:11px;text-transform:uppercase;margin-bottom:4px;opacity:.85">
                    Copied
                 </div>
                 <div id="preview-text"></div>`;

            document.body.prepend(banner);

            txt = document.getElementById("preview-text");
        }

        txt.textContent = text;
        banner.style.display = "block";

        setTimeout(() => {
            banner.style.display = "none";
        }, 2200);
    }


    /**
     * Render screen
     */
    function renderScreen(title, sections) {

        let html = `
        <div class="topbar">
            <button class="home-btn" onclick="DashMsgUI.goHome()">Home</button>
            <h1>${escapeHtml(title)}</h1>
        </div>
        `;

        sections.forEach(section => {

            if (section.header) {
                html += `<div class="menu-title">${escapeHtml(section.header)}</div>`;
            }

            html += `<div class="list">`;

            section.items.forEach((item, index) => {

                const itemClass = item.class ? ` ${item.class}` : "";
                const more = item.more ? `<span>›</span>` : `<span></span>`;

                const onClick = generateActionHandler(item);

                html += `
                <button class="row${itemClass}" onclick="${onClick}">
                    ${escapeHtml(item.label)}
                    ${more}
                </button>
                `;
            });

            html += `</div>`;
        });

        if (app) app.innerHTML = html;
    }


    /**
     * Generate click handler
     */
    function generateActionHandler(item) {

        if (item.action) {

            switch (item.action.type) {

                case "template":
                    return `DashMsgUI.useTemplate('${item.action.key}','${item.action.category || ""}',${JSON.stringify(item.action.extras || {})})`;

                case "nav":
                    return `DashMsgUI.navigateTo('${item.action.screen}')`;

                case "navBack":
                    return `DashMsgUI.navBack()`;

                case "cancel":
                    return `DashMsg.exitApp()`;

                case "function":
                    return item.action.handler || "";

            }
        }

        if (item.click) return item.click;

        return "";
    }


    /**
     * Escape HTML
     */
    function escapeHtml(text) {

        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }


    /**
     * Use template
     */
    function useTemplate(key, category = "", extras = {}) {

        const template = DashMsg.getTemplate(key);

        if (!template) {
            console.error("Template not found:", key);
            return;
        }

        DashMsg.finishMessage(template, key, category || "Message", extras);
    }


    /**
     * Navigate to screen
     */
    function navigateTo(screenName) {

        const menu = DashMsgMenus?.[screenName];

        if (!menu) {
            console.error("Menu not found:", screenName);
            return;
        }

        DashMsg.pushNav(screenName);

        renderScreen(menu.title, menu.sections);
    }


    /**
     * Go home
     */
    function goHome() {

        const main = DashMsgMenus?.main;

        if (!main) return;

        DashMsg.pushNav("main");

        renderScreen(main.title, main.sections);
    }


    /**
     * Navigate back
     */
    function navBack() {

        DashMsg.popNav();

        const stack = DashMsg.navStack();

        if (stack.length === 0) {
            goHome();
            return;
        }

        const screen = stack[stack.length - 1];
        const menu = DashMsgMenus?.[screen];

        if (menu) {
            renderScreen(menu.title, menu.sections);
        }
    }


    /**
     * ETA prompt
     */
    function setETA() {

        const eta = prompt("ETA? (example: 5 min)");

        if (!eta) return;

        const template =
            DashMsg.renderTemplate(
                DashMsg.getTemplate("HEADING_WITH_ETA"),
                { ETA: eta }
            );

        DashMsg.finishMessage(
            template,
            "HEADING_WITH_ETA",
            "Delivery",
            { used_eta: 1 }
        );
    }


    /**
     * Populate shopping menu dynamically
     */
    function populateShoppingMenu() {

        const stores = DashMsg.getStores();
        const shoppingMenu = DashMsgMenus.shopping;

        if (!shoppingMenu) return;

        shoppingMenu.sections[0].items = [];

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


    return {
        renderScreen,
        showCopied,
        useTemplate,
        navigateTo,
        navBack,
        goHome,
        setETA,
        populateShoppingMenu,
        escapeHtml
    };

})();

window.DashMsgUI = DashMsgUI;