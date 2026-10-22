/** Quiet procedural audio; no downloads, speech services, or autoplay. */
export class AudioManager {
  private context?: AudioContext;
  private master?: GainNode;
  private voices = new Set<AudioScheduledSourceNode>();
  private timers = new Set<ReturnType<typeof setInterval>>();
  private enabled = true;
  private intensity = 0.3;
  private suspendedByPage = false;
  private visibility = () => {
    if (!this.context) return;
    if (document.hidden) {
      this.suspendedByPage = true;
      void this.context.suspend();
    } else if (this.suspendedByPage) {
      this.suspendedByPage = false;
      void this.context.resume().catch(() => {});
    }
  };
  constructor() {
    document.addEventListener("visibilitychange", this.visibility);
  }
  async unlock(): Promise<boolean> {
    try {
      this.context ??= new AudioContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.configure(this.enabled, this.intensity);
      }
      await this.context.resume();
      return this.context.state === "running";
    } catch {
      return false;
    }
  }
  configure(enabled: boolean, intensity: number): void {
    this.enabled = enabled;
    this.intensity = intensity;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        enabled ? intensity * 0.18 : 0,
        this.context.currentTime,
        0.1,
      );
  }
  private tone(
    frequency: number,
    duration: number,
    volume: number,
    pan = 0,
    delay = 0,
  ): void {
    if (
      !this.context ||
      !this.master ||
      !this.enabled ||
      this.context.state !== "running"
    )
      return;
    const time = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    panner.pan.value = pan;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(
      volume,
      time + Math.min(0.045, duration / 3),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(panner);
    panner.connect(this.master);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      panner.disconnect();
      this.voices.delete(oscillator);
    };
    oscillator.start(time);
    oscillator.stop(time + duration + 0.05);
  }
  private every(callback: () => void, ms: number): void {
    this.timers.add(setInterval(callback, ms));
  }
  ring(): void {
    this.stop();
    const chime = () => {
      this.tone(440, 0.5, 0.3, -0.4);
      this.tone(554, 0.5, 0.22, -0.4, 0.18);
    };
    chime();
    this.every(chime, 1600);
  }
  distractions(): void {
    this.stop();
    this.every(() => this.tone(950, 0.065, 0.11, 0.35), 1250);
    this.every(() => {
      this.tone(730, 0.42, 0.12, -0.45);
      this.tone(1020, 0.3, 0.065, -0.45, 0.1);
    }, 7300);
    // Abstract, speech-like tonal murmurs, deliberately without intelligible speech.
    this.every(() => {
      for (let i = 0; i < 5; i++) {
        this.tone(150 + (i % 3) * 32, 0.27, 0.075, -0.65, i * 0.24);
        this.tone(310 + (i % 2) * 40, 0.23, 0.025, -0.65, i * 0.24);
      }
    }, 4200);
  }
  stop(): void {
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers.clear();
    if (!this.context) return;
    // Muting is ramped by configure; short procedural voices already have soft envelopes.
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.voices.clear();
  }
  dispose(): void {
    this.stop();
    document.removeEventListener("visibilitychange", this.visibility);
    void this.context?.close();
  }
}
