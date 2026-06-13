import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { registerAudioStopper, stopAllAudio } from '@/services/audio';
import { VOICE_CONFIG, CHIMEGE_VOICES, VoiceSettings, SpeakPriority } from './config';

const CHIMEGE_URL = 'https://api.chimege.com/v1.2/synthesize';

// Chimege нь ТОО хүлээж авдаггүй (зөвхөн кирилл). Тоог монгол үг болгож хөрвүүлнэ.
const MN_ONES = ['', 'нэг', 'хоёр', 'гурван', 'дөрвөн', 'таван', 'зургаан', 'долоон', 'найман', 'есөн'];
const MN_ONES_FINAL = ['', 'нэг', 'хоёр', 'гурав', 'дөрөв', 'тав', 'зургаа', 'долоо', 'найм', 'ес'];
const MN_TENS = ['', 'арван', 'хорин', 'гучин', 'дөчин', 'тавин', 'жаран', 'далан', 'наян', 'ерэн'];
const MN_TENS_FINAL = ['', 'арав', 'хорь', 'гуч', 'дөч', 'тавь', 'жар', 'дал', 'ная', 'ер'];

function mnNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  if (n === 0) return 'тэг';
  if (n > 99999) return String(n); // дэмжихгүй хязгаар
  const parts: string[] = [];
  let rem = n;

  const thousands = Math.floor(rem / 1000);
  rem = rem % 1000;
  if (thousands > 0) {
    const tT = Math.floor(thousands / 10);
    const tO = thousands % 10;
    if (tT > 0) parts.push(MN_TENS[tT]);
    if (tO > 0) parts.push(MN_ONES[tO]);
    parts.push(rem > 0 ? 'мянган' : 'мянга');
  }

  const hundreds = Math.floor(rem / 100);
  rem = rem % 100;
  if (hundreds > 0) {
    parts.push(MN_ONES[hundreds]);
    parts.push(rem > 0 ? 'зуун' : 'зуу');
  }

  const t = Math.floor(rem / 10);
  const o = rem % 10;
  if (t > 0) parts.push(o > 0 ? MN_TENS[t] : MN_TENS_FINAL[t]);
  if (o > 0) parts.push(MN_ONES_FINAL[o]);

  return parts.join(' ');
}

function sanitizeForChimege(text: string): string {
  return text
    // Таслалтай (10,000) болон энгийн тоог монгол үг болгоно
    .replace(/\d[\d,]*\d|\d/g, (m) => mnNumber(parseInt(m.replace(/,/g, ''), 10)))
    .toLowerCase()
    .replace(/[^Ѐ-ӿ\s?!.,\-'":]/g, ' ') // тоо/латин үсгийг хасна (Chimege зөвшөөрдөггүй)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < bytes.length ? chars[b2 & 63] : '=';
  }
  return result;
}

class SpeechManager {
  private settings: VoiceSettings | null = null;
  private sound: Audio.Sound | null = null;
  private playToken = 0;

  constructor() {
    registerAudioStopper(this.stopSelf);
  }

  configure(settings: VoiceSettings) {
    this.settings = settings;
  }

  async speak(text: string, priority: SpeakPriority = 'normal') {
    const s = this.settings;
    if (!s || !s.enabled || !text) return;
    if (s.mode === 'B' && priority === 'low') return;

    const token = this.playToken + 1;
    this.playToken = token;
    await stopAllAudio(this.stopSelf);
    await this.stopPlayback();
    if (token !== this.playToken) return;

    if (VOICE_CONFIG.chimegeToken) {
      await this.playViaChimege(text, s, token);
    } else {
      Speech.speak(text, { rate: s.rate, language: 'mn-MN' });
    }
  }

  private async playViaChimege(text: string, s: VoiceSettings, token: number) {
    try {
      const sanitized = sanitizeForChimege(text);
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

      const buffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      const uri = `data:audio/wav;base64,${base64}`;

      if (token !== this.playToken) return;

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: s.volume }
      );
      this.sound = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.sound = null;
        }
      });
    } catch (e) {
      console.warn('[Voice] Chimege failed, falling back to expo-speech:', e);
      if (token !== this.playToken) return;
      Speech.speak(text, { rate: this.settings?.rate, language: 'mn-MN' });
    }
  }

  private stopPlayback = async () => {
    if (this.sound) {
      const sound = this.sound;
      this.sound = null;
      await sound.stopAsync().catch(() => {});
      await sound.unloadAsync().catch(() => {});
    }
    await Speech.stop();
  };

  private stopSelf = async () => {
    this.playToken += 1;
    await this.stopPlayback();
  };

  private async stopAll() {
    this.playToken += 1;
    await stopAllAudio(this.stopSelf);
    await this.stopPlayback();
  }

  stop() {
    void this.stopAll();
  }
}

export const speech = new SpeechManager();

export async function initAudio() {}
