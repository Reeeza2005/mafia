// Clean Event-Driven Mafia Audio Engine
export type SoundKey = "shot" | "morning" | "court" | "bell" | "countdown10" | "countdown3" | "night_ambient" | "flip" | "tick" | "alarm" | "gavel" | "gong" | "wake_buzz" | "warning_beep" | "victory" | "explosion";

export interface SoundDefinition {
  key: SoundKey;
  name: string;
  description?: string;
  category: string;
  defaultFile: string;
  presets: { id: string; name: string }[];
}

export const SOUND_DEFINITIONS: SoundDefinition[] = [
  { key: "shot", name: "شلیک سلاح", category: "گیم‌پلی", defaultFile: "/voice/shot.mp3", presets: [{ id: "classic", name: "کلت کمری" }] },
  { key: "morning", name: "بانگ صبح", category: "فازها", defaultFile: "/voice/morning.mp3", presets: [{ id: "classic", name: "خروس" }] },
  { key: "court", name: "چکش دادگاه", category: "دادگاه", defaultFile: "/voice/court.mp3", presets: [{ id: "classic", name: "چوب دادگاه" }] },
  { key: "countdown10", name: "شمارش ۱۰ ثانیه", category: "تایمر", defaultFile: "/voice/countdown10.mp3", presets: [{ id: "classic", name: "دیجیتال" }] },
  { key: "countdown3", name: "شمارش ۳ ثانیه", category: "تایمر", defaultFile: "/voice/countdown3.mp3", presets: [{ id: "classic", name: "کوتاه" }] },
  { key: "explosion", name: "انفجار بمب", category: "بمب", defaultFile: "/voice/explosion.mp3", presets: [{ id: "classic", name: "انفجار" }] }
];

export interface NightTrack {
  id: string;
  title: string;
  src: string;
}

export class AudioManager {
  private static instance: AudioManager;
  public isMuted: boolean = false;
  private sfxVolume: number = 0.85;

  private nightAudio: HTMLAudioElement | null = null;
  private nightTracks: NightTrack[] = [];
  private currentTrackIndex: number = 0;
  private isShuffle: boolean = false;
  private nightTargetVolume: number = 0.4;
  private nightFadeInterval: any = null;
  private nightSavedTime: number = 0;
  private lastMorningTime: number = 0;

  private constructor() {
    this.refreshNightTracks();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.nightAudio) {
      this.nightAudio.pause();
    }
  }

  public refreshNightTracks(onLoaded?: (tracks: NightTrack[]) => void) {
    if (typeof window === "undefined") return;
    fetch("/api/night-tracks")
      .then((r) => r.json())
      .then((data: NightTrack[]) => {
        if (Array.isArray(data) && data.length > 0) {
          this.nightTracks = data;
          if (this.currentTrackIndex >= data.length) {
            this.currentTrackIndex = 0;
          }
          if (onLoaded) onLoaded(data);
        }
      })
      .catch(() => {});
  }

  public getNightTracks(): NightTrack[] {
    return this.nightTracks;
  }

  public getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  public isNightPlaying(): boolean {
    return !!(this.nightAudio && !this.nightAudio.paused);
  }

  public setNightVolume(vol: number) {
    this.nightTargetVolume = Math.max(0, Math.min(1, vol));
    if (this.nightAudio && !this.nightAudio.paused && !this.nightFadeInterval) {
      this.nightAudio.volume = this.nightTargetVolume;
    }
  }

  public getNightVolume(): number {
    return this.nightTargetVolume;
  }

  public setShuffle(shuffle: boolean) {
    this.isShuffle = shuffle;
  }

  public getShuffle(): boolean {
    return this.isShuffle;
  }

  public selectTrack(index: number) {
    if (index >= 0 && index < this.nightTracks.length) {
      const wasPlaying = this.isNightPlaying();
      if (this.currentTrackIndex !== index && this.nightAudio) {
        this.nightAudio.pause();
        this.nightAudio = null;
        this.nightSavedTime = 0;
      }
      this.currentTrackIndex = index;
      if (wasPlaying) {
        this.playNight(false);
      }
    }
  }

  public nextTrack() {
    if (this.nightTracks.length === 0) return;
    let nextIdx: number;
    if (this.isShuffle && this.nightTracks.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * this.nightTracks.length);
      } while (nextIdx === this.currentTrackIndex);
    } else {
      nextIdx = (this.currentTrackIndex + 1) % this.nightTracks.length;
    }
    this.selectTrack(nextIdx);
  }

    public startNight(_durationMs?: number) {
    this.playNight(true);
  }

  public playNight(fadeIn: boolean = false) {
    if (this.isMuted || typeof window === "undefined" || this.nightTracks.length === 0) return;

    if (this.nightFadeInterval) {
      clearInterval(this.nightFadeInterval);
      this.nightFadeInterval = null;
    }

    const track = this.nightTracks[this.currentTrackIndex] || this.nightTracks[0];
    if (!track) return;

    if (!this.nightAudio || !this.nightAudio.src.includes(encodeURI(track.src))) {
      this.nightAudio = new Audio(encodeURI(track.src));
      this.nightAudio.loop = true;
    }

    if (this.nightSavedTime > 0 && Number.isFinite(this.nightSavedTime)) {
      try {
        this.nightAudio.currentTime = this.nightSavedTime;
      } catch {}
    }

    const targetVol = this.nightTargetVolume;

    if (!fadeIn) {
      this.nightAudio.volume = targetVol;
      this.nightAudio.play().catch(() => {});
      return;
    }

    this.nightAudio.volume = 0.05;
    const playPromise = this.nightAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        const steps = 15;
        const stepTime = 100;
        let step = 1;
        this.nightFadeInterval = setInterval(() => {
          step++;
          if (this.nightAudio) {
            this.nightAudio.volume = Math.min(targetVol, (step / steps) * targetVol);
          }
          if (step >= steps) {
            clearInterval(this.nightFadeInterval);
            this.nightFadeInterval = null;
          }
        }, stepTime);
      }).catch(() => {});
    }
  }

  public pauseNight(_immediate?: boolean) {
    if (this.nightFadeInterval) {
      clearInterval(this.nightFadeInterval);
      this.nightFadeInterval = null;
    }
    if (this.nightAudio) {
      this.nightSavedTime = this.nightAudio.currentTime;
      this.nightAudio.pause();
    }
  }

  public stopNight() {
    this.pauseNight();
    this.nightSavedTime = 0;
    if (this.nightAudio) {
      this.nightAudio.currentTime = 0;
    }
  }

  public pauseNightWithFadeOut(onComplete?: () => void, fadeOutDurationMs: number = 1500) {
    if (!this.nightAudio || this.nightAudio.paused) {
      if (onComplete) onComplete();
      return;
    }

    if (this.nightFadeInterval) {
      clearInterval(this.nightFadeInterval);
      this.nightFadeInterval = null;
    }

    const startVol = this.nightAudio.volume;
    const steps = 15;
    const stepTime = Math.max(30, Math.floor(fadeOutDurationMs / steps));
    let step = 0;

    this.nightFadeInterval = setInterval(() => {
      step++;
      if (this.nightAudio) {
        const nextVol = Math.max(0, startVol * (1 - step / steps));
        this.nightAudio.volume = nextVol;
      }
      if (step >= steps) {
        clearInterval(this.nightFadeInterval);
        this.nightFadeInterval = null;
        if (this.nightAudio) {
          this.nightSavedTime = this.nightAudio.currentTime;
          this.nightAudio.pause();
        }
        if (onComplete) {
          onComplete();
        }
      }
    }, stepTime);
  }

    public playFuse() {
    this.playFile("/voice/fuse.mp3", 0.9);
  }

  public playDefuse() {
    this.playFile("/voice/defuse.mp3", 0.95);
  }

  public playExplosion() {
    this.playFile("/voice/explosion.mp3", 1.0);
  }

  public playMorning() {
    const now = Date.now();
    if (now - this.lastMorningTime < 4000) return;
    this.lastMorningTime = now;
    this.playFile("/voice/morning.mp3", 0.95);
  }

  public playShot() {
    this.playFile("/voice/shot.mp3", 0.95);
  }

  public playCourt() {
    this.playFile("/voice/court.mp3", 0.9);
  }

  

  public playCountdown10() {
    this.playFile("/voice/countdown10.mp3", 0.85);
  }

  public playCountdown3() {
    this.playFile("/voice/countdown3.mp3", 0.85);
  }

  public playByKey(key: SoundKey) {
    switch (key) {
      case "shot": this.playShot(); break;
      case "morning": this.playMorning(); break;
      case "court": case "gavel": this.playCourt(); break;
      case "countdown10": case "alarm": this.playCountdown10(); break;
      case "countdown3": case "tick": this.playCountdown3(); break;
      case "explosion": this.playExplosion(); break;
      default: break;
    }
  }

  private playFile(path: string, volume: number = 0.8) {
    if (this.isMuted || typeof window === "undefined") return;
    try {
      const a = new Audio(path);
      a.volume = Math.max(0, Math.min(1, volume * this.sfxVolume));
      a.play().catch(() => {});
    } catch {}
  }

  public getCustomSound(_k: string): string | null { return null; }
  public setCustomSound(_k: string, _u: string | null) {}
  public getPreset(_k: string): string { return "classic"; }
  public setPreset(_k: string, _p: string) {}

  public playFlip() {}
  public playTick() {}
  public playAlarm() {}
  public playGavel() {}
  public playGong() {}
  public playWakeBuzz() {}
  public playWarningBeep() {}
  public playVictory() {}
  public playBell() {}
  public playCustomTrack(_p: string) {}
  public triggerVibrate(_p: number[] = []) {}
}

export const audio = AudioManager.getInstance();
