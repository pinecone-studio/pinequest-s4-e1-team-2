import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { VOICE_CONFIG, CHIMEGE_VOICES, VoiceSettings, SpeakPriority } from './config';

const CHIMEGE_URL = 'https://api.chimege.com/v1.2/synthesize';

function sanitizeForChimege(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^Ѐ-ӿ\s?!.,\-'"]/g, ' ')
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
      Speech.speak(text, { rate: s.rate, language: 'mn-MN' });
    }
  }

  private async playViaChimege(text: string, s: VoiceSettings) {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

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
      Speech.speak(text, { rate: this.settings?.rate, language: 'mn-MN' });
    }
  }

  private stopAll() {
    if (this.sound) {
      this.sound.unloadAsync();
      this.sound = null;
    }
    Speech.stop();
  }

  stop() {
    this.stopAll();
  }
}

export const speech = new SpeechManager();

export async function initAudio() {}
