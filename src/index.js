const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

let tray;
let mainWindow;
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    icon: `${__dirname}/assets/image/logo.png`,
    name: "Prince527's MC launcher",
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // System Tray
  tray = new Tray(`${__dirname}/assets/image/logo.png`);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show/Hide', click: () => { if (mainWindow.isVisible()) { mainWindow.hide(); } else { mainWindow.show(); } } },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip("Prince527's MC Launcher");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
  
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

ipcMain.handle('hide-app', () => {
  mainWindow.hide();
});


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
