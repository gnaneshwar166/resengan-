/**
 * Naruto Jutsu-Cam Gesture Detection Engine
 * Analyzes MediaPipe Hands (and Face) landmarks to identify classic Naruto seals & gestures
 */

class JutsuGestureDetector {
  constructor() {
    this.FINGER_TIPS = [8, 12, 16, 20];
    this.FINGER_PIPS = [6, 10, 14, 18];
    this.FINGER_MCPS = [5, 9, 13, 17];

    this.currentGesture = 'none';
    this.history = [];
    this.historyLength = 5;
  }

  // Distance helper
  dist(p1, p2) {
    if (!p1 || !p2) return 999;
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  // Check finger extensions accurately
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

    // Thumb: tip distance vs MCP distance to wrist
    const thumbTip = lm[4];
    const indexMcp = lm[5];
    const thumbMcp = lm[2];
    const dThumbTip = this.dist(thumbTip, wrist);
    const dThumbMcp = this.dist(thumbMcp, wrist);
    if (dThumbTip > dThumbMcp * 1.15 && this.dist(thumbTip, indexMcp) > 0.1) {
      states.thumb = true;
      states.extendedCount++;
    }

    // Four fingers: Tip distance to wrist vs PIP distance to wrist
    const keys = ['index', 'middle', 'ring', 'pinky'];
    for (let i = 0; i < 4; i++) {
      const tip = lm[this.FINGER_TIPS[i]];
      const pip = lm[this.FINGER_PIPS[i]];
      const mcp = lm[this.FINGER_MCPS[i]];
      const dTip = this.dist(tip, wrist);
      const dPip = this.dist(pip, wrist);
      const dMcp = this.dist(mcp, wrist);

      // Extended if tip is clearly farther than pip and mcp
      const isExt = dTip > dPip * 1.12 && dTip > dMcp * 1.25;
      states[keys[i]] = isExt;
      if (isExt) states.extendedCount++;
    }

    return states;
  }

  // Check if hand is deliberately open palm
  isOpenPalm(states, lm) {
    // Must have at least 4 fingers extended (including index, middle, ring)
    const wrist = lm[0];
    const midKnk = lm[9];
    // Hand must be elevated (wrist not off bottom of screen)
    if (wrist.y > 0.95) return false;
    // Fingers extended count
    return states.extendedCount >= 4;
  }

  // Check if hand is clenched fist or claw
  isFistOrClaw(states, lm) {
    const wrist = lm[0];
    if (wrist.y > 0.95) return false;
    // Closed fingers
    return states.extendedCount === 0 || (states.extendedCount === 1 && states.thumb);
  }

  // Check for Tiger Seal (Index & middle straight together, ring/pinky folded)
  isTigerSign(states, lm) {
    if (states.index && states.middle && !states.ring && !states.pinky) {
      const indexTip = lm[8];
      const middleTip = lm[12];
      return this.dist(indexTip, middleTip) < 0.09;
    }
    return false;
  }

  // Check for Prayer / Gasshō seal (Two hands pressed together vertically)
  isPrayerHands(lm1, lm2) {
    // Both hands must be pointing upwards
    const h1Vertical = lm1[8].y < lm1[0].y;
    const h2Vertical = lm2[8].y < lm2[0].y;
    if (!h1Vertical || !h2Vertical) return false;

    const wristDist = this.dist(lm1[0], lm2[0]);
    const indexTipDist = this.dist(lm1[8], lm2[8]);
    const midKnkDist = this.dist(lm1[9], lm2[9]);
    return wristDist < 0.16 && indexTipDist < 0.14 && midKnkDist < 0.15;
  }

  // Check for Cross hand seal (Shadow Clone cross "+" formation)
  isCrossSeal(lm1, lm2) {
    const h1States = this.getFingerStates(lm1);
    const h2States = this.getFingerStates(lm2);
    // Both hands must have index or middle fingers extended
    const h1Ext = h1States.index || h1States.middle;
    const h2Ext = h2States.index || h2States.middle;
    if (!h1Ext || !h2Ext) return false;

    // Both hands must be close to each other
    const centerDist = this.dist(lm1[9], lm2[9]);
    if (centerDist > 0.28) return false;

    // One hand predominantly horizontal, one vertical, or finger tips crossing
    const h1DirX = Math.abs(lm1[8].x - lm1[0].x);
    const h1DirY = Math.abs(lm1[8].y - lm1[0].y);
    const h2DirX = Math.abs(lm2[8].x - lm2[0].x);
    const h2DirY = Math.abs(lm2[8].y - lm2[0].y);

    const oneHorizOneVert = (h1DirX > h1DirY && h2DirY > h2DirX) || (h1DirY > h1DirX && h2DirX > h2DirY);
    return oneHorizOneVert || centerDist < 0.14;
  }

  // Analyze current frame landmarks
  detect(handsData, faceLandmarks) {
    const detected = {
      primaryJutsu: 'none',
      confidence: 0,
      handSignName: 'STANDBY · PERFORM A HAND SIGN',
      handsCount: 0
    };

    if (!handsData || !handsData.multiHandLandmarks || handsData.multiHandLandmarks.length === 0) {
      this.pushHistory('none');
      return detected;
    }

    const hands = handsData.multiHandLandmarks;
    detected.handsCount = hands.length;

    const h1 = hands[0];
    const h1States = this.getFingerStates(h1);

    let h2 = null;
    let h2States = null;
    if (hands.length > 1) {
      h2 = hands[1];
      h2States = this.getFingerStates(h2);
    }

    // Estimate face / mouth / eye position if available
    let mouthPos = { x: 0.5, y: 0.45 };
    let leftEyePos = { x: 0.45, y: 0.35 };
    let rightEyePos = { x: 0.55, y: 0.35 };

    if (faceLandmarks && faceLandmarks[0]) {
      const fl = faceLandmarks[0];
      if (fl[13]) mouthPos = { x: fl[13].x, y: fl[13].y };
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

      // C. SUSANOO (Both hands raised wide with open palms)
      const h1Wrist = h1[0];
      const h2Wrist = h2[0];
      const wideSpread = Math.abs(h1Wrist.x - h2Wrist.x) > 0.40;
      const bothHigh = h1Wrist.y < 0.60 && h2Wrist.y < 0.60;
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

    // Fireball: Tiger seal or hand in front of mouth
    const distToMouth = this.dist(handCenter, mouthPos);
    const isNearMouth = distToMouth < 0.22 && activeHand[0].y < mouthPos.y + 0.25;
    const isTiger = this.isTigerSign(activeStates, activeHand);

    if (isNearMouth && (isTiger || activeStates.extendedCount >= 2)) {
      detected.primaryJutsu = 'fireball';
      detected.confidence = 0.88;
      detected.handSignName = '🐯 TIGER SEAL (KATON: GŌKAKYŪ)';
      this.pushHistory('fireball');
      return detected;
    }

    // Sharingan -> Kamui: Index finger raised close to eye or temple
    const distToEye = Math.min(this.dist(activeHand[8], leftEyePos), this.dist(activeHand[8], rightEyePos));
    if (distToEye < 0.16 && activeStates.index && !activeStates.pinky) {
      detected.primaryJutsu = 'kamui';
      detected.confidence = 0.89;
      detected.handSignName = '👁️ FOCUS CHAKRA (SHARINGAN ➔ KAMUI)';
      this.pushHistory('kamui');
      return detected;
    }

    // 3. SINGLE HAND JUTSUS: Rasengan vs Chidori
    if (this.isOpenPalm(activeStates, activeHand)) {
      detected.primaryJutsu = 'rasengan';
      detected.confidence = 0.92;
      detected.handSignName = '🖐️ OPEN PALM (RASENGAN)';
      this.pushHistory('rasengan');
      return detected;
    } else if (this.isFistOrClaw(activeStates, activeHand)) {
      detected.primaryJutsu = 'chidori';
      detected.confidence = 0.88;
      detected.handSignName = '✊ CLENCHED CLAW (CHIDORI)';
      this.pushHistory('chidori');
      return detected;
    }

    // No recognized gesture
    this.pushHistory('none');
    detected.handSignName = 'STANDBY · PERFORM A HAND SIGN';
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
    this.currentGesture = (maxCount >= 3) ? maxG : 'none';
    return this.currentGesture;
  }
}

window.jutsuDetector = new JutsuGestureDetector();
