// ── Sound Engine ──────────────────────────────────────────────────────────────
// Uses Web Audio API to generate sounds — no external sound files needed.
// All sounds are synthesized on the fly so the app stays lightweight.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.18,
  startDelay = 0,
): void {
  try {
    const ac  = getCtx();
    const osc = ac.createOscillator();
    const g   = ac.createGain();

    osc.connect(g);
    g.connect(ac.destination);

    osc.type      = type;
    osc.frequency.setValueAtTime(frequency, ac.currentTime + startDelay);

    g.gain.setValueAtTime(0, ac.currentTime + startDelay);
    g.gain.linearRampToValueAtTime(gain, ac.currentTime + startDelay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + startDelay + duration);

    osc.start(ac.currentTime + startDelay);
    osc.stop(ac.currentTime + startDelay + duration + 0.05);
  } catch {
    // Audio context blocked — silently ignore
  }
}

export const SFX = {
  // Letter revealed — quick tick
  tick() {
    playTone(880, 0.06, "square", 0.06);
  },

  // STOP button tapped — punchy impact
  stop() {
    playTone(200, 0.12, "sawtooth", 0.22);
    playTone(140, 0.2,  "sawtooth", 0.12, 0.08);
  },

  // Correct answer — rising chime
  correct() {
    playTone(523, 0.12, "sine", 0.18);
    playTone(659, 0.12, "sine", 0.18, 0.1);
    playTone(784, 0.22, "sine", 0.22, 0.2);
  },

  // Wrong answer — buzzer
  wrong() {
    playTone(160, 0.08, "sawtooth", 0.25);
    playTone(130, 0.25, "sawtooth", 0.18, 0.07);
  },

  // Too slow — descending tone
  slow() {
    playTone(440, 0.1, "triangle", 0.18);
    playTone(330, 0.3, "triangle", 0.14, 0.08);
  },

  // Life lost — low thud
  lifeLost() {
    playTone(120, 0.3, "sine", 0.3);
    playTone(90,  0.4, "sine", 0.2, 0.15);
  },

  // Countdown beep
  countdown() {
    playTone(660, 0.09, "sine", 0.15);
  },

  // GO! — high beep
  go() {
    playTone(880, 0.15, "sine", 0.2);
  },

  // Level up / new tier
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => {
      playTone(f, 0.14, "sine", 0.2, i * 0.09);
    });
  },

  // Game over
  gameOver() {
    [440, 370, 330, 220].forEach((f, i) => {
      playTone(f, 0.22, "sawtooth", 0.18, i * 0.14);
    });
  },

  // New personal best — fanfare
  newBest() {
    [523, 659, 784, 659, 1047].forEach((f, i) => {
      playTone(f, 0.14, "sine", 0.22, i * 0.1);
    });
  },

  // Button tap — subtle click
  tap() {
    playTone(1200, 0.04, "sine", 0.08);
  },

  // Share / achievement unlocked
  achievement() {
    [784, 880, 1047].forEach((f, i) => {
      playTone(f, 0.15, "sine", 0.2, i * 0.08);
    });
  },

  // Keyboard key typed while guessing
  key() {
    playTone(660 + Math.random() * 100, 0.05, "sine", 0.07);
  },
};
