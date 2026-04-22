"use strict";
const node_worker_threads = require("node:worker_threads");
const windowsSmtcMonitor = require("@coooookies/windows-smtc-monitor");
console.log("SMTC Worker: Starting...");
try {
  const monitor = new windowsSmtcMonitor.SMTCMonitor();
  console.log("SMTC Worker: Monitor initialized successfully");
  const sendUpdate = (sourceAppId) => {
    var _a, _b;
    const session = windowsSmtcMonitor.SMTCMonitor.getMediaSessionByAppId(sourceAppId);
    if (session && session.media) {
      const albumArt = session.media.thumbnail ? `data:image/png;base64,${session.media.thumbnail.toString("base64")}` : void 0;
      (_b = node_worker_threads.parentPort) == null ? void 0 : _b.postMessage({
        type: "media-update",
        data: {
          title: session.media.title,
          artist: session.media.artist,
          album: session.media.albumTitle,
          albumArt,
          origin: session.sourceAppId,
          playbackStatus: (_a = session.playback) == null ? void 0 : _a.playbackStatus
        }
      });
    }
  };
  monitor.on("current-session-changed", (sourceAppId) => {
    console.log("SMTC Worker: Current session changed", sourceAppId);
    sendUpdate(sourceAppId);
  });
  monitor.on("session-media-changed", (sourceAppId) => {
    console.log("SMTC Worker: Media changed", sourceAppId);
    sendUpdate(sourceAppId);
  });
  monitor.on("session-playback-changed", (sourceAppId) => {
    console.log("SMTC Worker: Playback status changed", sourceAppId);
    sendUpdate(sourceAppId);
  });
  setInterval(() => {
    const current = windowsSmtcMonitor.SMTCMonitor.getCurrentMediaSession();
    if (current) {
      sendUpdate(current.sourceAppId);
    }
  }, 500);
  setInterval(() => {
    var _a;
    const session = windowsSmtcMonitor.SMTCMonitor.getCurrentMediaSession();
    if (session && session.timeline) {
      (_a = node_worker_threads.parentPort) == null ? void 0 : _a.postMessage({
        type: "media-position",
        data: {
          position: session.timeline.position,
          duration: session.timeline.duration,
          timestamp: Date.now()
        }
      });
    }
  }, 100);
} catch (error) {
  console.error("SMTC Worker: Failed to initialize monitor", error);
  process.exit(1);
}
