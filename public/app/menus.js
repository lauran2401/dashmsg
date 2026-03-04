/**
 * DashMsg Menu Definitions
 * 
 * Defines the menu tree and navigation structure
 * Each menu has: title, sections with items
 * Items can trigger templates, navigate, or call functions
 */

const DashMsgMenus = {
    /**
     * Main Menu
     */
    main: {
        title: "DashMsg",
        sections: [
            {
                items: [
                    {
                        label: "Pickup",
                        more: true,
                        action: { type: "nav", screen: "pickup" }
                    },
                    {
                        label: "En Route",
                        more: true,
                        action: { type: "nav", screen: "enroute" }
                    },
                    {
                        label: "Shopping",
                        more: true,
                        action: { type: "nav", screen: "shopping" }
                    },
                    {
                        label: "Delivered",
                        more: true,
                        action: { type: "nav", screen: "delivered" }
                    }
                ]
            },
            {
                items: [
                    {
                        label: "Settings",
                        more: true,
                        action: { type: "nav", screen: "settings" }
                    }
                ]
            }
        ]
    },

    /**
     * Pickup Status Menu
     */
    pickup: {
        title: "Pickup",
        sections: [
            {
                header: "Status",
                items: [
                    {
                        label: "Arrived - Working",
                        action: { type: "template", key: "ARRIVED_WORKING", category: "Pickup" }
                    },
                    {
                        label: "Arrived - Few Minutes",
                        action: { type: "template", key: "ARRIVED_FEW_MINUTES", category: "Pickup" }
                    }
                ]
            },
            {
                header: "Stacked Orders",
                items: [
                    {
                        label: "1 Stop Ahead",
                        more: true,
                        action: { type: "nav", screen: "stops_1" }
                    },
                    {
                        label: "2 Stops Ahead",
                        more: true,
                        action: { type: "nav", screen: "stops_2" }
                    }
                ]
            },
            {
                items: [
                    {
                        label: "Back",
                        class: "back",
                        action: { type: "navBack" }
                    }
                ]
            }
        ]
    },

    /**
     * Single Stop Menu
     */
    stops_1: {
        title: "1 Stop",
        sections: [
            {
                header: "Hot Bag?",
                items: [
                    {
                        label: "Use Hot Bag",
                        action: {
                            type: "template",
                            key: "STOPS_ONE_HOTBAG",
                            category: "Pickup",
                            extras: { used_hotbag: 1, stops: 1 }
                        }
                    },
                    {
                        label: "No Hot Bag",
                        action: {
                            type: "template",
                            key: "STOPS_ONE_NOHOTBAG",
                            category: "Pickup",
                            extras: { used_hotbag: 0, stops: 1 }
                        }
                    }
                ]
            },
            {
                items: [
                    {
                        label: "Back",
                        class: "back",
                        action: { type: "navBack" }
                    }
                ]
            }
        ]
    },

    /**
     * Multiple Stops Menu
     */
    stops_2: {
        title: "2 Stops",
        sections: [
            {
                header: "Hot Bag?",
                items: [
                    {
                        label: "Use Hot Bag",
                        action: {
                            type: "template",
                            key: "STOPS_COUPLE_HOTBAG",
                            category: "Pickup",
                            extras: { used_hotbag: 1, stops: 2 }
                        }
                    },
                    {
                        label: "No Hot Bag",
                        action: {
                            type: "template",
                            key: "STOPS_COUPLE_NOHOTBAG",
                            category: "Pickup",
                            extras: { used_hotbag: 0, stops: 2 }
                        }
                    }
                ]
            },
            {
                items: [
                    {
                        label: "Back",
                        class: "back",
                        action: { type: "navBack" }
                    }
                ]
            }
        ]
    },

    /**
     * En Route Menu
     */
    enroute: {
        title: "En Route",
        sections: [
            {
                items: [
                    {
                        label: "Heading Your Way",
                        action: { type: "template", key: "HEADING_NO_ETA", category: "Delivery" }
                    },
                    {
                        label: "Heading (Set ETA)",
                        action: { type: "function", handler: "DashMsgUI.setETA()" }
                    },
                    {
                        label: "Traffic Delay",
                        action: { type: "template", key: "TRAFFIC_DELAY", category: "Delivery" }
                    }
                ]
            },
            {
                items: [
                    {
                        label: "Back",
                        class: "back",
                        action: { type: "navBack" }
                    }
                ]
            }
        ]
    },

    /**
     * Shopping Menu
     */
    shopping: {
        title: "Shopping",
        sections: [
            {
                header: "Select Store",
                items: [] // Populated dynamically by UI
            },
            {
                items: [
                    {
                        label: "Back",
                        class: "back",
                        action: { type: "navBack" }
                    }
                ]
            }
        ]
    },

    /**
     * Delivered Menu
     */
    delivered: {
        title: "Delivered",
        sections: [
            {
                header: "Complete",
                items: [
                    {
                        label: "Food Delivered",
                        action: { type: "template", key: "DELIVERED_FOOD", category: "Delivery" }
                    },
                    {
                        label: "Thank You Only",
                        action: { type: "template", key: "THANKS", category: "Delivery" }
                    }
                ]
            },
            {
                items: [
                    {
                        label: "Back",
                        class: "back",
                        action: { type: "navBack" }
                    }
                ]
            }
        ]
    },

    /**
     * Settings Menu
     */
    settings: {
        title: "Settings",
        sections: [
            {
                header: "Preferences",
                items: [
                    {
                        label: "Emojis",
                        more: true,
                        action: { type: "nav", screen: "pref_emoji" }
                    },
                    {
                        label: "Name Prompt",
                        more: true,
                        action: { type: "nav", screen: "pref_name" }
                    }
                ]
            },
            {
                header: "Customization",
                items: [
                    {
                        label: "Edit Templates",
                        more: true,
                        action: { type: "function", handler: "DashMsgEditors.showTemplateEditor()" }
                    },
                    {
                        label: "Manage Stores",
                        more: true,
                        action: { type: "function", handler: "DashMsgEditors.showStoreEditor()" }
                    }
                ]
            },
            {
                header: "Reset",
                items: [
                    {
                        label: "Reset All Data",
                        class: "destructive",
                        action: { type: "function", handler: "DashMsgEditors.resetAll()" }
                    }
                ]
            },
            {
                items: [
                    {
                        label: "Back",
                        class: "back",
                        action: { type: "navBack" }
                    }
                ]
            }
        ]
    },

    /**
     * Preference Menus
     */
    pref_emoji: {
        title: "Emojis",
        sections: [
            {
                items: [
                    {
                        label: "ON",
                        action: { type: "function", handler: "DashMsg.setPref('emoji_on', true); DashMsg.pushNav('pref_emoji'); DashMsgUI.navigateTo('pref_emoji');" }
                    },
                    {
                        label: "OFF",
                        action: { type: "function", handler: "DashMsg.setPref('emoji_on', false); DashMsg.pushNav('pref_emoji'); DashMsgUI.navigateTo('pref_emoji');" }
                    }
                ]
            },
            {
                items: [
                    {
                        label: "Back",
                        class: "back",
                        action: { type: "navBack" }
                    }
                ]
            }
        ]
    },

    pref_name: {
        title: "Name Prompt",
        sections: [
            {
                items: [
                    {
                        label: "ON",
                        action: { type: "function", handler: "DashMsg.setPref('name_prompt', true); DashMsg.pushNav('pref_name'); DashMsgUI.navigateTo('pref_name');" }
                    },
                    {
                        label: "OFF",
                        action: { type: "function", handler: "DashMsg.setPref('name_prompt', false); DashMsg.pushNav('pref_name'); DashMsgUI.navigateTo('pref_name');" }
                    }
                ]
            },
            {
                items: [
                    {
                        label: "Back",
                        class: "back",
                        action: { type: "navBack" }
                    }
                ]
            }
        ]
    }
};
