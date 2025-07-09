import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import TabManager from "./TabManager";

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
