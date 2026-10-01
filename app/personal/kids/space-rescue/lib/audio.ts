export type SpaceSound = "start" | "shoot" | "alien" | "hit" | "boss" | "upgrade" | "rescue" | "win" | "lose";
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Small, gesture-unlocked synthesizer. Nothing is downloaded or played in the background. */
export class SpaceAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Map<AudioScheduledSourceNode, AudioNode[]>();
  private muted = false;
  private disposed = false;
  private generation = 0;
  private lastShot = -1;
  private lastAlien = -1;

  unlock(): void {
    if (this.disposed || typeof window === "undefined") return;
    try {
      if (!this.context) {
        const Constructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
        if (!Constructor) return;
        this.context = new Constructor();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.24;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") void this.context.resume().catch(() => {});
    } catch { /* Sound is optional on every device. */ }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stop();
    try {
      if (this.context && this.master) this.master.gain.setValueAtTime(muted ? 0 : 0.24, this.context.currentTime);
    } catch {}
  }

  play(event: SpaceSound): void {
    const context = this.context;
    if (this.disposed || this.muted || !context || !this.master || context.state === "closed") return;
    if (context.state === "running") { this.render(event); return; }
    const generation = this.generation, requestedAt = Date.now();
    try {
      void context.resume().then(() => {
        if (generation === this.generation && Date.now() - requestedAt < 300) this.render(event);
      }).catch(() => {});
    } catch {}
  }

  stop(): void {
    this.generation += 1;
    this.lastShot = -1; this.lastAlien = -1;
    for (const [source, nodes] of this.voices) {
      source.onended = null;
      try { source.stop(); } catch {}
      for (const node of nodes) { try { node.disconnect(); } catch {} }
    }
    this.voices.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.stop();
    try { this.master?.disconnect(); } catch {}
    try { if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {}); } catch {}
    this.context = null; this.master = null;
  }

  private render(event: SpaceSound): void {
    if (this.disposed || this.muted || this.context?.state !== "running") return;
    try {
      const now = this.context.currentTime + 0.006;
      switch (event) {
        case "shoot":
          if (now - this.lastShot < 0.18) return;
          this.lastShot = now; this.tone(720, now, 0.075, 0.035, "sine", 410); break;
        case "alien":
          if (now - this.lastAlien < 0.08) return;
          this.lastAlien = now; this.tone(380, now, 0.10, 0.10, "sine", 740); break;
        case "hit":
          this.tone(180, now, 0.16, 0.19, "triangle", 90);
          this.tone(330, now + 0.12, 0.13, 0.08); break;
        case "boss":
          [196, 246.94, 293.66].forEach((note, i) => this.tone(note, now + i * 0.14, 0.28, 0.13, "triangle")); break;
        case "start":
          [392, 523.25, 659.25, 783.99].forEach((note, i) => this.tone(note, now + i * 0.09, 0.20, 0.14)); break;
        case "upgrade":
          [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => this.tone(note, now + i * 0.07, 0.24, 0.12)); break;
        case "rescue":
          [523.25, 659.25, 783.99, 659.25, 1046.5].forEach((note, i) => this.tone(note, now + i * 0.13, 0.3, 0.13));
          this.tone(261.63, now + 0.52, 0.6, 0.07); break;
        case "win":
          [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((note, i) => this.tone(note, now + i * 0.14, i === 5 ? 0.7 : 0.3, 0.13));
          this.tone(261.63, now + 0.70, 0.7, 0.07); this.tone(392, now + 0.70, 0.7, 0.06); break;
        case "lose":
          [523.25, 440, 392, 329.63].forEach((note, i) => this.tone(note, now + i * 0.16, 0.28, 0.11)); break;
      }
    } catch { /* Audio interruptions must not interrupt a rescue. */ }
  }

  private tone(frequency: number, at: number, duration: number, volume: number, type: OscillatorType = "sine", endFrequency?: number): void {
    const context = this.context;
    if (!context || !this.master || this.voices.size >= 20) return;
    const source = context.createOscillator(), gain = context.createGain();
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
