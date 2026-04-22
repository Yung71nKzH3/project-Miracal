import { useState, useEffect, useRef } from 'react'
import { Pin, PinOff, Music, Lock, Unlock, GripVertical, Bug } from 'lucide-react'
import { FastAverageColor } from 'fast-average-color'
import './index.css'

interface MediaData {
  title: string
  artist: string
  album?: string
  albumArt?: string
  origin: string
  playbackStatus: string | number
}

interface LyricLine {
  time: number
  text: string
}

const LINE_HEIGHT = 64 

function App() {
  const [media, setMedia] = useState<MediaData | null>(null)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [isPinned, setIsPinned] = useState(true)
  const [accentColor, setAccentColor] = useState('#ff477e')
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  
  // High-performance REFS (Direct variable assignment)
  const playbackPosRef = useRef(0)
  const durationRef = useRef(0)
  const isPlayingRef = useRef(false)
  const lyricsRef = useRef<LyricLine[]>([])
  const lastFrameTimeRef = useRef(performance.now())
  const rawPosRef = useRef(0) // Raw data from Windows for debugging
  const lastWindowsPosRef = useRef(-1) // To detect stale bollocks
  
  // DOM Refs for direct manipulation (Non-stop loop)
  const progressRingRef = useRef<SVGCircleElement>(null)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const diagPosRef = useRef<HTMLSpanElement>(null)
  const diagLineRef = useRef<HTMLSpanElement>(null)

  const currentMediaId = useRef<string>('')
  const fac = useRef(new FastAverageColor())

  // Update refs when state changes to keep the Iron Ticker in sync
  useEffect(() => {
    isPlayingRef.current = media?.playbackStatus === 4 || media?.playbackStatus === '4' || media?.playbackStatus === 'Playing'
  }, [media?.playbackStatus])

  useEffect(() => {
    lyricsRef.current = lyrics
  }, [lyrics])

  // --- THE PURE STOPWATCH ENGINE ---
  useEffect(() => {
    let frameId: number
    const CIRCUMFERENCE = 301.59
    let lastIdx = -1
    
    const tick = () => {
      const now = performance.now()
      const dt = now - lastFrameTimeRef.current
      lastFrameTimeRef.current = now

      const isPlaying = isPlayingRef.current
      
      if (isPlaying) {
        // Pure, unstoppable forward movement. No lerps, no friction.
        playbackPosRef.current += dt
      }

      const currentPos = playbackPosRef.current

      // Direct DOM Update: Progress Ring
      if (progressRingRef.current && durationRef.current > 0) {
        const pct = Math.min(1, currentPos / durationRef.current)
        const offset = CIRCUMFERENCE - (CIRCUMFERENCE * pct)
        progressRingRef.current.style.strokeDashoffset = offset.toString()
      }

      // Direct DOM Update: Lyrics Scroll
      const currentLyrics = lyricsRef.current
      if (lyricsContainerRef.current && currentLyrics.length > 0) {
        let idx = -1
        for (let i = currentLyrics.length - 1; i >= 0; i--) {
          if (currentPos >= currentLyrics[i].time) {
            idx = i
            break
          }
        }
        
        if (idx !== -1) {
          const parent = lyricsContainerRef.current.parentElement
          if (parent && lastIdx !== idx) {
            const targetY = (idx * LINE_HEIGHT)
            parent.scrollTo({ top: targetY, behavior: 'smooth' })
            lastIdx = idx
          }
          
          // Update classes
          const lines = lyricsContainerRef.current.children
          for (let i = 0; i < lines.length; i++) {
            const lineEl = lines[i] as HTMLElement
            if (i === idx) {
              if (!lineEl.classList.contains('active')) {
                lineEl.classList.add('active')
                lineEl.classList.remove('past')
              }
            } else if (i < idx) {
              lineEl.classList.add('past')
              lineEl.classList.remove('active')
            } else {
              lineEl.classList.remove('active', 'past')
            }
          }
          if (diagLineRef.current) diagLineRef.current.innerText = idx.toString()
        }
      }

      if (diagPosRef.current) {
        diagPosRef.current.innerText = `Smooth: ${Math.round(currentPos)}ms\nRaw: ${Math.round(rawPosRef.current)}ms`
      }
      
      frameId = requestAnimationFrame(tick)
    }
    
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    // @ts-ignore
    window.electronAPI.onMediaUpdate((data: MediaData) => {
      setMedia(data)
      if (data && `${data.artist}-${data.title}` !== currentMediaId.current) {
        currentMediaId.current = `${data.artist}-${data.title}`
        setLyrics([])
        playbackPosRef.current = 0
        durationRef.current = 0
        lastFrameTimeRef.current = performance.now()
        lastWindowsPosRef.current = -1
        
        fetchLyrics(data.artist, data.title)
        
        if (data.albumArt) {
          fac.current.getColorAsync(data.albumArt).then(color => {
            setAccentColor(color.hex)
          }).catch(() => setAccentColor('#ff477e'))
        } else {
          setAccentColor('#ff477e')
        }
      }
    })

    // @ts-ignore
    window.electronAPI.onMediaPosition((data: { position: number, duration: number, timestamp: number }) => {
      let pos = data.position
      let dur = data.duration
      
      // Stop NaN infection that freezes the Iron Ticker
      if (pos == null || isNaN(pos) || dur == null || isNaN(dur)) return;

      console.log(`[SMTC RAW] Pos: ${pos}ms | Dur: ${dur}ms | Source: ${data.timestamp}`);

      // TICK NORMALIZATION
      if (dur > 20000000 || pos > 20000000) { 
        pos = pos / 10000
        dur = dur / 10000
      } else if (dur > 0 && dur < 5000) {
        pos = pos * 1000
        dur = dur * 1000
      }

      pos = Math.max(0, pos)
      dur = Math.max(0, dur)
      rawPosRef.current = pos // Store raw for diagnostic display

      // THE "SELECTIVE INTELLIGENCE" ENGINE
      // Windows sends stale garbage 90% of the time. 
      // We only listen when Windows has something NEW to tell us.

      // 1. If Windows sends the exact same number as before, IGNORE IT.
      if (pos === lastWindowsPosRef.current) return;
      
      // 2. This is a FRESH TICK from Windows. We now update our internal clock to stay perfectly in sync.
      lastWindowsPosRef.current = pos;

      const now = Date.now()
      const latency = now - data.timestamp
      
      // We snap to the new position + the travel time (latency)
      playbackPosRef.current = pos + (isPlayingRef.current ? latency : 0)
      
      console.log(`[SYNC] Windows ticked forward to: ${pos}ms. Synchronization complete.`);
      
      durationRef.current = dur
    })
  }, [])



  const fetchLyrics = async (artist: string, title: string) => {
    setIsFetchingLyrics(true)
    try {
      const response = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`)
      const data = await response.json()
      if (data.syncedLyrics) {
        parseLRC(data.syncedLyrics)
      } else {
        setLyrics([{ time: 0, text: data.plainLyrics || 'No synced lyrics available' }])
      }
    } catch (e) {
      setLyrics([{ time: 0, text: 'Lyrics not found' }])
    } finally {
      setIsFetchingLyrics(false)
    }
  }

  const parseLRC = (lrc: string) => {
    const lines = lrc.split('\n')
    const parsed: LyricLine[] = []
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/

    lines.forEach(line => {
      const match = timeRegex.exec(line)
      if (match) {
        const minutes = parseInt(match[1])
        const seconds = parseInt(match[2])
        const msRaw = parseInt(match[3])
        const ms = match[3].length === 2 ? msRaw * 10 : msRaw
        const time = (minutes * 60 + seconds) * 1000 + ms
        const text = line.replace(timeRegex, '').trim()
        if (text) parsed.push({ time, text })
      }
    })
    setLyrics(parsed)
  }

  const togglePin = () => {
    const newState = !isPinned
    setIsPinned(newState)
    // @ts-ignore
    window.electronAPI.setAlwaysOnTop(newState)
  }

  const toggleLock = () => {
    const newState = !isLocked
    setIsLocked(newState)
    // @ts-ignore
    window.electronAPI.setIgnoreMouseEvents(newState, newState ? { forward: true } : undefined)
  }

  // Selective Click-through logic
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isLocked) return
      const target = e.target as HTMLElement
      const isOverInteractive = !!target.closest('.no-drag') || !!target.closest('.drag-grip') || !!target.closest('.control-btn')
      // @ts-ignore
      window.electronAPI.setIgnoreMouseEvents(!isOverInteractive, { forward: true })
    }
    window.addEventListener('mousemove', handleGlobalMouseMove)
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove)
  }, [isLocked])

  const isPlaying = media?.playbackStatus === 4 || media?.playbackStatus === '4' || media?.playbackStatus === 'Playing'

  if (!media) {
    return (
      <div className="miracal-container loading-view">
        <div className="loading-spinner" />
        <p className="text-secondary">Waiting for your vibe...</p>
      </div>
    )
  }



  return (
    <div 
      className="miracal-container"
      style={{ 
        '--accent-color': accentColor,
        boxShadow: `inset 0 0 40px ${accentColor}22`
      } as any}
    >
      {/* Carrier Handle for Dragging */}
      <div className={`drag-grip ${isLocked ? 'locked' : ''}`} title={isLocked ? 'Locked' : 'Drag to move'}>
        <div className="handle-dots">
          <GripVertical size={14} className="opacity-40" />
        </div>
      </div>

      <div className="content-wrapper">
        {/* Record Player Section */}
        <div className="record-player-section no-drag">
          <div className="record-container">
            <div className={`vinyl-record ${isPlaying ? 'spinning' : ''}`}>
               <img 
                 src={media.albumArt || 'https://via.placeholder.com/300?text=Music'} 
                 className="album-art-disk" 
                 alt="album art" 
               />
               <div className="vinyl-center-hole" />
            </div>
            
            {/* Progress Ring */}
            <svg className="progress-ring" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle 
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="4"
                fill="transparent"
                r="48"
                cx="50"
                cy="50"
              />
              <circle 
                ref={progressRingRef}
                className="progress-ring-fill"
                stroke={accentColor}
                strokeWidth="4"
                fill="transparent"
                r="48"
                cx="50"
                cy="50"
                style={{
                  strokeDasharray: '301.59',
                  strokeDashoffset: '301.59'
                }}
              />
            </svg>
            
            <div className={`tonearm ${isPlaying ? 'active' : ''}`} />
          </div>
          
          <div className="track-meta">
            <div className="track-title">{media.title}</div>
            <div className="track-artist">{media.artist}</div>
          </div>
        </div>

        {/* Lyrics Section */}
        <div className="lyrics-section no-drag">
          <div className="lyrics-focal-line" />
          {isFetchingLyrics ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
              <Music className="animate-pulse" />
              <p>Fetching lyrics...</p>
            </div>
          ) : (
            <div 
              ref={lyricsContainerRef}
              className="lyrics-scroll-container"
              style={{
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {lyrics.length > 0 ? (
                lyrics.map((line, i) => {
                  return (
                    <div 
                      key={i} 
                      className="lyric-line"
                      style={{ height: `${LINE_HEIGHT}px` }}
                    >
                      {showDiagnostics && (
                        <span className="lyric-timestamp">
                          {Math.floor(line.time / 60000)}:
                          {String(Math.floor((line.time % 60000) / 1000)).padStart(2, '0')}
                        </span>
                      )}
                      <span className="lyric-text">{line.text}</span>
                    </div>
                  )
                })
              ) : (
                <div className="lyric-line active text-center">🎵 Listening...</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Diagnostics Overlay */}
      {showDiagnostics && (
        <div className="diagnostics-overlay no-drag">
          <p>Pos: <span ref={diagPosRef}>0ms</span></p>
          <p>Dur: {Math.round(durationRef.current)}ms</p>
          <p>Line: <span ref={diagLineRef}>-1</span></p>
          <p>Lyrics: {lyrics.length}</p>
          <p>Status: {media.playbackStatus}</p>
        </div>
      )}

      {/* Controls */}
      <div className="controls-overlay no-drag">
        <button onClick={() => setShowDiagnostics(!showDiagnostics)} className="control-btn" title="Toggle Diagnostics">
          <Bug size={16} />
        </button>
        <button onClick={toggleLock} className={`control-btn ${isLocked ? 'active' : ''}`} title={isLocked ? 'Unlock Interaction' : 'Lock Interaction'}>
          {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
        </button>
        <button onClick={togglePin} className="control-btn" title={isPinned ? 'Unpin' : 'Pin'}>
          {isPinned ? <Pin size={16} className="text-accent-color"/> : <PinOff size={16} />}
        </button>
      </div>
    </div>
  )
}

export default App
