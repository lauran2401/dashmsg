const DashMsgMenus = {
  main: {
    title: "DashMsg",
    sections: [
      {
        items: [
          { label: "Pickup", more: true, action: { type: "nav", screen: "pickup" } },
          { label: "On the Way", more: true, action: { type: "nav", screen: "enroute" } },
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

  pickup: {
    title: "Pickup",
    sections: [
      {
        header: "Status",
        items: [
          { label: "Arrived — Working", action: { type: "template", key: "ARRIVED_WORKING", category: "Pickup", extras: {} } },
          { label: "Arrived — Few Minutes", action: { type: "template", key: "ARRIVED_FEW_MINUTES", category: "Pickup", extras: {} } }
        ]
      },
      {
        header: "Stops",
        items: [
          { label: "1 Stop Ahead", more: true, action: { type: "nav", screen: "stops_1" } },
          { label: "2 Stops Ahead", more: true, action: { type: "nav", screen: "stops_2" } }
        ]
      }
    ]
  },

  stops_1: {
    title: "1 Stop Ahead",
    sections: [
      {
        header: "Hot Bag",
        items: [
          { label: "Use Hot Bag", action: { type: "template", key: "STOPS_ONE_HOTBAG", category: "Pickup", extras: { stops: 1, used_hotbag: 1 } } },
          { label: "No Hot Bag", action: { type: "template", key: "STOPS_ONE_NOHOTBAG", category: "Pickup", extras: { stops: 1, used_hotbag: 0 } } }
        ]
      }
    ]
  },

  stops_2: {
    title: "2 Stops Ahead",
    sections: [
      {
        header: "Hot Bag",
        items: [
          { label: "Use Hot Bag", action: { type: "template", key: "STOPS_COUPLE_HOTBAG", category: "Pickup", extras: { stops: 2, used_hotbag: 1 } } },
          { label: "No Hot Bag", action: { type: "template", key: "STOPS_COUPLE_NOHOTBAG", category: "Pickup", extras: { stops: 2, used_hotbag: 0 } } }
        ]
      }
    ]
  },

  enroute: {
    title: "On the Way",
    sections: [
      {
        items: [
          { label: "Heading Your Way", action: { type: "template", key: "HEADING_NO_ETA", category: "Delivery", extras: {} } },
          { label: "Heading With ETA", action: { type: "function", name: "setETA" } },
          { label: "Traffic Delay", action: { type: "template", key: "TRAFFIC_DELAY", category: "Delivery", extras: {} } }
        ]
      }
    ]
  },

  shopping: {
    title: "Shopping",
    sections: [
      { header: "Select Store", items: [] }
    ]
  },

  delivered: {
    title: "Delivered",
    sections: [
      {
        items: [
          { label: "Food Delivered", action: { type: "template", key: "DELIVERED_FOOD", category: "Delivery", extras: {} } },
          { label: "Send Thanks", action: { type: "template", key: "THANKS", category: "Delivery", extras: {} } }
        ]
      }
    ]
  },

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
          { label: "Edit Templates", more: true, action: { type: "function", name: "showTemplateEditor" } },
          { label: "Manage Stores", more: true, action: { type: "function", name: "showStoreEditor" } }
        ]
      },
      {
        header: "Tester",
        items: [
          { label: "Beta", more: true, action: { type: "function", name: "openBeta" } },
          { label: "Reset All Data", class: "destructive", action: { type: "function", name: "resetAll" } }
        ]
      }
    ]
  },

  pref_emoji: {
    title: "Emoji",
    sections: [
      {
        items: [
          { label: "ON", action: { type: "function", name: "setEmojiOn" } },
          { label: "OFF", action: { type: "function", name: "setEmojiOff" } }
        ]
      }
    ]
  }
};

window.DashMsgMenus = DashMsgMenus;
