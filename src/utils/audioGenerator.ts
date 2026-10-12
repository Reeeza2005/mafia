// Built-in Synthesizer Ambient Music Generator for Mafia Game
// Generates continuous loops without requiring external MP3 files!

class AmbientMusicGenerator {
  private ctx: AudioContext | null = null;
  private currentMode: 'none' | 'night' | 'day' | 'heartbeat' = 'none';
  private nodes: { stop: () => void }[] = [];
  private volumeNode: GainNode | null = null;
  private volume: number = 0.5;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.volumeNode && this.ctx) {
      this.volumeNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public stopAll() {
    this.nodes.forEach((n) => {
      try {
        n.stop();
      } catch {}
    });
    this.nodes = [];
    this.currentMode = 'none';
  }

  public isPlaying(mode: string): boolean {
    return this.currentMode === mode;
  }

  // 1. Night Suspense Drone (اتمسفر رازآلود و دلهره‌آور فاز شب)
  public playNightSuspense() {
    this.stopAll();
    const ctx = this.getContext();
    if (!ctx) return;

    this.currentMode = 'night';
    this.volumeNode = ctx.createGain();
    this.volumeNode.gain.setValueAtTime(this.volume, ctx.currentTime);
    this.volumeNode.connect(ctx.destination);

    // Deep sub bass drone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, ctx.currentTime); // A1 note

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, ctx.currentTime);

    // Filter LFO for breathing darkness
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.15, ctx.currentTime); // very slow 0.15Hz
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(60, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    // Sine drone layer
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(110, ctx.currentTime); // A2

    const gainLayer = ctx.createGain();
    gainLayer.gain.setValueAtTime(0.3, ctx.currentTime);

    osc1.connect(filter);
    filter.connect(gainLayer);
    osc2.connect(gainLayer);
    gainLayer.connect(this.volumeNode);

    osc1.start();
    osc2.start();
    lfo.start();

    this.nodes.push(
      { stop: () => osc1.stop() },
      { stop: () => osc2.stop() },
      { stop: () => lfo.stop() }
    );
  }

  // 2. Day Investigation (ریتم تفکر و بحث فاز روز)
  public playDayDiscussion() {
    this.stopAll();
    const ctx = this.getContext();
    if (!ctx) return;

    this.currentMode = 'day';
    this.volumeNode = ctx.createGain();
    this.volumeNode.gain.setValueAtTime(this.volume, ctx.currentTime);
    this.volumeNode.connect(ctx.destination);

    // Warm ambient chords
    const chordFreqs = [130.81, 164.81, 196.0]; // C minor triad
    const oscs: OscillatorNode[] = [];

    chordFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(350, ctx.currentTime);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.15, ctx.currentTime);

      osc.connect(f);
      f.connect(g);
      g.connect(this.volumeNode!);
      osc.start();
      oscs.push(osc);
      this.nodes.push({ stop: () => osc.stop() });
    });
  }

  // 3. Heartbeat & Urgency for Trial & Defense (صدای تپش قلب و استرس دفاعیه)
  public playTrialHeartbeat() {
    this.stopAll();
    const ctx = this.getContext();
    if (!ctx) return;

    this.currentMode = 'heartbeat';
    this.volumeNode = ctx.createGain();
    this.volumeNode.gain.setValueAtTime(this.volume, ctx.currentTime);
    this.volumeNode.connect(ctx.destination);

    let active = true;
    const beat = () => {
      if (!active || !ctx) return;
      const now = ctx.currentTime;

      // lub
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(80, now);
      osc1.frequency.exponentialRampToValueAtTime(30, now + 0.12);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.volumeNode!);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // dub
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(70, now + 0.22);
      osc2.frequency.exponentialRampToValueAtTime(25, now + 0.35);
      gain2.gain.setValueAtTime(0.3, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(this.volumeNode!);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.35);

      setTimeout(beat, 1100);
    };

    beat();
    this.nodes.push({ stop: () => { active = false; } });
  }
}

export const ambientGenerator = new AmbientMusicGenerator();
