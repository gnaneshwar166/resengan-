/**
 * Naruto Jutsu-Cam Gesture Detection Engine
 * Analyzes MediaPipe Hands (and Face) landmarks to identify classic Naruto seals & gestures
 */

class JutsuGestureDetector {
  constructor() {
    this.FINGER_TIPS = [8, 12, 16, 20];
    this.FINGER_PIPS = [6, 10, 14, 18];
    this.FINGER_MCPS = [5, 9, 13, 17];

    // Smoothing & confidence state
    this.currentGesture = 'none';
    this.gestureConfidence = 0;
    this.history = [];
    this.historyLength = 5;
  }

  // Distance helper
  dist(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  // Check which fingers are extended
  getFingerStates(lm) {
    const wrist = lm[0];
    const states = {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
      extendedCount: 0
    };

    // Thumb: compare tip to MCP
    const thumbTip = lm[4];
    const indexMcp = lm[5];
    const wristDist = this.dist(thumbTip, wrist);
    const mcpDist = this.dist(indexMcp, wrist);
    if (this.dist(thumbTip, indexMcp) > 0.12 && wristDist > mcpDist * 0.9) {
      states.thumb = true;
      states.extendedCount++;
    }

    // Four fingers
    const keys = ['index', 'middle', 'ring', 'pinky'];
    for (let i = 0; i < 4; i++) {
      const tip = lm[this.FINGER_TIPS[i]];
      const pip = lm[this.FINGER_PIPS[i]];
      const mcp = lm[this.FINGER_MCPS[i]];
      const tipDist = this.dist(tip, wrist);
      const pipDist = this.dist(pip, wrist);
      const isExt = tipDist > pipDist * 1.08 && tip.y < mcp.y + 0.05;
      states[keys[i]] = isExt;
      if (isExt) states.extendedCount++;
    }

    return states;
  }

  // Check if hand is open palm
  isOpenPalm(states) {
    return states.extendedCount >= 4;
  }

  // Check if hand is clenched fist or claw
  isFistOrClaw(states) {
    return states.extendedCount <= 1;
  }

  // Check for Tiger Seal (Index & middle straight together, ring/pinky folded)
  isTigerSign(states, lm) {
    if (states.index && states.middle && !states.ring && !states.pinky) {
      // Check if index and middle tips are close together
      const indexTip = lm[8];
      const middleTip = lm[12];
      return this.dist(indexTip, middleTip) < 0.08;
    }
    return false;
  }

  // Check for Prayer / Gasshō seal (Two hands pressed together)
  isPrayerHands(lm1, lm2) {
    const wristDist = this.dist(lm1[0], lm2[0]);
    const indexTipDist = this.dist(lm1[8], lm2[8]);
    const midKnkDist = this.dist(lm1[9], lm2[9]);
    return wristDist < 0.18 && indexTipDist < 0.15 && midKnkDist < 0.16;
  }

  // Check for Cross hand seal (Shadow Clone cross "+" formation)
  isCrossSeal(lm1, lm2) {
    const h1States = this.getFingerStates(lm1);
    const h2States = this.getFingerStates(lm2);
    // Both hands have index or middle fingers extended
    const h1TwoFingers = (h1States.index || h1States.middle);
    const h2TwoFingers = (h2States.index || h2States.middle);
    if (!h1TwoFingers || !h2TwoFingers) return false;

    // Check if hands overlap in a cross
    const h1Mid = lm1[9];
    const h2Mid = lm2[9];
    const centerDist = this.dist(h1Mid, h2Mid);

    // One hand predominantly horizontal, one vertical, or finger tips crossing
    const h1DirX = Math.abs(lm1[8].x - lm1[0].x);
    const h1DirY = Math.abs(lm1[8].y - lm1[0].y);
    const h2DirX = Math.abs(lm2[8].x - lm2[0].x);
    const h2DirY = Math.abs(lm2[8].y - lm2[0].y);

    const oneHorizOneVert = (h1DirX > h1DirY && h2DirY > h2DirX) || (h1DirY > h1DirX && h2DirX > h2DirY);
    return centerDist < 0.22 && (oneHorizOneVert || centerDist < 0.12);
  }

  // Analyze current frame landmarks
  detect(handsData, faceLandmarks) {
    const detected = {
      primaryJutsu: 'none',
      confidence: 0,
      handSignName: 'STANDBY',
      handsCount: 0,
      handDetails: []
    };

    if (!handsData || !handsData.multiHandLandmarks || handsData.multiHandLandmarks.length === 0) {
      // If no hands but face is visible, check if looking directly for sharingan
      this.pushHistory('none');
      return detected;
    }

    const hands = handsData.multiHandLandmarks;
    const handedness = handsData.multiHandedness || [];
    detected.handsCount = hands.length;

    const h1 = hands[0];
    const h1Label = handedness[0] ? handedness[0].label : 'Left';
    const h1States = this.getFingerStates(h1);
    detected.handDetails.push({ label: h1Label, states: h1States, lm: h1 });

    let h2 = null;
    let h2States = null;
    if (hands.length > 1) {
      h2 = hands[1];
      const h2Label = handedness[1] ? handedness[1].label : 'Right';
      h2States = this.getFingerStates(h2);
      detected.handDetails.push({ label: h2Label, states: h2States, lm: h2 });
    }

    // Estimate face / mouth / eye position if available
    let mouthPos = { x: 0.5, y: 0.4 };
    let leftEyePos = { x: 0.45, y: 0.35 };
    let rightEyePos = { x: 0.55, y: 0.35 };
    let hasFace = false;

    if (faceLandmarks && faceLandmarks.length > 0) {
      hasFace = true;
      const fl = faceLandmarks[0];
      // FaceMesh landmarks: mouth 13/14, eyes 33/133, 362/263
      if (fl[13]) mouthPos = fl[13];
      if (fl[33] && fl[133]) {
        rightEyePos = { x: (fl[33].x + fl[133].x) / 2, y: (fl[33].y + fl[133].y) / 2 };
      }
      if (fl[362] && fl[263]) {
        leftEyePos = { x: (fl[362].x + fl[263].x) / 2, y: (fl[362].y + fl[263].y) / 2 };
      }
    }

    // 1. Check TWO-HAND JUTSUS FIRST
    if (h2) {
      // A. REAPER DEATH SEAL (Prayer / Gasshō seal)
      if (this.isPrayerHands(h1, h2)) {
        detected.primaryJutsu = 'reaper';
        detected.confidence = 0.95;
        detected.handSignName = '🙏 PRAYER SEAL (SHIKI FŪJIN)';
        this.pushHistory('reaper');
        return detected;
      }

      // B. SHADOW CLONE (Cross seal "+")
      if (this.isCrossSeal(h1, h2)) {
        detected.primaryJutsu = 'clone';
        detected.confidence = 0.92;
        detected.handSignName = '➕ CROSS SEAL (KAGE BUNSHIN)';
        this.pushHistory('clone');
        return detected;
      }

      // C. SUSANOO (Both hands raised wide or crossed over chest)
      const h1Wrist = h1[0];
      const h2Wrist = h2[0];
      const wideSpread = Math.abs(h1Wrist.x - h2Wrist.x) > 0.45;
      const bothHigh = h1Wrist.y < 0.65 && h2Wrist.y < 0.65;
      if (wideSpread && bothHigh && (h1States.extendedCount >= 3 && h2States.extendedCount >= 3)) {
        detected.primaryJutsu = 'susanoo';
        detected.confidence = 0.90;
        detected.handSignName = '🛡️ AVATAR AWAKENING (SUSANOO)';
        this.pushHistory('susanoo');
        return detected;
      }
    }

    // 2. CHECK HAND-TO-FACE JUTSUS (Fireball & Sharingan/Kamui)
    const activeHand = h1;
    const activeStates = h1States;
    const handCenter = activeHand[9];

    // Fireball: Tiger seal or hand cupped near mouth
    const distToMouth = this.dist(handCenter, mouthPos);
    const isNearMouth = distToMouth < 0.22;
    const isTiger = this.isTigerSign(activeStates, activeHand);

    if (isNearMouth && (isTiger || activeStates.extendedCount >= 2)) {
      detected.primaryJutsu = 'fireball';
      detected.confidence = 0.88;
      detected.handSignName = '🐯 TIGER SEAL (KATON: GŌKAKYŪ)';
      this.pushHistory('fireball');
      return detected;
    }

    // Sharingan -> Kamui: Hand / finger raised close to eye or temple
    const distToEye = Math.min(this.dist(activeHand[8], leftEyePos), this.dist(activeHand[8], rightEyePos));
    if (distToEye < 0.16 && (activeStates.index && !activeStates.pinky)) {
      detected.primaryJutsu = 'kamui';
      detected.confidence = 0.89;
      detected.handSignName = '👁️ FOCUS CHAKRA (SHARINGAN ➔ KAMUI)';
      this.pushHistory('kamui');
      return detected;
    }

    // 3. SINGLE HAND JUTSUS: Rasengan vs Chidori
    if (this.isOpenPalm(activeStates)) {
      detected.primaryJutsu = 'rasengan';
      detected.confidence = 0.92;
      detected.handSignName = '🖐️ OPEN PALM (RASENGAN)';
      this.pushHistory('rasengan');
      return detected;
    } else if (this.isFistOrClaw(activeStates)) {
      detected.primaryJutsu = 'chidori';
      detected.confidence = 0.88;
      detected.handSignName = '✊ CLENCHED CLAW (CHIDORI)';
      this.pushHistory('chidori');
      return detected;
    }

    this.pushHistory('none');
    detected.handSignName = 'READY';
    return detected;
  }

  pushHistory(gesture) {
    this.history.push(gesture);
    if (this.history.length > this.historyLength) {
      this.history.shift();
    }
  }

  getStableGesture() {
    if (this.history.length === 0) return 'none';
    const counts = {};
    for (const g of this.history) {
      counts[g] = (counts[g] || 0) + 1;
    }
    let maxG = 'none';
    let maxCount = 0;
    for (const g in counts) {
      if (counts[g] > maxCount) {
        maxCount = counts[g];
        maxG = g;
      }
    }
    return maxCount >= 3 ? maxG : this.currentGesture;
  }
}

window.jutsuDetector = new JutsuGestureDetector();
