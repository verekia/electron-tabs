import { app, BrowserWindow, ipcMain, WebContentsView } from "electron";
import type { WebContents } from "electron";
import * as path from "path";

// Default URL for new tabs
const DEFAULT_URL = "http://localhost:5173";

interface Tab {
  id: number;
  view: WebContentsView;
  title: string;
  url: string;
  isActive: boolean;
}

class TabManager {
  private tabs: Map<number, Tab> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private activeTabId: number | null = null;
  private nextTabId = 1;

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  createTab(url: string = DEFAULT_URL, makeActive = true): number {
    if (!this.mainWindow) return -1;

    const tabId = this.nextTabId++;

    // Create a WebContentsView for the new tab
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: true,
      },
    });

    // Set transparent background (WebContentsView defaults to white)
    view.setBackgroundColor("#00000000");

    const tab: Tab = {
      id: tabId,
      view: view,
      title: "New Tab",
      url,
      isActive: makeActive,
    };

    // Handle title updates
    view.webContents.on("page-title-updated", (_: any, title: string) => {
      tab.title = title;
      this.sendTabsUpdate();
    });

    // Handle URL changes
    view.webContents.on("did-navigate", (_: any, navigationUrl: string) => {
      tab.url = navigationUrl;
      this.sendTabsUpdate();
    });

    // Handle new window requests (target="_blank" links)
    view.webContents.setWindowOpenHandler((details: { url: string }) => {
      this.createTab(details.url, true);
      return { action: "deny" };
    });

    // Add context menu for inspect element
    view.webContents.on("context-menu", (event, params) => {
      const { Menu, MenuItem } = require("electron");
      const menu = new Menu();

      menu.append(
        new MenuItem({
          label: "Inspect Element",
          click: () => {
            view.webContents.inspectElement(params.x, params.y);
          },
        })
      );

      menu.append(
        new MenuItem({
          label: "Reload",
          click: () => {
            view.webContents.reload();
          },
        })
      );

      menu.popup();
    });

    this.tabs.set(tabId, tab);

    if (makeActive) {
      this.setActiveTab(tabId);
    }

    // Load the URL
    view.webContents.loadURL(url);

    this.sendTabsUpdate();
    return tabId;
  }

  closeTab(tabId: number) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    // Remove the view from main window if it's active
    if (this.activeTabId === tabId && this.mainWindow) {
      this.mainWindow.contentView.removeChildView(tab.view);
    }

    // Close the webContents (important for memory management)
    tab.view.webContents.close();

    this.tabs.delete(tabId);

    if (this.activeTabId === tabId) {
      // Switch to another tab or create a new default tab if no tabs left
      const remainingTabs = Array.from(this.tabs.keys());
      if (remainingTabs.length > 0) {
        const firstTab = remainingTabs[0];
        if (firstTab !== undefined) {
          this.setActiveTab(firstTab);
        }
      } else {
        // Always keep at least one tab open - create a new default tab
        this.createTab(DEFAULT_URL, true);
        return;
      }
    }

    this.sendTabsUpdate();
  }

  setActiveTab(tabId: number) {
    const tab = this.tabs.get(tabId);
    if (!tab || !this.mainWindow) return;

    // Remove current active tab view if any
    const currentActiveTab = Array.from(this.tabs.values()).find(
      (t) => t.isActive
    );
    if (currentActiveTab) {
      this.mainWindow.contentView.removeChildView(currentActiveTab.view);
    }

    // Deactivate all tabs
    this.tabs.forEach((t) => (t.isActive = false));

    // Activate the selected tab
    tab.isActive = true;
    this.activeTabId = tabId;

    // Add the active tab's view to the main window
    this.mainWindow.contentView.addChildView(tab.view);

    // Position the view below the tab bar
    const bounds = this.mainWindow.getBounds();
    tab.view.setBounds({
      x: 0,
      y: 40,
      width: bounds.width,
      height: bounds.height - 40,
    });

    this.sendTabsUpdate();
  }

  private sendTabsUpdate() {
    if (!this.mainWindow) return;

    const tabsData = Array.from(this.tabs.values()).map((tab) => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      isActive: tab.isActive,
    }));

    this.mainWindow.webContents.send("tabs-updated", tabsData);
  }

  getTabs() {
    return Array.from(this.tabs.values());
  }

  // Helper method to handle window resize for active tab
  handleWindowResize() {
    if (!this.mainWindow || !this.activeTabId) return;

    const activeTab = this.tabs.get(this.activeTabId);
    if (!activeTab) return;

    const bounds = this.mainWindow.getBounds();
    activeTab.view.setBounds({
      x: 0,
      y: 40,
      width: bounds.width,
      height: bounds.height - 40,
    });
  }
}

const tabManager = new TabManager();

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      devTools: true,
    },
  });

  tabManager.setMainWindow(win);

  // Load the tab manager UI first
  win.loadFile("src/renderer/index.html");

  // Add context menu for main window (tab bar area)
  win.webContents.on("context-menu", (event, params) => {
    const { Menu, MenuItem } = require("electron");
    const menu = new Menu();

    menu.append(
      new MenuItem({
        label: "Inspect Element (Tab Bar)",
        click: () => {
          win.webContents.inspectElement(params.x, params.y);
        },
      })
    );

    menu.append(
      new MenuItem({
        label: "Open DevTools",
        click: () => {
          win.webContents.openDevTools();
        },
      })
    );

    menu.popup();
  });

  // Create the first tab
  win.webContents.once("did-finish-load", () => {
    tabManager.createTab();
  });

  // Enable DevTools shortcuts
  win.webContents.on("before-input-event", (event, input) => {
    // Cmd+Option+I or F12 for main window DevTools (tab bar)
    if ((input.meta && input.alt && input.key === "i") || input.key === "F12") {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
    // Cmd+Option+J for active tab DevTools
    if (input.meta && input.alt && input.key === "j") {
      const activeTab = Array.from(tabManager.getTabs()).find(
        (tab) => tab.isActive
      );
      if (activeTab) {
        activeTab.view.webContents.toggleDevTools();
        event.preventDefault();
      }
    }
  });

  // Handle window resize to update active tab bounds
  win.on("resize", () => {
    tabManager.handleWindowResize();
  });
};

// IPC handlers for tab management
ipcMain.handle("create-tab", (_, url?: string) => {
  return tabManager.createTab(url);
});

ipcMain.handle("close-tab", (_, tabId: number) => {
  tabManager.closeTab(tabId);
});

ipcMain.handle("set-active-tab", (_, tabId: number) => {
  tabManager.setActiveTab(tabId);
});

ipcMain.handle("get-tabs", () => {
  return tabManager.getTabs();
});

// DevTools IPC handlers
ipcMain.handle("open-tab-devtools", () => {
  const activeTab = Array.from(tabManager.getTabs()).find(
    (tab) => tab.isActive
  );
  if (activeTab) {
    activeTab.view.webContents.openDevTools();
  }
});

ipcMain.handle("open-main-devtools", () => {
  const mainWindow = BrowserWindow.getFocusedWindow();
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
  }
});

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
