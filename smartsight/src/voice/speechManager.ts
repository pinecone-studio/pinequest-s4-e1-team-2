import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { VOICE_CONFIG, AZURE_VOICES, VoiceSettings, SpeakPriority } from './config';

const isProxyReady = () =>
  Boolean(VOICE_CONFIG.ttsProxyUrl && !VOICE_CONFIG.ttsProxyUrl.includes('YOUR-BACKEND'));

class SpeechManager {
  private settings: VoiceSettings | null = null;
  private player: AudioPlayer | null = null;

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

  private playViaProxy(text: string, s: VoiceSettings) {
    if (this.player) {
      this.player.remove();
      this.player = null;
    }
    const voice = AZURE_VOICES[s.gender];
    const url = `${VOICE_CONFIG.ttsProxyUrl}?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&rate=${s.rate}`;
    const player = createAudioPlayer({ uri: url });
    this.player = player;
    player.play();
  }

  private stopAll() {
    if (this.player) {
      this.player.remove();
      this.player = null;
    }
    Speech.stop();
  }

  stop() {
    this.stopAll();
  }
}

export const speech = new SpeechManager();

export async function initAudio() {}
