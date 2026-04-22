"use strict";
const electron = require("electron");
const node_path = require("node:path");
const node_worker_threads = require("node:worker_threads");
process.env.DIST = node_path.join(__dirname, "../dist");
process.env.PUBLIC = electron.app.isPackaged ? process.env.DIST : node_path.join(__dirname, "../public");
let win = null;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
console.log("Main process starting...");
console.log("VITE_DEV_SERVER_URL:", VITE_DEV_SERVER_URL);
console.log("DIST:", process.env.DIST);
function createWindow() {
  win = new electron.BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    skipTaskbar: false,
    webPreferences: {
      preload: node_path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (VITE_DEV_SERVER_URL) {
    console.log("Loading URL:", VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    console.log("Loading file:", node_path.join(process.env.DIST, "index.html"));
    win.loadFile(node_path.join(process.env.DIST, "index.html"));
  }
  electron.ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
    win == null ? void 0 : win.setIgnoreMouseEvents(ignore, options);
  });
  electron.ipcMain.on("set-always-on-top", (event, flag) => {
    win == null ? void 0 : win.setAlwaysOnTop(flag, "screen-saver");
  });
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
    win = null;
  }
});
electron.app.whenReady().then(() => {
  createWindow();
  console.log("Starting SMTC Worker thread...");
  const workerPath = node_path.join(__dirname, "smtc-worker.js");
  const worker = new node_worker_threads.Worker(workerPath);
  worker.on("message", (message) => {
    if (message.type === "media-update") {
      win == null ? void 0 : win.webContents.send("media-update", message.data);
    } else if (message.type === "media-position") {
      win == null ? void 0 : win.webContents.send("media-position", message.data);
    }
  });
  worker.on("error", (err) => {
    console.error("SMTC Worker error:", err);
  });
  worker.on("exit", (code) => {
    console.log(`SMTC Worker exited with code ${code}`);
  });
});
