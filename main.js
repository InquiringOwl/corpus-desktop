// Corpus desktop shell: serves the app from a private corpus:// scheme and keeps itself up to date.
const { app, BrowserWindow, protocol, net, ipcMain, shell, Menu, dialog } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

const APP_DIR = path.join(__dirname, 'app');
const CHECK_EVERY_MS = 4 * 60 * 60 * 1000; // every 4 hours while the app is open
const fs = require('fs');
// electron-builder removes the "build" section from the packaged package.json,
// so read the GitHub repo from the dev package.json or from the app-update.yml it writes.
function readRepo() {
  try { const p = require('./package.json'); const pub = p.build && p.build.publish; if (pub) return (Array.isArray(pub) ? pub[0] : pub) || {}; } catch (e) {}
  try {
    const y = fs.readFileSync(path.join(process.resourcesPath, 'app-update.yml'), 'utf8');
    const get = k => ((y.match(new RegExp('^' + k + ':\\s*(.+)$', 'm')) || [])[1] || '').trim().replace(/^['"]|['"]$/g, '');
    return { owner: get('owner'), repo: get('repo') };
  } catch (e) { return {}; }
}
const REPO = readRepo();

protocol.registerSchemesAsPrivileged([
  { scheme: 'corpus', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

let win = null;
let updateState = { status: 'idle' };

function send(state) {
  updateState = { ...updateState, ...state };
  if (win && !win.isDestroyed()) win.webContents.send('update:status', updateState);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1500, height: 940, minWidth: 900, minHeight: 640,
    backgroundColor: '#04070a', title: 'Corpus',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadURL('corpus://app/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('did-finish-load', () => send({}));
}

/* ---------------- automatic updates ---------------- */
function setupUpdates() {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => send({ status: 'checking' }));
  autoUpdater.on('update-available', i => send({ status: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('update-not-available', () => send({ status: 'current' }));
  autoUpdater.on('download-progress', p => send({ status: 'downloading', percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', i => send({ status: 'ready', version: i.version }));
  autoUpdater.on('error', err => { log.warn('autoUpdater error', err); manualCheck(); });
  const check = () => autoUpdater.checkForUpdates().catch(() => manualCheck());
  if (app.isPackaged) { setTimeout(check, 4000); setInterval(check, CHECK_EVERY_MS); }
  return check;
}

// Fallback for builds that cannot self-install (for example an unsigned macOS build):
// look at the latest GitHub release and offer a download link instead.
async function manualCheck() {
  if (!REPO.owner || REPO.owner === 'YOUR_GITHUB_USERNAME') return;
  try {
    const res = await net.fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/releases/latest`, { headers: { 'User-Agent': 'Corpus-Updater' } });
    if (!res.ok) return;
    const rel = await res.json();
    const latest = String(rel.tag_name || '').replace(/^v/, '');
    if (latest && newer(latest, app.getVersion())) send({ status: 'manual', version: latest, url: rel.html_url });
  } catch (e) { log.warn('manual update check failed', e); }
}
function newer(a, b) { const p = s => s.split('.').map(n => parseInt(n, 10) || 0); const [x, y] = [p(a), p(b)]; for (let i = 0; i < 3; i++) { if ((x[i] || 0) > (y[i] || 0)) return true; if ((x[i] || 0) < (y[i] || 0)) return false; } return false; }

/* ---------------- app lifecycle ---------------- */
app.whenReady().then(() => {
  protocol.handle('corpus', req => {
    const u = new URL(req.url);
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(APP_DIR, rel));
    if (!file.startsWith(APP_DIR)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  const check = setupUpdates();
  ipcMain.handle('update:check', () => { if (app.isPackaged) check(); else send({ status: 'dev' }); return updateState; });
  ipcMain.handle('update:install', () => { if (updateState.status === 'ready') autoUpdater.quitAndInstall(); });
  ipcMain.handle('update:open', () => { if (updateState.url) shell.openExternal(updateState.url); });
  ipcMain.handle('app:version', () => app.getVersion());

  const menu = Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }])] },
    { label: 'Help', submenu: [
      { label: 'Check for updates…', click: () => { if (app.isPackaged) check(); else dialog.showMessageBox({ message: 'Updates are checked in installed builds only.' }); } },
      { label: 'About the 3D models', click: () => shell.openExternal('https://github.com/Z-Anatomy/Models-of-human-anatomy') }
    ] }
  ]);
  Menu.setApplicationMenu(menu);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
