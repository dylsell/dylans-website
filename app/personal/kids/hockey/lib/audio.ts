type HockeySound = "shot" | "goal" | "save" | "post" | "win" | "start";
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Arena audio stays on the device and is created only after a player gesture. */
export class HockeyAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private voices = new Map<AudioScheduledSourceNode, AudioNode[]>();
  private utterance: SpeechSynthesisUtterance | null = null;
  private muted = false;
  private disposed = false;
  private generation = 0;

  unlock(): void {
    if (this.disposed || typeof window === "undefined") return;
    try {
      if (!this.context) {
        const Context = window.AudioContext || (window as AudioWindow).webkitAudioContext;
        if (Context) {
          this.context = new Context();
          this.master = this.context.createGain();
          this.limiter = this.context.createDynamicsCompressor();
          this.master.gain.value = this.muted ? 0 : 0.6;
          this.limiter.threshold.value = -16;
          this.limiter.knee.value = 18;
          this.limiter.ratio.value = 5;
          this.limiter.attack.value = 0.006;
          this.limiter.release.value = 0.18;
          this.master.connect(this.limiter);
          this.limiter.connect(this.context.destination);
        }
      }
      if (this.context?.state === "suspended") void this.context.resume().catch(() => {});
    } catch {
      // A browser without usable audio can still run the complete game.
    }
    try {
      if (!this.muted && "speechSynthesis" in window) window.speechSynthesis.resume();
    } catch {}
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stop();
    try {
      if (this.master && this.context) {
        this.master.gain.cancelScheduledValues(this.context.currentTime);
        this.master.gain.setValueAtTime(muted ? 0 : 0.6, this.context.currentTime);
      }
    } catch {}
  }

  play(event: HockeySound): void {
    const context = this.context;
    if (this.disposed || this.muted || !context || !this.master || context.state === "closed") return;
    if (context.state === "running") {
      this.render(event);
      return;
    }
    // A gesture can resume asynchronously on mobile. Never replay stale sounds.
    const generation = this.generation;
    const requestedAt = Date.now();
    try {
      void context.resume().then(() => {
        if (generation === this.generation && Date.now() - requestedAt < 350) this.render(event);
      }).catch(() => {});
    } catch {}
  }

  announce(text: string): void {
    if (this.disposed || this.muted || typeof window === "undefined" || !text.trim()) return;
    try {
      if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
      const synthesis = window.speechSynthesis;
      // Explicitly use installed voices, so announcements need no speech service.
      const localVoices = synthesis.getVoices().filter((voice) => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang));
      const voice = localVoices.find((candidate) => candidate.default) ?? localVoices[0];
      if (!voice) return;
      this.cancelAnnouncement();
      const utterance = new SpeechSynthesisUtterance(text.trim().slice(0, 400));
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 1.04;
      utterance.pitch = 1.04;
      utterance.volume = 0.72;
      const finish = () => {
        if (this.utterance === utterance) this.utterance = null;
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      this.utterance = utterance;
      synthesis.speak(utterance);
    } catch {
      this.utterance = null;
    }
  }

  stop(): void {
    this.generation += 1;
    this.cancelAnnouncement();
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
    try { this.limiter?.disconnect(); } catch {}
    try {
      if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
    } catch {}
    this.context = null;
    this.master = null;
    this.limiter = null;
  }

  private cancelAnnouncement(): void {
    if (!this.utterance) return;
    this.utterance.onend = null;
    this.utterance.onerror = null;
    this.utterance = null;
    try { window.speechSynthesis.cancel(); } catch {}
  }

  private render(event: HockeySound): void {
    if (this.disposed || this.muted || this.context?.state !== "running") return;
    try {
      const now = this.context.currentTime + 0.008;
      switch (event) {
        case "shot":
          this.tone(210, now, 0.11, 0.12, "triangle", 70);
          this.noise(now, 0.16, 0.055, 2200, "highpass");
          break;
        case "save":
          this.tone(115, now, 0.17, 0.12, "sine", 48);
          this.noise(now, 0.13, 0.075, 650, "lowpass");
          break;
        case "post":
          this.tone(1175, now, 0.45, 0.07, "sine");
          this.tone(1763, now, 0.28, 0.027, "sine");
          break;
        case "goal":
          // A warm three-note arena horn with a short, filtered crowd swell.
          [196, 294, 392].forEach((frequency, index) => {
            this.tone(frequency, now, 0.72, index === 0 ? 0.075 : 0.035, "triangle", undefined, 0.07);
            this.tone(frequency, now + 0.85, 0.48, index === 0 ? 0.06 : 0.027, "triangle", undefined, 0.04);
          });
          this.noise(now + 0.12, 1.8, 0.11, 1100, "bandpass", 0.28);
          [523.25, 659.25, 783.99].forEach((frequency, index) => {
            this.tone(frequency, now + 0.15 + index * 0.115, 0.33, 0.045, "sine");
          });
          break;
        case "win":
          [392, 523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
            this.tone(frequency, now + index * 0.18, index === 4 ? 0.9 : 0.33, 0.065, "triangle", undefined, 0.025);
          });
          [261.63, 329.63, 392].forEach((frequency) => {
            this.tone(frequency, now + 0.72, 1.2, 0.04, "sine", undefined, 0.08);
          });
          this.noise(now + 0.5, 2, 0.1, 1200, "bandpass", 0.38);
          break;
        case "start":
          [392, 523.25, 783.99].forEach((frequency, index) => {
            this.tone(frequency, now + index * 0.13, 0.28, 0.055, "triangle", undefined, 0.02);
          });
          break;
      }
    } catch {
      // Device interruptions and platform audio limits never interrupt play.
    }
  }

  private tone(frequency: number, at: number, duration: number, volume: number, type: OscillatorType,
    endFrequency?: number, attack = 0.005): void {
    const context = this.context;
    if (!context || !this.master) return;
    const source = context.createOscillator();
    const gain = context.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, at);
    if (endFrequency) source.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    this.envelope(gain.gain, at, duration, volume, attack);
    source.connect(gain);
    gain.connect(this.master);
    this.track(source, [source, gain]);
    source.start(at);
    source.stop(at + duration + 0.015);
  }

  private noise(at: number, duration: number, volume: number, frequency: number,
    type: BiquadFilterType, attack = 0.005): void {
    const context = this.context;
    if (!context || !this.master) return;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.55;
    this.envelope(gain.gain, at, duration, volume, attack);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    this.track(source, [source, filter, gain]);
    source.start(at);
    source.stop(at + duration + 0.015);
  }

  private envelope(parameter: AudioParam, at: number, duration: number, volume: number, attack: number): void {
    parameter.setValueAtTime(0, at);
    parameter.linearRampToValueAtTime(volume, at + attack);
    parameter.exponentialRampToValueAtTime(0.001, at + duration);
    parameter.linearRampToValueAtTime(0, at + duration + 0.01);
  }

  private track(source: AudioScheduledSourceNode, nodes: AudioNode[]): void {
    this.voices.set(source, nodes);
    source.onended = () => {
      this.voices.delete(source);
      for (const node of nodes) {
        try { node.disconnect(); } catch {}
      }
      source.onended = null;
    };
  }
}
