const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require('electron');
const path = require('path');

require('electron-store').initRenderer();

if (require('electron-squirrel-startup')) {
  app.quit();
}

let tray;
let mainWindow;
const createWindow = () => {
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

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.webContents.openDevTools();

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

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('quit-app', () => app.quit());

ipcMain.handle('hide-app', () => mainWindow.hide());

ipcMain.handle("open-file-java", async() => {
  const file = await dialog.showOpenDialog({
    filters: [{
        name: "Java",
        extensions: ["exe"]
    }],
    properties: ["openFile"]
  });
  if (file.canceled) return null;
  return file.filePaths;
});

ipcMain.handle("open-folder-dialog", async() => {
  const files = await dialog.showOpenDialog({
      properties: ['openDirectory']
  });
  if (files.canceled) return null;
  return files.filePaths;
});

ipcMain.handle("login", async() => {
  const msmc = require("msmc");
  try {
    const result = await msmc.fastLaunch("electron", async(update) => {
        console.log("CallBack!!!!!");
        console.log(update);
    });
    if (msmc.errorCheck(result)) return null;
    return msmc.getMCLC().getAuth(result);
  } catch (e) {
    return null;
  }
});

app.on('ready', discordRPC);

async function discordRPC() {
  const check = await mainWindow.webContents.executeJavaScript("localStorage.getItem('rpc')");
  if (!check) return;

  const DiscordRPC = require('discord-rpc');

  const rpc = new DiscordRPC.Client({ transport: 'ipc' });

  async function setActivity() {
    if (!rpc || !mainWindow) return;

    rpc.setActivity({
      details: "A launcher for most of Prince527's MC packs and more!",
      state: "Using the launcher!",
      largeImageKey: 'logo',
      largeImageText: "Prince527's MC launcher",
      smallImageKey: 'circle',
      smallImageText: "Online",
      instance: false,
    });
  }

  rpc.on('ready', () => {
    setActivity();

    setInterval(() => {
      setActivity();
    }, 15e3);
  });

  rpc.login({ clientId: '956921286817378326' }).catch(console.error);
}