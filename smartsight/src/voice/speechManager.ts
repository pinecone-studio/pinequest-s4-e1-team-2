import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { VOICE_CONFIG, AZURE_VOICES, VoiceSettings, SpeakPriority } from './config';

const isProxyReady = () =>
  Boolean(VOICE_CONFIG.ttsProxyUrl && !VOICE_CONFIG.ttsProxyUrl.includes('YOUR-BACKEND'));

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

    if (isProxyReady()) {
      this.playViaProxy(text, s);
    } else {
      Speech.speak(text, { rate: s.rate, language: 'mn-MN' });
    }
  }

  private async playViaProxy(text: string, s: VoiceSettings) {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
      const voice = AZURE_VOICES[s.gender];
      const url = `${VOICE_CONFIG.ttsProxyUrl}?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&rate=${s.rate}`;
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true, volume: s.volume });
      this.sound = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.sound = null;
        }
      });
    } catch (e) {
      console.warn('[Voice] proxy failed, falling back to expo-speech:', e);
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
