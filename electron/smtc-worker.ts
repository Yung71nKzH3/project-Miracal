import { parentPort } from 'node:worker_threads'
import { SMTCMonitor } from '@coooookies/windows-smtc-monitor'

console.log('SMTC Worker: Starting...')

try {
  const monitor = new SMTCMonitor()
  console.log('SMTC Worker: Monitor initialized successfully')

  const sendUpdate = (sourceAppId: string) => {
    const session = SMTCMonitor.getMediaSessionByAppId(sourceAppId)
    if (session && session.media) {
      const albumArt = session.media.thumbnail 
        ? `data:image/png;base64,${session.media.thumbnail.toString('base64')}` 
        : undefined

      parentPort?.postMessage({
        type: 'media-update',
        data: {
          title: session.media.title,
          artist: session.media.artist,
          album: session.media.albumTitle,
          albumArt,
          origin: session.sourceAppId,
          playbackStatus: session.playback?.playbackStatus,
        }
      })
    }
  }

  // Monitor events
  monitor.on('current-session-changed', (sourceAppId) => {
    console.log('SMTC Worker: Current session changed', sourceAppId)
    sendUpdate(sourceAppId)
  })

  monitor.on('session-media-changed', (sourceAppId) => {
    console.log('SMTC Worker: Media changed', sourceAppId)
    sendUpdate(sourceAppId)
  })

  monitor.on('session-playback-changed', (sourceAppId) => {
    console.log('SMTC Worker: Playback status changed', sourceAppId)
    sendUpdate(sourceAppId)
  })

  // HEARTBEAT: Poll for full state every 500ms
  // This ensures we catch changes even if events are missed
  setInterval(() => {
    const current = SMTCMonitor.getCurrentMediaSession()
    if (current) {
      sendUpdate(current.sourceAppId)
    }
  }, 500)

  // Position Polling (Fast)
  setInterval(() => {
    const session = SMTCMonitor.getCurrentMediaSession()
    if (session && session.timeline) {
      parentPort?.postMessage({
        type: 'media-position',
        data: {
          position: session.timeline.position,
          duration: session.timeline.duration,
          timestamp: Date.now()
        }
      })
    }
  }, 100)

} catch (error) {
  console.error('SMTC Worker: Failed to initialize monitor', error)
  process.exit(1)
}
