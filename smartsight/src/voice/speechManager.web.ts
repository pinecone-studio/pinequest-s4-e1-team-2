import { VoiceSettings, SpeakPriority, VOICE_CONFIG, CHIMEGE_VOICES } from './config';

const CHIMEGE_URL = 'https://api.chimege.com/v1.2/synthesize';

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

    if (VOICE_CONFIG.chimegeToken) {
      this.playViaChimege(text, s);
    } else {
      this.playViaBrowser(text, s);
    }
  }

  private async playViaChimege(text: string, s: VoiceSettings) {
    try {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }
      const sanitized = text.toLowerCase().replace(/[^Ѐ-ӿ\s?!.,\-'"]/g, ' ').trim().slice(0, 300);
      if (!sanitized) return;

      const response = await fetch(CHIMEGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Token': VOICE_CONFIG.chimegeToken,
          'voice-id': CHIMEGE_VOICES[s.gender],
          'speed': String(s.rate),
        },
        body: sanitized,
      });
      if (!response.ok) throw new Error(`Chimege ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = s.volume;
      this.currentAudio = audio;
      audio.play().catch((e) => console.warn('[Voice] Chimege audio error:', e));
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('[Voice] Chimege failed:', e);
      this.playViaBrowser(text, s);
    }
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
