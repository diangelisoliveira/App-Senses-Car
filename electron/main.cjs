const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
let mainWindow = null;
let updateCheckInFlight = false;
let updateInterval = null;
let updateState = {
  status: isDev ? 'dev' : 'idle',
  version: app.getVersion(),
};

function dataFile() {
  return path.join(app.getPath('userData'), 'senses-car-dados.json');
}

function catalogFile() {
  return path.join(app.getPath('userData'), 'senses-car-cadastros.json');
}

function commissionsFile() {
  return path.join(app.getPath('userData'), 'senses-car-comissoes.json');
}

function readData() {
  try {
    const raw = fs.readFileSync(dataFile(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveData(records) {
  const file = dataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(records, null, 2), 'utf8');
  fs.renameSync(temp, file);
  return { ok: true, path: file };
}

function readCatalog() {
  try {
    const raw = fs.readFileSync(catalogFile(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function saveCatalog(catalog) {
  const file = catalogFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(catalog, null, 2), 'utf8');
  fs.renameSync(temp, file);
  return { ok: true, path: file };
}

function readCommissions() {
  try {
    const raw = fs.readFileSync(commissionsFile(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCommissions(commissions) {
  const file = commissionsFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(commissions, null, 2), 'utf8');
  fs.renameSync(temp, file);
  return { ok: true, path: file };
}

function sendUpdateStatus(status, details = {}) {
  updateState = {
    ...updateState,
    ...details,
    status,
    version: app.getVersion(),
    updatedAt: new Date().toISOString(),
  };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updates:status', updateState);
  }
  return updateState;
}

function releaseNotesText(notes) {
  if (Array.isArray(notes)) return notes.map((item) => item.note || item).filter(Boolean).join('\n');
  return typeof notes === 'string' ? notes : '';
}

async function checkForUpdates() {
  if (isDev) return sendUpdateStatus('dev');
  if (updateCheckInFlight) return updateState;

  updateCheckInFlight = true;
  sendUpdateStatus('checking');
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      ...updateState,
      updateInfo: result?.updateInfo || null,
    };
  } catch (error) {
    return sendUpdateStatus('error', { message: error?.message || String(error) });
  } finally {
    updateCheckInFlight = false;
  }
}

async function downloadUpdate() {
  if (isDev) return sendUpdateStatus('dev');
  try {
    await autoUpdater.downloadUpdate();
    return updateState;
  } catch (error) {
    return sendUpdateStatus('error', { message: error?.message || String(error) });
  }
}

function installUpdate() {
  if (isDev) return sendUpdateStatus('dev');
  sendUpdateStatus('installing');
  autoUpdater.quitAndInstall(false, true);
  return updateState;
}

function configureAutoUpdater() {
  if (isDev) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'));
  autoUpdater.on('update-available', (info) => sendUpdateStatus('available', {
    availableVersion: info?.version || '',
    releaseDate: info?.releaseDate || '',
    notes: releaseNotesText(info?.releaseNotes),
  }));
  autoUpdater.on('update-not-available', () => sendUpdateStatus('not-available', {
    availableVersion: '',
    message: 'O aplicativo já está atualizado.',
  }));
  autoUpdater.on('download-progress', (progress) => sendUpdateStatus('downloading', {
    availableVersion: updateState.availableVersion || '',
    percent: Math.round(progress?.percent || 0),
    bytesPerSecond: progress?.bytesPerSecond || 0,
    transferred: progress?.transferred || 0,
    total: progress?.total || 0,
  }));
  autoUpdater.on('update-downloaded', (info) => sendUpdateStatus('downloaded', {
    availableVersion: info?.version || updateState.availableVersion || '',
    releaseDate: info?.releaseDate || '',
    notes: releaseNotesText(info?.releaseNotes),
    message: 'A atualização está pronta para ser instalada.',
  }));
  autoUpdater.on('error', (error) => sendUpdateStatus('error', {
    message: error?.message || String(error),
  }));

  updateInterval = setInterval(() => {
    void checkForUpdates();
  }, 4 * 60 * 60 * 1000);
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: '#f3f0e8',
    title: 'Senses Car • Controle',
    icon: path.join(__dirname, '..', 'build', 'senses-car-icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow = window;
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });
  window.webContents.on('did-finish-load', () => {
    if (!isDev) window.webContents.send('updates:status', updateState);
  });

  if (isDev) window.loadURL('http://127.0.0.1:5173');
  else window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('data:load', readData);
  ipcMain.handle('data:save', (_, records) => saveData(records));
  ipcMain.handle('catalog:load', readCatalog);
  ipcMain.handle('catalog:save', (_, catalog) => saveCatalog(catalog));
  ipcMain.handle('commissions:load', readCommissions);
  ipcMain.handle('commissions:save', (_, commissions) => saveCommissions(commissions));
  ipcMain.handle('updates:state', () => updateState);
  ipcMain.handle('updates:check', checkForUpdates);
  ipcMain.handle('updates:download', downloadUpdate);
  ipcMain.handle('updates:install', installUpdate);
  ipcMain.handle('report:pdf', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showSaveDialog(window, {
      title: 'Exportar relatório em PDF',
      defaultPath: `senses-car-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    const pdf = await window.webContents.printToPDF({ printBackground: true, landscape: true, pageSize: 'A4', margins: { marginType: 'none' } });
    fs.writeFileSync(result.filePath, pdf);
    return { ok: true, path: result.filePath };
  });
  createWindow();
  configureAutoUpdater();
  if (!isDev) setTimeout(() => { void checkForUpdates(); }, 5000);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (updateInterval) clearInterval(updateInterval);
  if (process.platform !== 'darwin') app.quit();
});
