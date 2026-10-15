<div align="center">

# 🌀 Naruto Jutsu-Cam

**Cast 7 Legendary Ninja Techniques with real-time hand signs & computer vision — straight from your browser.**

[![MediaPipe](https://img.shields.io/badge/MediaPipe-0097A7?logo=google&logoColor=white)](https://google.github.io/mediapipe/solutions/hands.html)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Web Audio](https://img.shields.io/badge/Web%20Audio%20API-FF6F00?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#-license)

[Jutsus](#-7-legendary-jutsus) · [Hand Sign Guide](#-hand-sign-guide--triggers) · [How It Works](#-how-it-works) · [Controls](#-controls--hotkeys) · [Setup](#-setup)

</div>

---

## ✨ 7 Legendary Jutsus

| Jutsu | Japanese | In-Game Trigger | Visual & Sound Effects |
|---|---|---|---|
| **Rasengan** | 螺旋丸 | Open Palm (Key `1`) | Spiraling chakra sphere with rotating logarithmic filaments & high-speed chakra whirr directly on palm |
| **Chidori** | 千鳥 | Clenched Fist (Key `2`) | Fractal branching lightning bolts, high-voltage corona glow & 1,000 birds chirping directly on knuckles |
| **Shadow Clone** | 影分身の術 | Cross Seal `+` (Key `3`) | Manga smoke explosion (*POOF!*), clone video projections on left and right |
| **Fireball** | 火遁・豪火球の術 | Hand at Mouth (Key `4`) | Roaring furnace blast, mouth-to-core fire jet, swirling flame tongues & ember sparks |
| **Sharingan ➔ Kamui** | 写輪眼 ➔ 神威 | Finger at Eye (Key `5`) | Rotating 3-Tomoe Sharingan morphs to Mangekyō, tearing open the spacetime suction vortex |

---

## ✋ Hand Sign Guide & Triggers

1. **🌀 Rasengan (螺旋丸)**: Hold an **open palm facing the camera** (Key `1`).
2. **⚡ Chidori (千鳥)**: Clench your fingers into a **tight fist** (Key `2`).
3. **👥 Shadow Clone (影分身の術)**: Form the classic **cross seal (+)** with two hands (Key `3`).
4. **🔥 Fireball (火遁・豪火球の術)**: Hold your hand directly in front of your **mouth / chin** (Key `4`).
5. **👁️ Sharingan ➔ Kamui (写輪眼 ➔ 神威)**: Point your index finger directly at your **eye / temple** (Key `5`).

---

## 🕹️ Controls & Hotkeys

- **`1` – `5`**: Instantly switch to and lock any Jutsu
- **`A`**: Toggle **Auto-Gesture Recognition Mode** (detects real hand signs automatically)
- **`M`**: Mute / Unmute procedural anime sound effects (SFX)
- **`G`**: Open / Close the in-app **Shinobi Hand Sign Manual**
- **`Space` or 📸 button**: Take a snapshot photo with effects composited and download PNG!
- **🦴 button**: Toggle MediaPipe skeleton tracking lines on/off

---

## 🧠 How It Works

```text
Webcam Frame
    │
    ├──▶ MediaPipe Hands (21 3D landmarks per hand)
    └──▶ MediaPipe FaceMesh (Eye & Mouth spatial tracking)
           │
           ▼
    JutsuGestureDetector (js/gestures.js)
           │  • Finger extension & knuckle analysis
           │  • Multi-hand relationship (Cross seal, Prayer seal)
           │  • Face-to-hand proximity (Mouth, Eyes, Temple)
           ▼
    JutsuEffectsEngine (js/effects.js)
           │  • High-performance procedural Canvas 2D particle simulation
           │  • Fractal lightning branch generator (Chidori)
           │  • Logarithmic chakra spirals (Rasengan)
           │  • Volumetric anime smoke puff physics (Shadow Clone)
           │  • Spacetime spiral distortion (Kamui)
           │  • Colossal chakra ribcage & flame avatar (Susanoo)
           ▼
    Web Audio API Synthesizer (js/audio.js)
           │  • Zero external audio files needed
           │  • Real-time FM synthesis, modulated filters & noise bursts
           ▼
    Composited Live Display + Snapshot Export
```

---

## 🚀 Setup & Run Locally

```bash
# Clone the repository
git clone https://github.com/gnaneshwar166/resengan-.git
cd resengan-

# Start a local web server (Python)
python -m http.server 8000

# Or start with Node.js
npx serve
```

Open your browser to `http://localhost:8000` and allow camera access.

> **Zero Build Required**: No `npm install`, no bundlers, no compilation! All MediaPipe models and fonts load seamlessly via CDN.

---

## 📁 Project Structure

```
naruto-jutsu-cam/
├── assets/
│   └── rasengan.mp4       # Video asset fallback
├── css/
│   └── jutsu.css          # Glassmorphic ninja HUD & anime UI
├── js/
│   ├── audio.js           # Web Audio API procedural sound synthesizer
│   ├── gestures.js        # Shinobi hand seal recognition engine
│   ├── effects.js         # Canvas 2D procedural jutsu particle engine
│   └── app.js             # Main controller & MediaPipe integration
├── index.html             # Main application entry point
└── README.md
```

---

## 📄 License

[MIT](LICENSE).

<div align="center">
Made with ✨ and endless chakra.
</div>
