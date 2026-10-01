export type SoccerSound = "kick" | "save" | "goal" | "win" | "start";
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Small, local sound effects; audio is created only after a player gesture. */
export class SoccerAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Map<AudioScheduledSourceNode, AudioNode[]>();
  private muted = false;
  private disposed = false;
  private generation = 0;

  unlock(): void {
    if (this.disposed || typeof window === "undefined") return;
    try {
      if (!this.context) {
        const Constructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
        if (!Constructor) return;
        this.context = new Constructor();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.35;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") void this.context.resume().catch(() => {});
    } catch {
      // Audio support never prevents a save.
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stop();
    try {
      if (this.context && this.master) this.master.gain.setValueAtTime(muted ? 0 : 0.35, this.context.currentTime);
    } catch {}
  }

  play(event: SoccerSound): void {
    const context = this.context;
    if (this.disposed || this.muted || !context || !this.master || context.state === "closed") return;
    if (context.state === "running") {
      this.render(event);
      return;
    }
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
      for (const node of nodes) {
        try { node.disconnect(); } catch {}
      }
    }
    this.voices.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    try { this.master?.disconnect(); } catch {}
    try {
      if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
    } catch {}
    this.context = null;
    this.master = null;
  }

  private render(event: SoccerSound): void {
    if (this.disposed || this.muted || this.context?.state !== "running") return;
    try {
      const now = this.context.currentTime + 0.006;
      switch (event) {
        case "kick":
          this.tone(125, now, 0.12, 0.3, "sine", 45);
          this.tone(240, now, 0.035, 0.1, "triangle", 100);
          break;
        case "save":
          this.tone(145, now, 0.09, 0.22, "triangle", 70);
          this.tone(523.25, now + 0.06, 0.15, 0.18);
          this.tone(783.99, now + 0.17, 0.22, 0.16);
          break;
        case "goal":
          // A soft reset cue makes a missed save feel like another chance.
          this.tone(329.63, now, 0.17, 0.13);
          this.tone(293.66, now + 0.12, 0.24, 0.1);
          break;
        case "start":
          [392, 523.25, 659.25].forEach((note, index) => this.tone(note, now + index * 0.12, 0.2, 0.15));
          break;
        case "win":
          [392, 523.25, 659.25, 783.99, 1046.5].forEach((note, index) => this.tone(note, now + index * 0.14, index === 4 ? 0.55 : 0.24, 0.16));
          this.tone(261.63, now + 0.56, 0.6, 0.09);
          this.tone(392, now + 0.56, 0.6, 0.07);
          break;
      }
    } catch {
      // Device interruptions and platform limits should remain silent.
    }
  }

  private tone(frequency: number, at: number, duration: number, volume: number, type: OscillatorType = "sine", endFrequency?: number): void {
    const context = this.context;
    if (!context || !this.master) return;
    const source = context.createOscillator();
    const gain = context.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, at);
    if (endFrequency) source.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    gain.gain.linearRampToValueAtTime(0, at + duration + 0.01);
    source.connect(gain);
    gain.connect(this.master);
    const nodes: AudioNode[] = [source, gain];
    this.voices.set(source, nodes);
    source.onended = () => {
      this.voices.delete(source);
      for (const node of nodes) {
        try { node.disconnect(); } catch {}
      }
      source.onended = null;
    };
    source.start(at);
    source.stop(at + duration + 0.015);
  }
}
