import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Upload,
  Play,
  Pause,
  Trash2,
  Volume2,
  VolumeX,
  Repeat,
  Radio,
  Sparkles,
  Zap,
  Moon,
  Sun,
  ShieldAlert,
  Skull,
  Settings2,
  RotateCcw,
  Check,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { AudioTrack, saveAudioTrack, getAudioTracks, deleteAudioTrack } from '../utils/audioStorage';
import { ambientGenerator } from '../utils/audioGenerator';
import { audio, SOUND_DEFINITIONS, SoundKey, SoundDefinition } from '../utils/audio';

interface AudioPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBroadcastAudio?: (action: string, trackName: string) => void;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({
  isOpen,
  onClose,
  onBroadcastAudio,
}) => {
  const [modalTab, setModalTab] = useState<'customize_sounds' | 'ambient_music'>('customize_sounds');

  // Background tracks state
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [ambientMode, setAmbientMode] = useState<string>('none');
  const [broadcastEnabled, setBroadcastEnabled] = useState(false);

  // Upload track state
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState<'night' | 'day' | 'trial' | 'effect' | 'custom'>('night');
  const [isUploading, setIsUploading] = useState(false);

  // Sound effects customization state
  const [customSoundMap, setCustomSoundMap] = useState<Record<string, string | null>>({});
  const [presetMap, setPresetMap] = useState<Record<string, string>>({});
  const [testPlayingKey, setTestPlayingKey] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load custom sound configurations
  const refreshSoundSettings = () => {
    const curCustom: Record<string, string | null> = {};
    const curPresets: Record<string, string> = {};
    SOUND_DEFINITIONS.forEach((def) => {
      curCustom[def.key] = audio.getCustomSound(def.key);
      curPresets[def.key] = audio.getPreset(def.key);
    });
    setCustomSoundMap(curCustom);
    setPresetMap(curPresets);
  };

  useEffect(() => {
    if (!isOpen) return;
    loadTracks();
    refreshSoundSettings();
  }, [isOpen]);

  const loadTracks = async () => {
    const list = await getAudioTracks();
    setTracks(list);
  };

  // Audio element management
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const a = audioRef.current;

    const onTimeUpdate = () => setCurrentTime(a.currentTime);
    const onLoadedMetadata = () => setDuration(a.duration || 0);
    const onEnded = () => {
      if (!isLooping) setIsPlaying(false);
    };

    a.addEventListener('timeupdate', onTimeUpdate);
    a.addEventListener('loadedmetadata', onLoadedMetadata);
    a.addEventListener('ended', onEnded);

    return () => {
      a.removeEventListener('timeupdate', onTimeUpdate);
      a.removeEventListener('loadedmetadata', onLoadedMetadata);
      a.removeEventListener('ended', onEnded);
    };
  }, [isLooping]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.loop = isLooping;
    }
    ambientGenerator.setVolume(volume);
  }, [volume, isLooping]);

  const handlePlayUploaded = (track: AudioTrack) => {
    ambientGenerator.stopAll();
    setAmbientMode('none');

    if (!audioRef.current) return;

    if (activeTrack?.id === track.id && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = track.dataUrl;
      audioRef.current.play();
      setActiveTrack(track);
      setIsPlaying(true);

      if (broadcastEnabled && onBroadcastAudio) {
        onBroadcastAudio('play', track.name);
      }
    }
  };

  const handleStopUploaded = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleTriggerAmbient = (mode: 'night' | 'day' | 'heartbeat') => {
    handleStopUploaded();
    setActiveTrack(null);

    if (ambientMode === mode) {
      ambientGenerator.stopAll();
      setAmbientMode('none');
    } else {
      setAmbientMode(mode);
      if (mode === 'night') ambientGenerator.playNightSuspense();
      if (mode === 'day') ambientGenerator.playDayDiscussion();
      if (mode === 'heartbeat') ambientGenerator.playTrialHeartbeat();

      if (broadcastEnabled && onBroadcastAudio) {
        onBroadcastAudio('ambient', mode === 'night' ? 'شب مافیا' : mode === 'day' ? 'بحث روز' : 'تپش دفاعیه');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const defaultName = file.name.replace(/\.[^/.]+$/, '');
      const newTrack: AudioTrack = {
        id: 'track_' + Date.now(),
        name: uploadName.trim() || defaultName,
        category: uploadCategory,
        dataUrl,
      };

      await saveAudioTrack(newTrack);
      await loadTracks();
      setUploadName('');
      setIsUploading(false);
      audio.playFlip();
    };

    reader.onerror = () => {
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    if (activeTrack?.id === id) {
      handleStopUploaded();
      setActiveTrack(null);
    }
    await deleteAudioTrack(id);
    await loadTracks();
  };

  // Sound FX Customization Handlers
  const handleTestSound = (key: SoundKey) => {
    setTestPlayingKey(key);
    audio.playByKey(key);
    setTimeout(() => setTestPlayingKey(null), 1200);
  };

  const handleSelectPreset = (key: SoundKey, presetId: string) => {
    audio.setPreset(key, presetId);
    refreshSoundSettings();
    audio.playByKey(key);
  };

  const handleUploadCustomSound = (key: SoundKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      audio.setCustomSound(key, dataUrl);
      refreshSoundSettings();
      audio.playByKey(key);
    };
    reader.readAsDataURL(file);
  };

  const handleResetSoundToDefault = (key: SoundKey) => {
    audio.setCustomSound(key, null);
    audio.setPreset(key, 'classic');
    refreshSoundSettings();
    audio.playByKey(key);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const filteredTracks = activeCategory === 'all' ? tracks : tracks.filter((t) => t.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 dir-rtl text-right select-none animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-950 border border-rose-500/40 flex items-center justify-center text-white shadow-lg shadow-rose-950/40">
              <Music className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">مدیریت و شخصی‌سازی تمام صداهای بازی</h3>
              <p className="text-[11px] text-neutral-400">
                تغییر افکت‌های صوتی، پریست‌ها، بارگذاری صدای دلخواه و موسیقی اتمسفر
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleStopUploaded();
              ambientGenerator.stopAll();
              setAmbientMode('none');
              onClose();
            }}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 mb-4 text-xs">
          <button
            onClick={() => setModalTab('customize_sounds')}
            className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              modalTab === 'customize_sounds'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>شخصی‌سازی تک‌تک صداهای بازی ({SOUND_DEFINITIONS.length})</span>
          </button>

          <button
            onClick={() => setModalTab('ambient_music')}
            className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              modalTab === 'ambient_music'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>موسیقی فازها و موزیک‌های طولانی</span>
          </button>
        </div>

        {/* TAB 1: CUSTOMIZE ALL SOUND EFFECTS */}
        {modalTab === 'customize_sounds' && (
          <div className="overflow-y-auto space-y-3 flex-1 pr-1">
            <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl text-[11px] text-neutral-300 flex items-center justify-between">
              <span>
                💡 برای هر یک از رویدادهای بازی می‌توانید از بین پریست‌های آماده انتخاب کنید یا فایل MP3 اختصاصی خود را آپلود نمایید.
              </span>
            </div>

            <div className="space-y-2.5">
              {SOUND_DEFINITIONS.map((def) => {
                const currentPreset = presetMap[def.key] || 'classic';
                const hasCustomFile = !!customSoundMap[def.key];
                const isTesting = testPlayingKey === def.key;

                return (
                  <div
                    key={def.key}
                    className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3 sm:p-3.5 space-y-2.5 hover:border-neutral-750 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{def.name}</span>
                          {hasCustomFile ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              فایل صوتی اختصاصی فعال است
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800 font-mono">
                              پریست: {def.presets.find((p) => p.id === currentPreset)?.name || currentPreset}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{def.description}</p>
                      </div>

                      {/* Action buttons: Test, Upload, Reset */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Test Button */}
                        <button
                          onClick={() => handleTestSound(def.key)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            isTesting
                              ? 'bg-amber-600 text-white border-amber-500 shadow-md animate-pulse'
                              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-750'
                          }`}
                          title="تست و پخش آزمایشی صدا"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>تست صدا</span>
                        </button>

                        {/* Upload Custom Audio File */}
                        <label className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-750 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer hover:text-white">
                          <Upload className="w-3 h-3 text-sky-400" />
                          <span>آپلود فایل</span>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => handleUploadCustomSound(def.key, e)}
                            className="hidden"
                          />
                        </label>

                        {/* Reset to Default */}
                        {hasCustomFile && (
                          <button
                            onClick={() => handleResetSoundToDefault(def.key)}
                            className="p-1.5 rounded-xl bg-neutral-900 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 border border-neutral-800 transition-colors cursor-pointer"
                            title="بازنشانی به حالت پیش‌فرض"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Presets Selector Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-neutral-900">
                      <span className="text-[10px] text-neutral-500 ml-1">پریست‌های صوتی:</span>
                      {def.presets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleSelectPreset(def.key, preset.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                            currentPreset === preset.id && !hasCustomFile
                              ? 'bg-rose-950 border-rose-600 text-rose-300 shadow-sm'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: AMBIENT MUSIC & LONG TRACKS */}
        {modalTab === 'ambient_music' && (
          <div className="overflow-y-auto space-y-4 flex-1 pr-1">
            {/* Active Audio Player Control Strip */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 shadow-inner space-y-3">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono block">در حال پخش:</span>
                  <span className="text-sm font-bold text-rose-400 truncate">
                    {ambientMode !== 'none'
                      ? ambientMode === 'night'
                        ? '🌙 اتمسفر رازآلود فاز شب (Synth Drone)'
                        : ambientMode === 'day'
                        ? '☀️ تم تفکر و گفتگوی روز'
                        : '💓 استرس تپش قلب دادگاه و دفاعیه'
                      : activeTrack?.name || 'هیچ قطعه‌ای پخش نمی‌شود'}
                  </span>
                </div>

                {/* Progress & Duration */}
                {activeTrack && (
                  <span className="text-xs font-mono text-neutral-400 shrink-0">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                )}
              </div>

              {/* Seek Bar (for uploaded tracks) */}
              {activeTrack && (
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-rose-600 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              )}

              {/* Controls Bar */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  {/* Loop Button */}
                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`p-2 rounded-xl text-xs flex items-center gap-1 border transition-all cursor-pointer ${
                      isLooping
                        ? 'bg-rose-950/70 border-rose-800 text-rose-300 font-bold'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                    title="تکرار مداوم (Loop)"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span className="text-[10px]">تکرار</span>
                  </button>

                  {/* Broadcast Toggle */}
                  <button
                    onClick={() => setBroadcastEnabled(!broadcastEnabled)}
                    className={`p-2 rounded-xl text-xs flex items-center gap-1 border transition-all cursor-pointer ${
                      broadcastEnabled
                        ? 'bg-amber-950/70 border-amber-800 text-amber-300 font-bold'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                    title="ارسال نام موسیقی به بازیکنان"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span className="text-[10px]">ارسال به بازیکنان</span>
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-2">
                  {volume === 0 ? <VolumeX className="w-4 h-4 text-neutral-500" /> : <Volume2 className="w-4 h-4 text-rose-400" />}
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-20 sm:w-28 accent-rose-600 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Quick Ambient Music Soundboard */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                موسیقی‌های اتمسفریک آماده بازی (تولید زنده هوشمند):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => handleTriggerAmbient('night')}
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all text-right cursor-pointer ${
                    ambientMode === 'night'
                      ? 'bg-purple-950/80 border-purple-500 shadow-lg shadow-purple-950/50 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-purple-800'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center shrink-0">
                    <Moon className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-xs block">موسیقی فاز شب</span>
                    <span className="text-[10px] text-neutral-400">اتمسفر دلهره‌آور مافیا</span>
                  </div>
                </button>

                <button
                  onClick={() => handleTriggerAmbient('day')}
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all text-right cursor-pointer ${
                    ambientMode === 'day'
                      ? 'bg-amber-950/80 border-amber-500 shadow-lg shadow-amber-950/50 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-amber-800'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center shrink-0">
                    <Sun className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-xs block">موسیقی فاز روز</span>
                    <span className="text-[10px] text-neutral-400">ریتم تفکر و بحث شهر</span>
                  </div>
                </button>

                <button
                  onClick={() => handleTriggerAmbient('heartbeat')}
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all text-right cursor-pointer ${
                    ambientMode === 'heartbeat'
                      ? 'bg-rose-950/80 border-rose-500 shadow-lg shadow-rose-950/50 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-rose-800'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-xs block">تپش دفاعیه</span>
                    <span className="text-[10px] text-neutral-400">استرس رأی‌گیری دادگاه</span>
                  </div>
                </button>
              </div>
            </div>

            {/* File Upload Section for Long Tracks */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-sky-400" />
                افزودن آهنگ پس‌زمینه دلخواه (MP3, WAV, OGG)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="عنوان آهنگ (مثلاً: موزیک گادفادر)"
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                />

                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="night">🌙 فاز شب</option>
                  <option value="day">☀️ فاز روز</option>
                  <option value="trial">⚖️ دفاعیه و دادگاه</option>
                  <option value="effect">💥 افکت صوتی</option>
                  <option value="custom">🎵 دلخواه</option>
                </select>

                <label className="cursor-pointer bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 text-center">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'در حال بارگذاری...' : 'انتخاب و آپلود آهنگ'}</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>

            {/* Uploaded Playlist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-300">
                  لیست آهنگ‌های بارگذاری‌شده ({tracks.length}):
                </h4>
                <div className="flex items-center gap-1">
                  {['all', 'night', 'day', 'trial'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                        activeCategory === cat ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'همه' : cat === 'night' ? 'شب' : cat === 'day' ? 'روز' : 'دفاعیه'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTracks.length === 0 ? (
                <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 text-center text-xs text-neutral-500">
                  هنوز آهنگ پس‌زمینه‌ای بارگذاری نشده است. فایل‌های MP3 خود را از بخش بالا اضافه کنید.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {filteredTracks.map((track) => {
                    const isThisPlaying = activeTrack?.id === track.id && isPlaying;
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isThisPlaying
                            ? 'bg-rose-950/40 border-rose-700/80 text-white'
                            : 'bg-neutral-950 border-neutral-850 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <button
                            onClick={() => handlePlayUploaded(track)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
                              isThisPlaying ? 'bg-rose-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                            }`}
                          >
                            {isThisPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          </button>
                          <div className="truncate text-right">
                            <span className="font-bold text-xs truncate block">{track.name}</span>
                            <span className="text-[10px] text-neutral-500">
                              {track.category === 'night' ? 'فاز شب' : track.category === 'day' ? 'فاز روز' : track.category === 'trial' ? 'دفاعیه' : 'سایر'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleDelete(track.id)}
                            className="p-1 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="حذف فایل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">
            صداها به صورت محلی در حافظه مرورگر ذخیره می‌شوند.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
