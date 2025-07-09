import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  createTab: (url: string) => ipcRenderer.invoke("create-tab", url),
  closeTab: (tabId: number) => ipcRenderer.invoke("close-tab", tabId),
  setActiveTab: (tabId: number) => ipcRenderer.invoke("set-active-tab", tabId),
  getTabs: () => ipcRenderer.invoke("get-tabs"),
  onTabsUpdated: (callback: (tabsData: any[]) => void) => {
    ipcRenderer.on("tabs-updated", (_event, tabsData) => callback(tabsData));
  },
  openTabDevTools: () => ipcRenderer.invoke("open-tab-devtools"),
  openMainDevTools: () => ipcRenderer.invoke("open-main-devtools"),
});
