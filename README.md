# Electron Tabs

A simple Electron application with tab management that handles `target="_blank"` links by opening them in new tabs within the same window.

## Features

- ✅ Tab system within a single Electron window
- ✅ Automatic handling of `target="_blank"` links (opens in new tabs instead of new windows)
- ✅ Clean, modern UI with tab bar
- ✅ Tab switching, closing, and creation
- ✅ Secure IPC communication using preload scripts
- ✅ TypeScript implementation with modern syntax

## How It Works

### Tab Management

- Each tab is implemented as a hidden `BrowserWindow`
- The active tab window is shown and positioned below the tab bar (40px offset)
- Inactive tabs are hidden but remain loaded in memory
- The main window displays a tab bar UI that controls which tab is visible

### Target="\_blank" Link Handling

- Uses `setWindowOpenHandler` to intercept `target="_blank"` link clicks
- Instead of opening a new window, creates a new tab with the target URL
- Automatically switches to the newly created tab

### Architecture

- **Main Process** (`src/index.ts`): Manages tab windows and IPC communication
- **Preload Script** (`src/preload.ts`): Secure bridge between renderer and main process
- **Renderer** (`src/renderer/index.html`): Tab bar UI and user interactions

## Usage

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the TypeScript code:

   ```bash
   npm run build
   ```

3. Start the application:

   ```bash
   npm start
   ```

4. **Using Tabs:**
   - Click the "+" button to create a new tab
   - Click on any tab to switch to it
   - Click the "×" on a tab to close it
   - Any `target="_blank"` links will automatically open in new tabs

## Development

- Use `npm run dev` to watch for TypeScript changes during development
- The app loads `http://localhost:5173` by default (you can change this in `src/index.ts`)

## Tech Stack

- **Electron** ^33.0.0
- **TypeScript** ^5
- **Modern ES6+** syntax (arrow functions, const, no semicolons)
- **Secure IPC** via preload scripts
