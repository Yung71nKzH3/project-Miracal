"use strict";
const electron = require("electron");
console.log("Preload script executing...");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  onMediaUpdate: (callback) => electron.ipcRenderer.on("media-update", (_event, value) => callback(value)),
  onMediaPosition: (callback) => electron.ipcRenderer.on("media-position", (_event, value) => callback(value)),
  setIgnoreMouseEvents: (ignore, options) => electron.ipcRenderer.send("set-ignore-mouse-events", ignore, options),
  setAlwaysOnTop: (flag) => electron.ipcRenderer.send("set-always-on-top", flag)
});
