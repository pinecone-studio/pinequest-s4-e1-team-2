// Web платформ — proxy байвал Google Mongolian TTS, байхгүй бол Web Speech API.

import { VoiceSettings, SpeakPriority, VOICE_CONFIG, AZURE_VOICES } from './config';

const isProxyReady = () =>
  Boolean(VOICE_CONFIG.ttsProxyUrl && !VOICE_CONFIG.ttsProxyUrl.includes('YOUR-BACKEND'));

class SpeechManager {
  private settings: VoiceSettings | null = null;
  private mnVoice: SpeechSynthesisVoice | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  configure(settings: VoiceSettings) {
    this.settings = settings;
  }

  speak(text: string, priority: SpeakPriority = 'normal') {
    const s = this.settings;
    if (!s || !s.enabled || !text) return;
    if (s.mode === 'B' && priority === 'low') return;

    if (priority === 'urgent') this.stopAll();

    if (isProxyReady()) {
      this.playViaProxy(text, s);
    } else {
      this.playViaBrowser(text, s);
    }
  }

  private playViaProxy(text: string, s: VoiceSettings) {
    const voice = AZURE_VOICES[s.gender];
    const url = `${VOICE_CONFIG.ttsProxyUrl}?${new URLSearchParams({ text, voice, rate: String(s.rate) })}`;
    const audio = new Audio(url);
    audio.volume = s.volume;
    this.currentAudio = audio;
    audio.play().catch((e) => console.warn('[Voice] proxy audio error:', e));
  }

  private playViaBrowser(text: string, s: VoiceSettings) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'mn-MN';
    u.rate = s.rate;
    u.volume = s.volume;
    if (this.mnVoice) u.voice = this.mnVoice;
    window.speechSynthesis.speak(u);
  }

  private stopAll() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  stop() {
    this.stopAll();
  }
}

export const speech = new SpeechManager();

export async function initAudio() {
  if (typeof window === 'undefined') return;
  // Монгол дуу байвал кэш хийнэ (Web Speech API fallback-д хэрэгтэй)
  const tryPick = () => {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    (speech as any).mnVoice =
      voices.find((v) => v.lang === 'mn-MN' || v.lang.startsWith('mn')) ?? null;
  };
  if (window.speechSynthesis) {
    tryPick();
    window.speechSynthesis.onvoiceschanged = tryPick;
  }
}
