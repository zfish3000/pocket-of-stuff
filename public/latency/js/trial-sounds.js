const START_TONE = { frequencyHz: 660, durationMs: 80 };
const END_TONE = { frequencyHz: 440, durationMs: 120 };
const TONE_GAIN = 0.05;

export class TrialSounds {
  constructor({ createAudioContext = createBrowserAudioContext } = {}) {
    this.createAudioContext = createAudioContext;
    this.context = null;
  }

  prepare() {
    try {
      this.context ??= this.createAudioContext?.() ?? null;
      if (this.context?.state === 'suspended') {
        this.context.resume()?.catch?.(() => {});
      }
    } catch {
      this.context = null;
    }
  }

  playStart() {
    this.playTone(START_TONE);
  }

  playEnd() {
    this.playTone(END_TONE);
  }

  playTone({ frequencyHz, durationMs }) {
    this.prepare();
    if (!this.context || this.context.state !== 'running') return;

    try {
      const startTime = this.context.currentTime;
      const endTime = startTime + durationMs / 1000;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequencyHz, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(TONE_GAIN, startTime + 0.005);
      gain.gain.setValueAtTime(TONE_GAIN, Math.max(startTime + 0.005, endTime - 0.01));
      gain.gain.linearRampToValueAtTime(0, endTime);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(startTime);
      oscillator.stop(endTime);
    } catch {
      // Audio is a nonessential cue; experiment timing and state continue without it.
    }
  }
}

function createBrowserAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}
