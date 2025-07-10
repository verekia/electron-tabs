import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import TabManager from './TabManager'

const tabManager = new TabManager()

const main = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
    },
  })

  tabManager.setMainWindow(win)

  win.loadFile('src/renderer/index.html')
  win.webContents.once('did-finish-load', () => tabManager.createTab())
  win.on('resize', () => tabManager.handleWindowResize())
}

ipcMain.handle('get-tabs', () => tabManager.getTabs())
ipcMain.handle('create-tab', (_, url?: string) => tabManager.createTab(url))
ipcMain.handle('close-tab', (_, id: number) => tabManager.closeTab(id))
ipcMain.handle('set-active-tab', (_, id: number) => tabManager.setActiveTab(id))

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    main()
  }
})

app.whenReady().then(main)
