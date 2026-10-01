export type ForestSound = "start" | "jump" | "doubleJump" | "star" | "shield" | "hit" | "smash" | "checkpoint" | "win" | "finish";
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Gesture-unlocked, gentle local sound effects; no audio files or network calls. */
export class ForestAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Map<AudioScheduledSourceNode, AudioNode[]>();
  private muted = false;
  private disposed = false;
  private generation = 0;
  private lastStar = 0;

  unlock(): void {
    if (this.disposed || typeof window === "undefined") return;
    try {
      if (!this.context) {
        const Constructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
        if (!Constructor) return;
        this.context = new Constructor();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.28;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") void this.context.resume().catch(() => {});
    } catch { /* Audio is optional on every device. */ }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stop();
    try {
      if (this.context && this.master) this.master.gain.setValueAtTime(muted ? 0 : 0.28, this.context.currentTime);
    } catch {}
  }

  play(event: ForestSound): void {
    const context = this.context;
    if (this.disposed || this.muted || !context || !this.master || context.state === "closed") return;
    if (context.state === "running") { this.render(event); return; }
    const generation = this.generation;
    const requestedAt = Date.now();
    try {
      void context.resume().then(() => {
        if (generation === this.generation && Date.now() - requestedAt < 350) this.render(event);
      }).catch(() => {});
    } catch {}
  }

  stop(): void {
    this.generation += 1;
    for (const [source, nodes] of this.voices) {
      source.onended = null;
      try { source.stop(); } catch {}
      for (const node of nodes) { try { node.disconnect(); } catch {} }
    }
    this.voices.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    try { this.master?.disconnect(); } catch {}
    try { if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {}); } catch {}
    this.context = null; this.master = null;
  }

  private render(event: ForestSound): void {
    if (this.disposed || this.muted || this.context?.state !== "running") return;
    try {
      const now = this.context.currentTime + 0.006;
      switch (event) {
        case "jump": this.tone(280, now, 0.13, 0.20, "sine", 560); break;
        case "doubleJump": this.tone(440, now, 0.15, 0.16, "sine", 880); this.tone(659.25, now + 0.07, 0.13, 0.07); break;
        case "star":
          // Nearby stars can arrive together: keep the chime soft and bounded.
          if (now - this.lastStar < 0.07) break;
          this.lastStar = now;
          this.tone(880, now, 0.16, 0.14); this.tone(1318.5, now + 0.045, 0.20, 0.06); break;
        case "shield":
          [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => this.tone(note, now + i * 0.06, 0.25, 0.12)); break;
        case "hit":
          this.tone(220, now, 0.15, 0.14, "triangle", 160); this.tone(329.63, now + 0.12, 0.19, 0.08); break;
        case "smash":
          this.tone(110, now, 0.12, 0.23, "triangle", 55); this.tone(659.25, now + 0.05, 0.18, 0.12); break;
        case "checkpoint":
          [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => this.tone(note, now + i * 0.115, 0.3, 0.13)); break;
        case "start":
          [392, 523.25, 659.25].forEach((note, i) => this.tone(note, now + i * 0.12, 0.21, 0.14)); break;
        case "win":
          [392, 523.25, 659.25, 783.99, 1046.5].forEach((note, i) => this.tone(note, now + i * 0.14, i === 4 ? 0.7 : 0.28, 0.15));
          this.tone(261.63, now + 0.56, 0.7, 0.09); this.tone(392, now + 0.56, 0.7, 0.07); break;
        case "finish":
          [523.25, 440, 392, 523.25].forEach((note, i) => this.tone(note, now + i * 0.16, 0.3, 0.12)); break;
      }
    } catch { /* Interruptions remain silent. */ }
  }

  private tone(frequency: number, at: number, duration: number, volume: number, type: OscillatorType = "sine", endFrequency?: number): void {
    const context = this.context;
    if (!context || !this.master || this.voices.size >= 24) return;
    const source = context.createOscillator(); const gain = context.createGain();
    source.type = type; source.frequency.setValueAtTime(frequency, at);
    if (endFrequency) source.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration); gain.gain.linearRampToValueAtTime(0, at + duration + 0.012);
    source.connect(gain); gain.connect(this.master);
    const nodes: AudioNode[] = [source, gain]; this.voices.set(source, nodes);
    source.onended = () => {
      this.voices.delete(source);
      for (const node of nodes) { try { node.disconnect(); } catch {} }
      source.onended = null;
    };
    source.start(at); source.stop(at + duration + 0.016);
  }
}
