export interface IElectronAPI {
  createTab: (url: string) => Promise<number>;
  closeTab: (tabId: number) => Promise<void>;
  setActiveTab: (tabId: number) => Promise<void>;
  getTabs: () => Promise<Tab[]>;
  onTabsUpdated: (callback: (tabsData: Tab[]) => void) => void;
}

interface Tab {
  id: number;
  title: string;
  url: string;
  isActive: boolean;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
