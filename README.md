# 🎧 Miracal

> **The ultimate high-performance lyrics overlay for Windows.**

![Miracal Logo](./public/icon.png)

Miracal is a sleek, minimalist, and ultra-high-performance lyrics overlay that bridges the gap between your music and your desktop. Designed for music lovers who want a premium, 60FPS fluid experience.

## ✨ Features

*   **⚡ 60FPS Fluid Engine**: Bypasses React state updates to provide butter-smooth scrolling and ring progress via direct DOM manipulation.
*   **🎯 Selective Intelligence Sync**: A custom "Phase-Locked Loop" clock that filters out stale Windows SMTC data to provide a perfectly steady "Live" stopwatch feel.
*   **🧬 Monotonic Lock**: Guarantees that lyrics only move forward, eliminating jitter and backward "teleporting" common in other overlays.
*   **🎨 Dynamic Aesthetics**: Real-time accent color detection from album art for a truly immersive experience.
*   **📜 Interactive Lyrics**: A premium "Glass" scrollbar that lets you browse the song manually while the auto-scroll waits for the next "Fresh Tick."
*   **🔍 High-Precision Diagnostics**: Toggleable on-screen data (via the Bug icon) to verify sync timing and system health.

## 🚀 Installation

1. Download the latest `Miracal-Setup.exe` from the Releases page.
2. Run the installer.
3. Open Spotify or your favorite media player and start singing!

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the production executable
npm run build
```

## 📜 Credits

Created with ❤️ by **w1ll0w** & **Antigravity**.

*Lyrics powered by [LRCLIB](https://lrclib.net/)*
