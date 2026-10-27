// Clean Event-Driven Mafia Audio Engine with Dedicated Night Playlist Player

export type SoundKey = "shot" | "morning" | "court" | "bell" | "countdown10" | "countdown3" | "night_ambient" | "flip" | "tick" | "alarm" | "gavel" | "gong" | "wake_buzz" | "warning_beep" | "victory";

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
  { key: "night_ambient", name: "آمبیانس شب", category: "فازها", defaultFile: "/voice/night/ambient_01.mp3", presets: [{ id: "classic", name: "تاریک" }] }
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
  private nightTracks: NightTrack[] = [
    { id: "1", title: "Habib - 02 - Khers Kuki", src: "/voice/night/Habib - 02 - Khers Kuki.mp3" },
    { id: "2", title: "Habib - 03 - Shahlay Man", src: "/voice/night/Habib - 03 - Shahlay Man.mp3" },
    { id: "3", title: "Habib - 05 - Mard", src: "/voice/night/Habib - 05 - Mard.mp3" },
    { id: "4", title: "Habib - 06 - Yaran Man", src: "/voice/night/Habib - 06 - Yaran Man.mp3" },
    { id: "5", title: "Ambient 01", src: "/voice/night/ambient_01.mp3" },
    { id: "6", title: "Dragon-Studio-Dark-Horror-Ambient-05-425468", src: "/voice/night/dragon-studio-dark-horror-ambient-05-425468.mp3" },
    { id: "7", title: "Dragon-Studio-Rooster-Crowing-364473", src: "/voice/night/dragon-studio-rooster-crowing-364473.mp3" },
    { id: "8", title: "Intrepidmedia-Gavel-Of-Justice-124029", src: "/voice/night/intrepidmedia-gavel-of-justice-124029.mp3" },
    { id: "9", title: "Mrfriends-Pistol-Shot-233473", src: "/voice/night/mrfriends-pistol-shot-233473.mp3" },
  ];
  private currentTrackIndex: number = 0;
  private isShuffle: boolean = true;
  private nightTargetVolume: number = 0.35;
  private nightFadeInterval: any = null;
  private nightSavedTime: number = 0;

  private constructor() {}

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

  public getNightTracks(): NightTrack[] {
    return this.nightTracks;
  }

  public getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
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
      if (this.currentTrackIndex !== index && this.nightAudio) {
        this.nightAudio.pause();
        this.nightAudio = null;
        this.nightSavedTime = 0;
      }
      this.currentTrackIndex = index;
    }
  }

  public nextTrack() {
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

  public startNight(fadeInDurationMs: number = 2000) {
    if (this.isMuted || typeof window === "undefined") return;

    if (this.nightFadeInterval) {
      clearInterval(this.nightFadeInterval);
      this.nightFadeInterval = null;
    }

    const track = this.nightTracks[this.currentTrackIndex] || this.nightTracks[0];
    if (!track) return;

    if (!this.nightAudio || !this.nightAudio.src.includes(track.src)) {
      this.nightAudio = new Audio(track.src);
      this.nightAudio.loop = true;
    }

    if (this.nightSavedTime > 0 && Number.isFinite(this.nightSavedTime)) {
      try {
        this.nightAudio.currentTime = this.nightSavedTime;
      } catch {}
    }

    const targetVol = Math.max(0.1, this.nightTargetVolume || 0.35);
    this.nightAudio.volume = 0.05;

    const playPromise = this.nightAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        const steps = 15;
        const stepTime = Math.max(50, Math.floor(fadeInDurationMs / steps));
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
      }).catch((e) => {
        console.warn("[AudioManager] Night audio play blocked or error:", e);
      });
    }
  }

  public pauseNightWithFadeOut(onComplete?: () => void, fadeOutDurationMs: number = 1400) {
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
    const stepTime = fadeOutDurationMs / steps;
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

  public playNightAmbient(vol: number = 0.3) {
    this.setNightVolume(vol);
    this.startNight(1800);
  }

  public isNightPlaying(): boolean {
    return !!(this.nightAudio && !this.nightAudio.paused);
  }

  public pauseNight(immediate: boolean = true) {
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
    this.pauseNight(true);
    this.nightSavedTime = 0;
    if (this.nightAudio) {
      this.nightAudio.currentTime = 0;
    }
  }

  public stopNightAmbient(fadeMs: number = 1200) {
    this.pauseNightWithFadeOut(undefined, fadeMs);
  }

  public playShot() {
    this.playFile("/voice/shot.mp3", 0.95);
  }

  public playMorning() {
    this.playFile("/voice/morning.mp3", 0.9);
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
      case "night_ambient": this.playNightAmbient(); break;
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

  public getCustomSound(_key: string): string | null { return null; }
  public setCustomSound(_key: string, _url: string | null) {}
  public getPreset(_key: string): string { return "classic"; }
  public setPreset(_key: string, _preset: string) {}

  public playFlip() {}
  public playTick() {}
  public playAlarm() {}
  public playGavel() {}
  public playGong() {}
  public playWakeBuzz() {}
  public playWarningBeep() {}
  public playVictory() {}
  public playBell() {}
  public playCustomTrack(_path: string) {}
  public triggerVibrate(_p: number[] = []) {}
}

export const audio = AudioManager.getInstance();
