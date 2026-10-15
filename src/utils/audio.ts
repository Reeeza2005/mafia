// Web Audio API Synthesizer & Custom Sound Effects Engine
// با پشتیبانی کامل از تغییر تمام صداها، پریست‌های اختصاصی و فایل‌های صوتی دلخواه

export type SoundKey =
  | 'tick'
  | 'alarm'
  | 'flip'
  | 'shot'
  | 'gavel'
  | 'court'
  | 'morning'
  | 'night'
  | 'wakeBuzz'
  | 'warningBeep'
  | 'gong'
  | 'victory';

export interface SoundDefinition {
  key: SoundKey;
  name: string;
  category: 'timer' | 'game' | 'action' | 'alert';
  description: string;
  presets: { id: string; name: string }[];
}

export const SOUND_DEFINITIONS: SoundDefinition[] = [
  {
    key: 'court',
    name: 'رسمیت دادگاه و محاکمه',
    category: 'action',
    description: 'صدای رسمی ورود به دادگاه و آغاز زمان دفاعیه متهمان',
    presets: [
      { id: 'classic', name: 'چکش دو ضرب سنگین' },
      { id: 'dramatic', name: 'کوبش دراماتیک دادگاه' },
      { id: 'fanfare', name: 'ترومپت فراخوان متهم' },
    ],
  },
  {
    key: 'morning',
    name: 'طلوع صبح و بیداری شهر',
    category: 'game',
    description: 'صدای ناقوس پرانرژی و روشن آغاز فاز روز',
    presets: [
      { id: 'classic', name: 'ناقوس سه ضربی سپیده‌دم' },
      { id: 'chime', name: 'زنگوله‌های صبحگاهی' },
      { id: 'brass', name: 'شیپور آفتاب' },
    ],
  },
  {
    key: 'night',
    name: 'غروب و آغاز فاز شب',
    category: 'game',
    description: 'صدای مرموز و تاریک خوابیدن شهر و آغاز فعالیت مافیا',
    presets: [
      { id: 'classic', name: 'ناقوس مرگ عمیق' },
      { id: 'wind', name: 'طنین باد سرد شبانه' },
      { id: 'subtle', name: 'خواب آرام و دلهره' },
    ],
  },

  {
    key: 'tick',
    name: 'تیک‌تاک تایمر',
    category: 'timer',
    description: 'صدای شمارش ثانیه‌های پایانی نوبت صحبت',
    presets: [
      { id: 'classic', name: 'کلاسیک چوبی' },
      { id: 'digital', name: 'دیجیتال ملایم' },
      { id: 'heartbeat', name: 'ضربان قلب' },
    ],
  },
  {
    key: 'alarm',
    name: 'پایان وقت صحبت',
    category: 'timer',
    description: 'آلارم اتمام زمان صحبت بازیکن در دادگاه یا چالش',
    presets: [
      { id: 'classic', name: 'سه بوق هشدار' },
      { id: 'buzzer', name: 'بازر ورزشی' },
      { id: 'bell', name: 'زنگ پایان زنگوله‌ای' },
    ],
  },
  {
    key: 'flip',
    name: 'چرخش و باز کردن کارت',
    category: 'game',
    description: 'صدای سه‌بعدی باز کردن کارت محرمانه نقش',
    presets: [
      { id: 'classic', name: 'ورق زدن سرعتی' },
      { id: 'magic', name: 'رمزآلود و جادویی' },
      { id: 'subtle', name: 'کلیک آرام' },
    ],
  },
  {
    key: 'shot',
    name: 'شلیک اسلحه و مرگ',
    category: 'action',
    description: 'صدای شلیک شبانه، تک‌تیرانداز یا تفنگدار',
    presets: [
      { id: 'classic', name: 'شلیک بمب و تفنگ' },
      { id: 'silenced', name: 'شلیک با خفه‌کن' },
      { id: 'heavy', name: 'شلیک تک‌تیر سنگین' },
    ],
  },
  {
    key: 'gavel',
    name: 'چکش دادگاه و قضاوت',
    category: 'action',
    description: 'کوبیدن چکش قاضی یا رأی‌گیری نهایی',
    presets: [
      { id: 'classic', name: 'کوبیدن چوب سنگین' },
      { id: 'double', name: 'دو ضربه پشت‌سرهم' },
      { id: 'echo', name: 'چکش همراه با طنین' },
    ],
  },
  {
    key: 'gong',
    name: 'ناقوس و گُنگ شروع رأی‌گیری',
    category: 'game',
    description: 'صدای زنگ عمیق آغاز فاز شب یا رأی‌گیری مخفی',
    presets: [
      { id: 'classic', name: 'گُنگ عمیق معبدی' },
      { id: 'brass', name: 'ناقوس برنجی بزرگ' },
      { id: 'dark', name: 'ساز دلهره‌آور بم' },
    ],
  },
  {
    key: 'wakeBuzz',
    name: 'بیدارباش و لرزش شبانه',
    category: 'alert',
    description: 'نوتیفیکیشن ملایم بیدارباش نقش‌ها در فاز شب',
    presets: [
      { id: 'classic', name: 'ملودی سه نتی آرام' },
      { id: 'chime', name: 'زنگوله نقره‌ای' },
      { id: 'vibe', name: 'لرزش پالسی' },
    ],
  },
  {
    key: 'warningBeep',
    name: 'اخطار و بیدارباش گرداننده',
    category: 'alert',
    description: 'هشدار و بیدارباش ارسالی گاد به بازیکنان',
    presets: [
      { id: 'classic', name: 'دو بوق ممتد' },
      { id: 'siren', name: 'آژیر هشدار خطر' },
      { id: 'pulse', name: 'پالس بم' },
    ],
  },
  {
    key: 'victory',
    name: 'نوای پیروزی و پایان بازی',
    category: 'game',
    description: 'مارش شادی و پیروزی ساید مافیا یا شهروندان',
    presets: [
      { id: 'classic', name: 'مارش پیروزی ارکسترال' },
      { id: 'fanfare', name: 'شیپور قهرمانی' },
      { id: 'celebration', name: 'جشن پرشور' },
    ],
  },
];

class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private customAudioCache: Map<SoundKey, HTMLAudioElement> = new Map();
  private soundPresets: Record<string, string> = {};
  private customSounds: Record<string, string> = {};

  constructor() {
    this.loadSettings();
    this.initUserGestureUnlock();
  }

    private initUserGestureUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const savedPresets = localStorage.getItem('mafia_sound_presets');
      if (savedPresets) this.soundPresets = JSON.parse(savedPresets);

      const savedCustom = localStorage.getItem('mafia_custom_sounds');
      if (savedCustom) {
        this.customSounds = JSON.parse(savedCustom);
        Object.entries(this.customSounds).forEach(([key, url]) => {
          if (url) {
            const audio = new Audio(url);
            this.customAudioCache.set(key as SoundKey, audio);
          }
        });
      }
    } catch {
      // Ignore
    }
  }

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted() {
    return this.isMuted;
  }

  // Set preset style for a sound
  public setPreset(key: SoundKey, presetId: string) {
    this.soundPresets[key] = presetId;
    localStorage.setItem('mafia_sound_presets', JSON.stringify(this.soundPresets));
  }

  public getPreset(key: SoundKey): string {
    return this.soundPresets[key] || 'classic';
  }

  // Upload or set a custom audio file (Data URL / Blob URL) for a sound
  public setCustomSound(key: SoundKey, dataUrl: string | null) {
    if (dataUrl) {
      this.customSounds[key] = dataUrl;
      const audio = new Audio(dataUrl);
      this.customAudioCache.set(key, audio);
    } else {
      delete this.customSounds[key];
      this.customAudioCache.delete(key);
    }
    localStorage.setItem('mafia_custom_sounds', JSON.stringify(this.customSounds));
  }

  public getCustomSound(key: SoundKey): string | null {
    return this.customSounds[key] || null;
  }

  // Play sound: first checks if custom uploaded file exists, else uses synth preset
  private playOrSynth(key: SoundKey, synthFallback: () => void) {
    if (this.isMuted) return;

    const customAudio = this.customAudioCache.get(key);
    if (customAudio) {
      try {
        customAudio.currentTime = 0;
        customAudio.play().catch(() => synthFallback());
        return;
      } catch {
        // Fall back to synth
      }
    }

    synthFallback();
  }

  // 1. Timer Tick
  public playTick() {
    this.playOrSynth('tick', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const preset = this.getPreset('tick');
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (preset === 'digital') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, ctx.currentTime);
          gain.gain.setValueAtTime(0.06, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.03);
        } else if (preset === 'heartbeat') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(90, ctx.currentTime);
          gain.gain.setValueAtTime(0.18, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        } else {
          // Classic
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.04);
        }
      } catch {}
    });
  }

  // 2. Timer Alarm
  public playAlarm() {
    this.playOrSynth('alarm', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const preset = this.getPreset('alarm');

        if (preset === 'bell') {
          [0, 0.25, 0.5].forEach((d) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1046.5, now + d);
            gain.gain.setValueAtTime(0.25, now + d);
            gain.gain.exponentialRampToValueAtTime(0.001, now + d + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + d);
            osc.stop(now + d + 0.35);
          });
        } else if (preset === 'buzzer') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.45);
        } else {
          // Classic 3 beeps
          [0, 0.18, 0.36].forEach((delay) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, now + delay);
            osc.frequency.setValueAtTime(587, now + delay + 0.08);
            gain.gain.setValueAtTime(0.2, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + delay);
            osc.stop(now + delay + 0.15);
          });
        }
      } catch {}
    });
  }

  // 3. Card Flip
  public playFlip() {
    this.playOrSynth('flip', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const preset = this.getPreset('flip');
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (preset === 'magic') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        } else {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } catch {}
    });
  }

  // 4. Gunshot
  public playShot() {
    this.playOrSynth('shot', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } catch {}
    });
  }

  // 5. Gavel Strike
    // Court Trial & Defense Sound
  public playCourt() {
    this.playOrSynth('court', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        // Two consecutive heavy wood hammer blows with resonant reverb
        [0, 0.16].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(180, now + offset);
          osc.frequency.exponentialRampToValueAtTime(50, now + offset + 0.28);
          gain.gain.setValueAtTime(0.45, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.28);
        });
      } catch {}
    });
  }

  // Morning Day Sunrise Sound
  public playMorning() {
    this.playOrSynth('morning', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        // Bright cheerful 3-note chime (C5 -> E5 -> G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.14);
          gain.gain.setValueAtTime(0.3, now + idx * 0.14);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.65);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.14);
          osc.stop(now + idx * 0.14 + 0.65);
        });
      } catch {}
    });
  }

  // Night Fall Ominous Sound
  public playNight() {
    this.playOrSynth('night', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 1.8);
        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.8);
      } catch {}
    });
  }

  public playGavel() {
    this.playOrSynth('gavel', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } catch {}
    });
  }

  // 6. Deep Gong
  public playGong() {
    this.playOrSynth('gong', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 1.2);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      } catch {}
    });
  }

  // 7. Silent Night Wake-up Chime
  public playWakeBuzz() {
    this.triggerVibrate([200, 100, 200, 100, 300]);
    this.playOrSynth('wakeBuzz', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.12, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.35);
        });
      } catch {}
    });
  }

  // 8. Warning Beep
  public playWarningBeep() {
    this.triggerVibrate([400, 150, 400, 150, 600]);
    this.playOrSynth('warningBeep', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [0, 0.22].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(440, now + delay);
          osc.frequency.setValueAtTime(330, now + delay + 0.1);
          gain.gain.setValueAtTime(0.25, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.2);
        });
      } catch {}
    });
  }

  // 9. Victory Fanfare
  public playVictory() {
    this.triggerVibrate([300, 150, 300, 150, 500, 200, 700]);
    this.playOrSynth('victory', () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        // Ascending triumphant chord progression: C4, E4, G4, C5
        [
          { f: 261.63, d: 0, l: 0.2 },
          { f: 329.63, d: 0.18, l: 0.2 },
          { f: 392.0, d: 0.36, l: 0.25 },
          { f: 523.25, d: 0.58, l: 0.8 },
        ].forEach((note) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.f, now + note.d);
          gain.gain.setValueAtTime(0.25, now + note.d);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.d + note.l);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + note.d);
          osc.stop(now + note.d + note.l);
        });
      } catch {}
    });
  }

  // Play sound by its SoundKey
  public playByKey(key: SoundKey) {
    switch (key) {
      case 'tick':
        this.playTick();
        break;
      case 'alarm':
        this.playAlarm();
        break;
      case 'flip':
        this.playFlip();
        break;
      case 'shot':
        this.playShot();
        break;
            case 'court':
        this.playCourt();
        break;
      case 'morning':
        this.playMorning();
        break;
      case 'night':
        this.playNight();
        break;
      case 'gavel':
        this.playGavel();
        break;
      case 'gong':
        this.playGong();
        break;
      case 'wakeBuzz':
        this.playWakeBuzz();
        break;
      case 'warningBeep':
        this.playWarningBeep();
        break;
      case 'victory':
        this.playVictory();
        break;
    }
  }

  // Device vibration helper
  public triggerVibrate(pattern: number[] = [300, 100, 300]) {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {}
  }
}

export const audio = new AudioManager();
