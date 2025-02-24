const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const fs = require('fs');
const cors = require('cors');

let mainWindow;

// Calculate relative path to the "book" folder
const baseBook = path.join(__dirname, '../../../book');

function scanDirTree(dirPath) {
  const nodes = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        type: 'directory',
        children: scanDirTree(fullPath)
      });
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      const relativePath = path.relative(baseBook, fullPath);
      nodes.push({
        name: entry.name,
        type: 'file',
        url: `http://localhost:3001/${relativePath}`
      });
    }
  }
  return nodes;
}

function createLocalServer() {
  const expApp = express();
  expApp.use(cors());

  // Serve your book folder using the relative path
  expApp.use('/', express.static(baseBook));

  // /list endpoint returns nested JSON tree of .md files
  expApp.get('/list', (req, res) => {
    const tree = scanDirTree(baseBook);
    res.json(tree);
  });

  expApp.listen(3001, () => {
    console.log('Book server at http://localhost:3001');
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the correct URL based on your environment
  mainWindow.loadURL('http://localhost:4200');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createLocalServer();
  createWindow();
});

// IPC handler to open the OS file dialog
ipcMain.handle('open-file-dialog', async () => {
  if (!mainWindow) return [];

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Markdown Files', extensions: ['md'] }],
    defaultPath: baseBook // Use the relative path here
  });

  if (result.canceled || result.filePaths.length === 0) {
    return [];
  }

  const fullPath = result.filePaths[0];

  // Ensure the selected file is inside the book folder
  if (!fullPath.startsWith(baseBook)) {
    return [];
  }

  const relPath = path.relative(baseBook, fullPath);
  const fileUrl = `http://localhost:3001/${relPath}`;
  return [fileUrl];
});
