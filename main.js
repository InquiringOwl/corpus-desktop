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
const { execFile } = require('child_process');
let interactive = false; // true when the user chose Help → Check for updates…
let selfUpdate = null;   // can this build install updates by itself?

// macOS only lets an app replace itself when it is signed with a Developer ID.
function canSelfUpdate() {
  if (selfUpdate !== null) return Promise.resolve(selfUpdate);
  if (process.platform !== 'darwin') return Promise.resolve(selfUpdate = true);
  const appPath = path.resolve(process.execPath, '../../..');
  return new Promise(res => execFile('codesign', ['-dv', '--verbose=2', appPath], (err, out, errOut) => {
    selfUpdate = !err && /Authority=Developer ID Application/.test(String(errOut) + String(out));
    res(selfUpdate);
  }));
}
function tell(message, detail, buttons) {
  if (!win || win.isDestroyed()) return Promise.resolve({ response: 0 });
  return dialog.showMessageBox(win, { type: 'info', message, detail, buttons: buttons || ['OK'], defaultId: 0, cancelId: buttons ? buttons.length - 1 : 0 });
}

function setupUpdates() {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => send({ status: 'checking' }));
  autoUpdater.on('update-available', i => { send({ status: 'downloading', version: i.version, percent: 0 }); if (interactive) { interactive = false; tell(`Corpus ${i.version} is downloading`, 'It installs when you restart. You can keep working.'); } });
  autoUpdater.on('update-not-available', () => { send({ status: 'current' }); if (interactive) { interactive = false; tell('Corpus is up to date', `You have version ${app.getVersion()}.`); } });
  autoUpdater.on('download-progress', p => send({ status: 'downloading', percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', i => send({ status: 'ready', version: i.version }));
  autoUpdater.on('error', err => { log.warn('autoUpdater error', err); manualCheck(); });
  const check = async (fromMenu) => {
    if (fromMenu) interactive = true;
    if (!app.isPackaged) { if (fromMenu) tell('Updates are checked in installed copies only', 'This copy was started with npm start.'); interactive = false; return; }
    if (await canSelfUpdate()) autoUpdater.checkForUpdates().catch(() => manualCheck());
    else manualCheck();
  };
  if (app.isPackaged) { setTimeout(() => check(false), 4000); setInterval(() => check(false), CHECK_EVERY_MS); }
  return check;
}

// For builds that cannot install by themselves (an unsigned Mac build):
// compare with the latest GitHub release and offer the download page.
async function manualCheck() {
  const fromMenu = interactive; interactive = false;
  if (!REPO.owner || REPO.owner === 'YOUR_GITHUB_USERNAME') { if (fromMenu) tell('Updates are not set up yet', 'Add your GitHub username to package.json.'); return; }
  try {
    const res = await net.fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/releases/latest`, { headers: { 'User-Agent': 'Corpus-Updater', 'Accept': 'application/vnd.github+json' } });
    if (!res.ok) throw new Error('GitHub answered ' + res.status);
    const rel = await res.json();
    const latest = String(rel.tag_name || '').replace(/^v/, '');
    if (latest && newer(latest, app.getVersion())) {
      send({ status: 'manual', version: latest, url: rel.html_url });
      if (fromMenu) { const r = await tell(`Corpus ${latest} is available`, `You have ${app.getVersion()}. Download the new version, quit Corpus, and drag it into Applications.`, ['Download', 'Later']); if (r.response === 0) shell.openExternal(rel.html_url); }
    } else if (fromMenu) tell('Corpus is up to date', `You have version ${app.getVersion()}, the latest release.`);
  } catch (e) { log.warn('manual update check failed', e); if (fromMenu) tell('Could not check for updates', 'Check your internet connection and try again.'); }
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
  ipcMain.handle('update:check', () => { check(true); return updateState; });
  ipcMain.handle('update:install', () => { if (updateState.status === 'ready') autoUpdater.quitAndInstall(); });
  ipcMain.handle('update:open', () => { if (updateState.url) shell.openExternal(updateState.url); });
  ipcMain.handle('app:version', () => app.getVersion());

  const menu = Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }])] },
    { label: 'Help', submenu: [
      { label: 'Check for updates…', click: () => check(true) },
      { label: 'About the 3D models', click: () => shell.openExternal('https://github.com/Z-Anatomy/Models-of-human-anatomy') }
    ] }
  ]);
  Menu.setApplicationMenu(menu);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
