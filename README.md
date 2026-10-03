<div align="center">

# 🌀 naruto-rasengan

**Summon a chakra orb with your open palm — straight from the browser.**

[![MediaPipe](https://img.shields.io/badge/MediaPipe-0097A7?logo=google&logoColor=white)](https://google.github.io/mediapipe/solutions/hands.html)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#-license)

[Features](#-features) · [How It Works](#-how-it-works) · [Built With](#%EF%B8%8F-built-with) · [Setup](#-setup) · [Customization](#%EF%B8%8F-customization) · [Credits](#-credits)

<img src="assets/demo.gif" alt="naruto-rasengan demo" width="640"/>

</div>

---

## ✨ Features

- 🖐️ **Open-palm gesture** spawns a rasengan above your hand
- 👐 **Two hands, two rasengans** — fully independent state per hand
- 🦴 **Glowing skeleton overlay** with different colors per hand (warm orange / cool cyan)
- 🎞️ **No alpha video needed** — black backgrounds are dropped with `mix-blend-mode: screen`
- ⚡ **Zero build** — one static HTML file, libraries loaded from CDN
- 🔒 **Stays local** — no upload, no backend, the webcam never leaves your machine

## 🧠 How It Works

```text
webcam frame
   │
   ▼
MediaPipe Hands  ──▶  21 landmarks + Left/Right label per hand
   │
   ▼
onResults():
   • draw bones + joints on canvas
   • palm-open check (fingertips farther from wrist than knuckles?)
   • integrate per-hand "charge" → orb opacity
   • on closed→open edge, restart rasengan video
   • place video above palm, scaled to hand size
   │
   ▼
composite layers: webcam → skeleton → vignette → rasengan(s)
```

The palm-open test compares each fingertip's distance to the wrist against the corresponding PIP-knuckle's distance to the wrist. If three or more fingers extend past their knuckles, the palm is "open" for that frame.

## 🛠️ Built With

- [**MediaPipe Hands**](https://google.github.io/mediapipe/solutions/hands.html) — on-device 21-landmark hand model
- [**@mediapipe/camera_utils**](https://www.npmjs.com/package/@mediapipe/camera_utils) — wraps [`getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) and pipes frames to the model
- [**@mediapipe/drawing_utils**](https://www.npmjs.com/package/@mediapipe/drawing_utils) — `drawConnectors` + the `HAND_CONNECTIONS` topology
- [**Canvas 2D API**](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) — skeleton rendering with [`shadowBlur`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/shadowBlur) glow
- [**jsDelivr**](https://www.jsdelivr.com/) — CDN for the three MediaPipe scripts, so there's no `npm install`

## 🚀 Setup

```bash
git clone https://github.com/<you>/naruto-rasengan.git
cd naruto-rasengan
python3 -m http.server 8000
```

Open `http://localhost:8000` and grant camera permission. The page needs a real origin (`http://localhost` or `https://...`); `file://` will block `getUserMedia`.

> **Note:** The `<video>` tags reference `assets/rasengan.mp4`. Either keep that filename in `assets/`, or update the `src` attributes in [`index.html`](index.html) to match whatever clip you ship.

## 🎛️ Customization

Tunable constants in [`index.html`](index.html):

| Setting | Location | Default | What it does |
|---|---|---|---|
| Hand palettes | `PALETTES` object | warm / cool | Bone, joint, and glow colors per hand |
| Orb lift | `lift = handSize * 1.8` in `placeOrb` | `1.8` | Higher = orb floats farther above the palm |
| Fade-in speed | `+0.06` in `onResults` | `0.06` | Larger = orb ramps up faster |
| Fade-out speed | `-0.18` in `onResults` | `0.18` | Larger = orb decays faster |
| Open-palm threshold | `extended >= 3` in `isPalmOpen` | `3` | Lower = easier to trigger |
| Tracking sensitivity | `minDetectionConfidence` / `minTrackingConfidence` | `0.65` | Lower = easier detection, more false positives |

## 📁 Project Structure

```
naruto-rasengan/
├── assets/
├── .gitignore
├── README.md
└── index.html
```

- [`assets/`](assets/) — runtime media, including the rasengan video clip
- [`index.html`](index.html) — the entire app: markup, styles, and the per-frame loop

## 🙌 Credits

- Concept inspired by [gprem09/naruto](https://github.com/gprem09/naruto)
- Hand tracking by [MediaPipe](https://google.github.io/mediapipe/) (Google)
- Rasengan from *Naruto* by Masashi Kishimoto — clip used here is a third-party asset, swap it before redistributing if you don't have rights

## 📄 License

[MIT](LICENSE).

---

<div align="center">
Made with ✨ and a lot of chakra.
</div>
