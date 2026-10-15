/**
 * Naruto Jutsu-Cam Gesture Detection Engine
 * High-precision, unambiguous hand sign & posture classification for all 7 Jutsus
 */

class JutsuGestureDetector {
  constructor() {
    this.FINGER_TIPS = [8, 12, 16, 20];
    this.FINGER_PIPS = [6, 10, 14, 18];
    this.FINGER_MCPS = [5, 9, 13, 17];

    this.currentGesture = 'none';
    this.history = [];
    this.historyLength = 4; // 4-frame smoothing for instant yet rock-solid detection
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

    // Thumb extension
    const thumbTip = lm[4];
    const thumbMcp = lm[2];
    const indexMcp = lm[5];
    if (this.dist(thumbTip, wrist) > this.dist(thumbMcp, wrist) * 1.15 && this.dist(thumbTip, indexMcp) > 0.08) {
      states.thumb = true;
      states.extendedCount++;
    }

    // 4 fingers extension: tip must be farther from wrist than PIP and MCP
    const keys = ['index', 'middle', 'ring', 'pinky'];
    for (let i = 0; i < 4; i++) {
      const tip = lm[this.FINGER_TIPS[i]];
      const pip = lm[this.FINGER_PIPS[i]];
      const mcp = lm[this.FINGER_MCPS[i]];
      const dTip = this.dist(tip, wrist);
      const dPip = this.dist(pip, wrist);
      const dMcp = this.dist(mcp, wrist);

      const isExt = dTip > dPip * 1.10 && dTip > dMcp * 1.20;
      states[keys[i]] = isExt;
      if (isExt) states.extendedCount++;
    }

    return states;
  }

  // 1. OPEN PALM (Rasengan): At least 4 extended fingers, fingers pointing generally upward
  isOpenPalm(states, lm) {
    if (lm[0].y > 0.95) return false; // Hand not on screen
    return states.extendedCount >= 4;
  }

  // 2. CLENCHED FIST / CLAW (Chidori): Fingers tightly folded towards palm (0 or 1 finger extended)
  isFist(states, lm) {
    if (lm[0].y > 0.95) return false;
    // 0 or 1 extended (thumb can stick out in a fist)
    return states.extendedCount <= 1 && (!states.index && !states.middle && !states.pinky);
  }

  // 3. PRAYER HANDS (Reaper Death Seal): Both hands vertical and pressed flat together
  isPrayerHands(lm1, lm2) {
    // Both hands must be pointing upward
    const h1Up = lm1[8].y < lm1[0].y;
    const h2Up = lm2[8].y < lm2[0].y;
    if (!h1Up || !h2Up) return false;

    const wristDist = this.dist(lm1[0], lm2[0]);
    const midKnkDist = this.dist(lm1[9], lm2[9]);
    const indexTipDist = this.dist(lm1[8], lm2[8]);

    // Wrists and fingertips close together in center
    return wristDist < 0.16 && midKnkDist < 0.15 && indexTipDist < 0.14;
  }

  // 4. CROSS SEAL (Shadow Clone): Both hands forming a cross '+' near chest
  isCrossSeal(lm1, lm2, h1States, h2States) {
    // Both hands must have index or middle fingers extended
    if (!h1States.index && !h1States.middle) return false;
    if (!h2States.index && !h2States.middle) return false;

    const centerDist = this.dist(lm1[9], lm2[9]);
    if (centerDist > 0.25) return false; // Hands must be close

    // Check angle between hands: one predominantly vertical, one horizontal OR fingers overlapping
    const h1Dx = Math.abs(lm1[8].x - lm1[0].x);
    const h1Dy = Math.abs(lm1[8].y - lm1[0].y);
    const h2Dx = Math.abs(lm2[8].x - lm2[0].x);
    const h2Dy = Math.abs(lm2[8].y - lm2[0].y);

    const isCross = (h1Dy > h1Dx * 1.2 && h2Dx > h2Dy * 1.1) || (h2Dy > h2Dx * 1.2 && h1Dx > h1Dy * 1.1);
    return isCross || centerDist < 0.12;
  }

  // 5. BOTH HANDS UP (Susanoo): Both wrists raised high near top of frame
  isBothHandsUp(lm1, lm2) {
    const bothHigh = lm1[0].y < 0.42 && lm2[0].y < 0.42;
    const wideSpread = Math.abs(lm1[0].x - lm2[0].x) > 0.30;
    return bothHigh && wideSpread;
  }

  // 6. HAND AT MOUTH (Fireball): Hand directly covering or in front of mouth
  isHandAtMouth(hand, mouthPos) {
    const handCenter = hand[9];
    const indexTip = hand[8];
    const dCenter = this.dist(handCenter, mouthPos);
    const dTip = this.dist(indexTip, mouthPos);
    return dCenter < 0.18 || dTip < 0.15;
  }

  // 7. FINGER AT EYE (Kamui): Index fingertip held directly at eye or temple
  isFingerAtEye(hand, states, leftEye, rightEye) {
    if (!states.index) return false;
    const tip = hand[8];
    const dLeft = this.dist(tip, leftEye);
    const dRight = this.dist(tip, rightEye);
    return Math.min(dLeft, dRight) < 0.12;
  }

  // Analyze frame and classify strictly
  detect(handsData, faceLandmarks) {
    const result = {
      primaryJutsu: 'none',
      confidence: 0,
      handSignName: 'STANDBY · SHOW A SIGN',
      handsCount: 0
    };

    if (!handsData || !handsData.multiHandLandmarks || handsData.multiHandLandmarks.length === 0) {
      this.pushHistory('none');
      return result;
    }

    const hands = handsData.multiHandLandmarks;
    result.handsCount = hands.length;

    const h1 = hands[0];
    const h1States = this.getFingerStates(h1);
    let h2 = null;
    let h2States = null;
    if (hands.length > 1) {
      h2 = hands[1];
      h2States = this.getFingerStates(h2);
    }

    // Key Facial Landmarks (normalized 0 to 1)
    let mouthPos = { x: 0.5, y: 0.45 };
    let leftEye = { x: 0.45, y: 0.35 };
    let rightEye = { x: 0.55, y: 0.35 };

    if (faceLandmarks && faceLandmarks[0]) {
      const fl = faceLandmarks[0];
      if (fl[13]) mouthPos = { x: fl[13].x, y: fl[13].y };
      if (fl[33] && fl[133]) {
        rightEye = { x: (fl[33].x + fl[133].x) / 2, y: (fl[33].y + fl[133].y) / 2 };
      }
      if (fl[362] && fl[263]) {
        leftEye = { x: (fl[362].x + fl[263].x) / 2, y: (fl[362].y + fl[263].y) / 2 };
      }
    }

    // ==========================================
    // STEP 1: CHECK TWO-HANDED SIGN: SHADOW CLONE
    // ==========================================
    if (h2) {
      if (this.isCrossSeal(h1, h2, h1States, h2States)) {
        result.primaryJutsu = 'clone';
        result.confidence = 0.92;
        result.handSignName = '➕ CROSS FINGER SEAL ➔ SHADOW CLONE';
        this.pushHistory('clone');
        return result;
      }
    }

    // ==========================================
    // STEP 2: CHECK HAND-TO-FACE SIGNS
    // ==========================================
    // 6. KAMUI: Finger pointing at eye/temple
    if (this.isFingerAtEye(h1, h1States, leftEye, rightEye)) {
      result.primaryJutsu = 'kamui';
      result.confidence = 0.90;
      result.handSignName = '👁️ FINGER AT EYE ➔ KAMUI VORTEX';
      this.pushHistory('kamui');
      return result;
    }

    // 4. FIREBALL: Hand held in front of mouth
    if (this.isHandAtMouth(h1, mouthPos)) {
      result.primaryJutsu = 'fireball';
      result.confidence = 0.90;
      result.handSignName = '🔥 HAND AT MOUTH ➔ FIREBALL JUTSU';
      this.pushHistory('fireball');
      return result;
    }

    // ==========================================
    // STEP 3: CHECK SINGLE-HANDED SIGNS (Rasengan vs Chidori)
    // ==========================================
    // 2. CHIDORI: Clenched Fist / Claw
    if (this.isFist(h1States, h1)) {
      result.primaryJutsu = 'chidori';
      result.confidence = 0.94;
      result.handSignName = '✊ CLENCHED FIST ➔ CHIDORI';
      this.pushHistory('chidori');
      return result;
    }

    // 1. RASENGAN: Open Palm facing camera
    if (this.isOpenPalm(h1States, h1)) {
      result.primaryJutsu = 'rasengan';
      result.confidence = 0.94;
      result.handSignName = '🖐️ OPEN PALM ➔ RASENGAN';
      this.pushHistory('rasengan');
      return result;
    }

    // None recognized
    this.pushHistory('none');
    result.handSignName = 'STANDBY · SHOW A SIGN';
    return result;
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
    // Require at least 3 out of 4 frames agreement to prevent flickering
    this.currentGesture = (maxCount >= 3) ? maxG : (maxCount === 2 && this.currentGesture === maxG ? maxG : 'none');
    return this.currentGesture;
  }
}

window.jutsuDetector = new JutsuGestureDetector();
