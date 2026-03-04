/**
 * DashMsg Menu Definitions
 *
 * Clean, minimal, enterprise-grade menu structure.
 * Navigation philosophy:
 *
 * Home = global reset
 * Back = step back
 * Actions = execute template/function
 */

const DashMsgMenus = {

  /* -------------------------
     MAIN
  -------------------------- */

  main: {
    title: "DashMsg",
    sections: [
      {
        items: [
          { label: "Pickup", more: true, action: { type: "nav", screen: "pickup" } },
          { label: "En Route", more: true, action: { type: "nav", screen: "enroute" } },
          { label: "Shopping", more: true, action: { type: "nav", screen: "shopping" } },
          { label: "Delivered", more: true, action: { type: "nav", screen: "delivered" } }
        ]
      },
      {
        items: [
          { label: "Settings", more: true, action: { type: "nav", screen: "settings" } }
        ]
      }
    ]
  },


  /* -------------------------
     PICKUP
  -------------------------- */

  pickup: {
    title: "Pickup",
    sections: [

      {
        header: "Status",
        items: [
          { label: "Arrived — Working", action: { type: "template", key: "ARRIVED_WORKING", category: "Pickup" } },
          { label: "Arrived — Few Minutes", action: { type: "template", key: "ARRIVED_FEW_MINUTES", category: "Pickup" } }
        ]
      },

      {
        header: "Stacked Orders",
        items: [
          { label: "1 Stop Ahead", more: true, action: { type: "nav", screen: "stops_1" } },
          { label: "2 Stops Ahead", more: true, action: { type: "nav", screen: "stops_2" } }
        ]
      },

      {
        items: [
          { label: "Back", class: "back", action: { type: "navBack" } }
        ]
      }

    ]
  },


  /* -------------------------
     ONE STOP
  -------------------------- */

  stops_1: {
    title: "1 Stop Ahead",
    sections: [

      {
        header: "Hot Bag",
        items: [
          {
            label: "Using Hot Bag",
            action: {
              type: "template",
              key: "STOPS_ONE_HOTBAG",
              category: "Pickup",
              extras: { stops: 1, used_hotbag: 1 }
            }
          },

          {
            label: "No Hot Bag",
            action: {
              type: "template",
              key: "STOPS_ONE_NOHOTBAG",
              category: "Pickup",
              extras: { stops: 1, used_hotbag: 0 }
            }
          }
        ]
      },

      {
        items: [
          { label: "Back", class: "back", action: { type: "navBack" } }
        ]
      }

    ]
  },


  /* -------------------------
     TWO STOPS
  -------------------------- */

  stops_2: {
    title: "2 Stops Ahead",
    sections: [

      {
        header: "Hot Bag",
        items: [

          {
            label: "Using Hot Bag",
            action: {
              type: "template",
              key: "STOPS_COUPLE_HOTBAG",
              category: "Pickup",
              extras: { stops: 2, used_hotbag: 1 }
            }
          },

          {
            label: "No Hot Bag",
            action: {
              type: "template",
              key: "STOPS_COUPLE_NOHOTBAG",
              category: "Pickup",
              extras: { stops: 2, used_hotbag: 0 }
            }
          }

        ]
      },

      {
        items: [
          { label: "Back", class: "back", action: { type: "navBack" } }
        ]
      }

    ]
  },


  /* -------------------------
     EN ROUTE
  -------------------------- */

  enroute: {
    title: "En Route",
    sections: [

      {
        items: [
          { label: "Heading Your Way", action: { type: "template", key: "HEADING_NO_ETA", category: "Delivery" } },

          { label: "Heading With ETA", action: { type: "function", handler: "DashMsgUI.setETA()" } },

          { label: "Traffic Delay", action: { type: "template", key: "TRAFFIC_DELAY", category: "Delivery" } }
        ]
      },

      {
        items: [
          { label: "Back", class: "back", action: { type: "navBack" } }
        ]
      }

    ]
  },


  /* -------------------------
     SHOPPING
  -------------------------- */

  shopping: {
    title: "Shopping",
    sections: [

      {
        header: "Select Store",
        items: [] // dynamically populated
      },

      {
        items: [
          { label: "Back", class: "back", action: { type: "navBack" } }
        ]
      }

    ]
  },


  /* -------------------------
     DELIVERED
  -------------------------- */

  delivered: {
    title: "Delivered",
    sections: [

      {
        header: "Completion",
        items: [
          { label: "Food Delivered", action: { type: "template", key: "DELIVERED_FOOD", category: "Delivery" } },
          { label: "Send Thanks", action: { type: "template", key: "THANKS", category: "Delivery" } }
        ]
      },

      {
        items: [
          { label: "Back", class: "back", action: { type: "navBack" } }
        ]
      }

    ]
  },


  /* -------------------------
     SETTINGS
  -------------------------- */

  settings: {
    title: "Settings",
    sections: [

      {
        header: "Preferences",
        items: [
          { label: "Emoji", more: true, action: { type: "nav", screen: "pref_emoji" } },
          { label: "Name Prompt", more: true, action: { type: "nav", screen: "pref_name" } }
        ]
      },

      {
        header: "Customization",
        items: [
          { label: "Edit Templates", more: true, action: { type: "function", handler: "DashMsgEditors.showTemplateEditor()" } },
          { label: "Manage Stores", more: true, action: { type: "function", handler: "DashMsgEditors.showStoreEditor()" } }
        ]
      },

      {
        header: "System",
        items: [
          { label: "Reset All Data", class: "destructive", action: { type: "function", handler: "DashMsgEditors.resetAll()" } }
        ]
      },

      {
        items: [
          { label: "Back", class: "back", action: { type: "navBack" } }
        ]
      }

    ]
  },


  /* -------------------------
     EMOJI PREF
  -------------------------- */

  pref_emoji: {
    title: "Emoji",
    sections: [

      {
        items: [
          { label: "Enabled", action: { type: "function", handler: "DashMsg.setPref('emoji_on', true); DashMsgUI.navigateTo('pref_emoji');" } },
          { label: "Disabled", action: { type: "function", handler: "DashMsg.setPref('emoji_on', false); DashMsgUI.navigateTo('pref_emoji');" } }
        ]
      },

      {
        items: [
          { label: "Back", class: "back", action: { type: "navBack" } }
        ]
      }

    ]
  },


  /* -------------------------
     NAME PROMPT PREF
  -------------------------- */

  pref_name: {
    title: "Name Prompt",
    sections: [

      {
        items: [
          { label: "Enabled", action: { type: "function", handler: "DashMsg.setPref('name_prompt', true); DashMsgUI.navigateTo('pref_name');" } },
          { label: "Disabled", action: { type: "function", handler: "DashMsg.setPref('name_prompt', false); DashMsgUI.navigateTo('pref_name');" } }
        ]
      },

      {
        items: [
          { label: "Back", class: "back", action: { type: "navBack" } }
        ]
      }

    ]
  }

};

window.DashMsgMenus = DashMsgMenus;