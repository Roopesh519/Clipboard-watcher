const { app, BrowserWindow, Tray, Menu, clipboard, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const notifier = require('node-notifier');

let tray = null;
let mainWindow = null;
let clipboardHistory = [];
let lastText = '';
const blockedKeywords = ['gdlaioqeyruewfwdhowe'];
const logFile = path.join(app.getPath('userData'), 'clipboard-log.txt'); // Updated path

// Create the main window to show clipboard history
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  mainWindow.loadFile('index.html');
}

// Create system tray with menu
function createTray() {
  tray = new Tray(path.join(__dirname, 'tray.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Clipboard History', click: createWindow },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('Clipboard Watcher');
  tray.setContextMenu(contextMenu);
}

// Log clipboard content to file with improved error handling
function logClipboard(text) {
  fs.appendFile(logFile, `${new Date().toISOString()} - ${text}\n`, err => {
    if (err) {
      console.error('Failed to write log:', err);
      // Try creating directory if it doesn't exist
      fs.mkdir(path.dirname(logFile), { recursive: true }, (mkdirErr) => {
        if (!mkdirErr) {
          fs.appendFile(logFile, `${new Date().toISOString()} - ${text}\n`, (retryErr) => {
            if (retryErr) console.error('Retry failed:', retryErr);
          });
        }
      });
    }
  });
}

// Watch clipboard every second
function startClipboardWatcher() {
  setInterval(() => {
    try {
      const text = clipboard.readText();
      if (text && text !== lastText) {
        if (blockedKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
          clipboard.writeText('');
          notifier.notify({
            title: '⛔ Blocked!',
            message: 'Sensitive content detected. Copy blocked.',
          });
          return;
        }

        lastText = text;
        clipboardHistory.unshift(text);
        clipboardHistory = clipboardHistory.slice(0, 50); // keep last 50

        logClipboard(text);
        checkLogSize(); // Added log rotation check
      }
    } catch (err) {
      console.error('❌ Failed to read clipboard:', err);
    }
  }, 1000);
}

// Handle log file rotation
function checkLogSize() {
  fs.stat(logFile, (err, stats) => {
    if (!err && stats.size > 1024 * 1024) { // If > 1MB
      const rotatedFile = logFile + '.' + new Date().toISOString().replace(/[:.]/g, '-');
      fs.rename(logFile, rotatedFile, (renameErr) => {
        if (renameErr) {
          console.error('Failed to rotate log:', renameErr);
        } else {
          fs.writeFile(logFile, 'Log rotated at ' + new Date().toISOString() + '\n', () => {});
        }
      });
    }
  });
}

// Handle renderer request for clipboard history
ipcMain.on('get-clipboard-history', (event) => {
  event.reply('clipboard-history', clipboardHistory);
});

ipcMain.on('clear-clipboard-history', () => {
  clipboardHistory = [];
  fs.appendFile(logFile, `\n--- History cleared at ${new Date().toISOString()} ---\n`, (err) => {
    if (err) console.error('Failed to write clear log:', err);
  });
});

// App ready
app.whenReady().then(() => {
  createTray();
  startClipboardWatcher();
});

app.on('window-all-closed', () => {
  // Keep app running in tray even if all windows are closed
});