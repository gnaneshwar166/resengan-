/**
 * Naruto Jutsu-Cam Main Application Controller
 * Connects MediaPipe Hands, FaceMesh, Audio Synthesizer, Effects Engine, and UI HUD
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const camVideo = document.getElementById('cam');
  const skeletonCanvas = document.getElementById('skeleton');
  const effectsCanvas = document.getElementById('effectsCanvas');
  const pen = skeletonCanvas.getContext('2d');

  const jutsuBtns = document.querySelectorAll('.jutsu-btn');
  const modeAuto = document.getElementById('mode-auto');
  const modeManual = document.getElementById('mode-manual');
  const sfxBtn = document.getElementById('sfx-btn');
  const snapshotBtn = document.getElementById('snapshot-btn');
  const guideBtn = document.getElementById('guide-btn');
  const skeletonBtn = document.getElementById('skeleton-btn');
  const guideModal = document.getElementById('guide-modal');
  const closeGuide = document.getElementById('close-guide');
  const flashMsg = document.getElementById('flash-msg');

  const kanjiTitle = document.getElementById('kanji-title');
  const englishTitle = document.getElementById('english-title');
  const handSignHint = document.getElementById('hand-sign-hint');
  const chakraFill = document.getElementById('chakra-fill');

  // Metadata for each Jutsu
  const JUTSU_DATA = {
    rasengan: {
      kanji: '螺旋丸',
      english: 'RASENGAN · SPIRALING SPHERE',
      hint: '🖐️ Trigger: Open Palm facing camera',
      color: '#00f0ff'
    },
    chidori: {
      kanji: '千鳥',
      english: 'CHIDORI · THOUSAND BIRDS',
      hint: '✊ Trigger: Clenched Fist / Claw downwards',
      color: '#70d6ff'
    },
    clone: {
      kanji: '影分身の術',
      english: 'SHADOW CLONE JUTSU',
      hint: '➕ Trigger: Cross Fingers Seal (+) or 2 hands together',
      color: '#ff9f1a'
    },
    fireball: {
      kanji: '火遁・豪火球の術',
      english: 'FIREBALL JUTSU (KATON)',
      hint: '🐯 Trigger: Tiger Hand Seal in front of mouth',
      color: '#ff5500'
    },
    reaper: {
      kanji: '封印術・屍鬼封尽',
      english: 'REAPER DEATH SEAL (SHIKI FŪJIN)',
      hint: '🙏 Trigger: Prayer Hands (Gasshō) at chest',
      color: '#9d4edd'
    },
    kamui: {
      kanji: '写輪眼 ➔ 神威',
      english: 'SHARINGAN ➔ KAMUI VORTEX',
      hint: '👁️ Trigger: Index Finger near eye / temple',
      color: '#ff0055'
    },
    susanoo: {
      kanji: '写輪眼 ➔ 須佐能乎',
      english: 'SHARINGAN ➔ SUSANOO AVATAR',
      hint: '🛡️ Trigger: Both Arms Raised Wide or Crossed',
      color: '#c77dff'
    }
  };

  // State
  let detectionMode = 'auto'; // 'auto' | 'manual'
  let activeJutsu = 'rasengan';
  let showSkeleton = true;
  let lastHandsData = null;
  let lastFaceLandmarks = null;
  let faceMeshReady = false;

  // Initialize Effects Engine
  const effects = new JutsuEffectsEngine(effectsCanvas, camVideo);
  effects.setJutsu('rasengan');

  // PALETTES for Skeleton Bones
  const PALETTES = {
    Left:  { bone: '#ff8a3d', joint: '#fff36a', glow: '#ff5e1a' },
    Right: { bone: '#62f0ff', joint: '#ff66e0', glow: '#1aa6ff' }
  };

  function updateHUD(jutsuKey, signName = null) {
    const data = JUTSU_DATA[jutsuKey];
    if (!data) return;

    kanjiTitle.textContent = data.kanji;
    englishTitle.textContent = data.english;
    handSignHint.textContent = signName || data.hint;
    chakraFill.style.background = `linear-gradient(90deg, ${data.color}, #ffffff)`;
    chakraFill.style.boxShadow = `0 0 12px ${data.color}`;

    jutsuBtns.forEach(btn => {
      if (btn.dataset.jutsu === jutsuKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function setActiveJutsu(key, force = false) {
    if (activeJutsu === key && !force) return;
    activeJutsu = key;
    effects.setJutsu(key);
    updateHUD(key);
  }

  // UI Event Listeners
  jutsuBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.jutsuAudio) window.jutsuAudio.resume();
      const jutsu = btn.dataset.jutsu;
      setManualMode();
      setActiveJutsu(jutsu, true);
    });
  });

  function setAutoMode() {
    detectionMode = 'auto';
    modeAuto.classList.add('active');
    modeManual.classList.remove('active');
  }

  function setManualMode() {
    detectionMode = 'manual';
    modeManual.classList.add('active');
    modeAuto.classList.remove('active');
  }

  modeAuto.addEventListener('click', () => {
    if (window.jutsuAudio) window.jutsuAudio.resume();
    setAutoMode();
  });

  modeManual.addEventListener('click', () => {
    if (window.jutsuAudio) window.jutsuAudio.resume();
    setManualMode();
  });

  sfxBtn.addEventListener('click', () => {
    if (window.jutsuAudio) {
      window.jutsuAudio.resume();
      const muted = window.jutsuAudio.toggleMute();
      sfxBtn.innerHTML = muted ? '🔇' : '🔊';
    }
  });

  skeletonBtn.addEventListener('click', () => {
    showSkeleton = !showSkeleton;
    skeletonBtn.style.opacity = showSkeleton ? '1' : '0.5';
    if (!showSkeleton) {
      pen.clearRect(0, 0, skeletonCanvas.width, skeletonCanvas.height);
    }
  });

  guideBtn.addEventListener('click', () => guideModal.classList.add('open'));
  closeGuide.addEventListener('click', () => guideModal.classList.remove('open'));
  guideModal.addEventListener('click', (e) => {
    if (e.target === guideModal) guideModal.classList.remove('open');
  });

  // Hotkeys 1-7, A for Auto, M for Mute, G for Guide
  window.addEventListener('keydown', (e) => {
    if (window.jutsuAudio) window.jutsuAudio.resume();
    const keyMap = {
      '1': 'rasengan',
      '2': 'chidori',
      '3': 'clone',
      '4': 'fireball',
      '5': 'reaper',
      '6': 'kamui',
      '7': 'susanoo'
    };
    if (keyMap[e.key]) {
      setManualMode();
      setActiveJutsu(keyMap[e.key], true);
    } else if (e.key === 'a' || e.key === 'A') {
      setAutoMode();
    } else if (e.key === 'm' || e.key === 'M') {
      sfxBtn.click();
    } else if (e.key === 'g' || e.key === 'G') {
      guideModal.classList.toggle('open');
    }
  });

  // Snapshot / Screenshot Tool
  snapshotBtn.addEventListener('click', () => {
    const w = camVideo.videoWidth || window.innerWidth;
    const h = camVideo.videoHeight || window.innerHeight;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = w;
    snapCanvas.height = h;
    const snapCtx = snapCanvas.getContext('2d');

    // Flip horizontal to match mirrored webcam
    snapCtx.translate(w, 0);
    snapCtx.scale(-1, 1);
    snapCtx.drawImage(camVideo, 0, 0, w, h);
    snapCtx.drawImage(effectsCanvas, 0, 0, w, h);

    const link = document.createElement('a');
    link.download = `naruto-jutsu-${activeJutsu}-${Date.now()}.png`;
    link.href = snapCanvas.toDataURL('image/png');
    link.click();

    flashMsg.textContent = `📸 Captured ${activeJutsu.toUpperCase()} Jutsu Photo!`;
    flashMsg.classList.add('show');
    setTimeout(() => flashMsg.classList.remove('show'), 2200);
  });

  // Draw Glowing Hand Skeleton
  function paintSkeleton(lm, colors) {
    if (!showSkeleton) return;
    pen.save();
    pen.shadowBlur = 18;
    pen.shadowColor = colors.glow;
    if (window.drawConnectors && window.HAND_CONNECTIONS) {
      window.drawConnectors(pen, lm, window.HAND_CONNECTIONS, { color: colors.bone, lineWidth: 3 });
    }
    pen.restore();

    pen.save();
    pen.shadowBlur = 10;
    pen.shadowColor = colors.glow;
    pen.fillStyle = colors.joint;
    for (const p of lm) {
      pen.beginPath();
      pen.arc(p.x * skeletonCanvas.width, p.y * skeletonCanvas.height, 3.5, 0, Math.PI * 2);
      pen.fill();
    }
    pen.restore();
  }

  // Resize Canvases to fit display
  function resize() {
    const w = camVideo.videoWidth || window.innerWidth;
    const h = camVideo.videoHeight || window.innerHeight;
    if (skeletonCanvas.width !== w || skeletonCanvas.height !== h) {
      skeletonCanvas.width = w;
      skeletonCanvas.height = h;
      effectsCanvas.width = w;
      effectsCanvas.height = h;
    }
  }

  // MediaPipe Hands Callback
  function onHandsResults(res) {
    resize();
    lastHandsData = res;
    if (showSkeleton) {
      pen.clearRect(0, 0, skeletonCanvas.width, skeletonCanvas.height);
      if (res.multiHandLandmarks && res.multiHandedness) {
        res.multiHandLandmarks.forEach((lm, i) => {
          const label = res.multiHandedness[i] ? res.multiHandedness[i].label : 'Left';
          const colors = PALETTES[label] || PALETTES.Left;
          paintSkeleton(lm, colors);
        });
      }
    }

    // Gesture Detection in Auto Mode
    if (detectionMode === 'auto') {
      const detected = window.jutsuDetector.detect(res, lastFaceLandmarks);
      const stable = window.jutsuDetector.getStableGesture();
      if (stable && stable !== 'none' && JUTSU_DATA[stable]) {
        setActiveJutsu(stable);
        updateHUD(stable, detected.handSignName);
      }
    }
  }

  // MediaPipe FaceMesh Callback
  function onFaceResults(res) {
    if (res.multiFaceLandmarks && res.multiFaceLandmarks.length > 0) {
      lastFaceLandmarks = res.multiFaceLandmarks;
    }
  }

  // Main Render Animation Loop (RAF)
  let lastTime = performance.now();
  function renderLoop(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    effects.update(dt);
    effects.clear();
    effects.render(lastHandsData, lastFaceLandmarks);

    requestAnimationFrame(renderLoop);
  }
  requestAnimationFrame(renderLoop);

  // Initialize MediaPipe Hands
  const hands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.65
  });
  hands.onResults(onHandsResults);

  // Initialize MediaPipe FaceMesh for Eye & Mouth Tracking
  let faceMesh = null;
  try {
    if (window.FaceMesh) {
      faceMesh = new FaceMesh({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      faceMesh.onResults(onFaceResults);
      faceMeshReady = true;
    }
  } catch (err) {
    console.warn('FaceMesh optional load error:', err);
  }

  // Start Camera
  let frameCount = 0;
  const camera = new Camera(camVideo, {
    onFrame: async () => {
      frameCount++;
      await hands.send({ image: camVideo });
      // Send every 2nd frame to FaceMesh to optimize CPU/GPU performance
      if (faceMesh && faceMeshReady && frameCount % 2 === 0) {
        try {
          await faceMesh.send({ image: camVideo });
        } catch (e) {}
      }
    },
    width: 1280,
    height: 720
  });

  camera.start().catch(err => {
    console.error('Camera failed to start:', err);
    flashMsg.textContent = 'Camera access denied or unavailable.';
    flashMsg.classList.add('show');
  });

  // Enable audio on first user touch / click
  window.addEventListener('click', () => {
    if (window.jutsuAudio) window.jutsuAudio.resume();
  }, { once: true });
});
