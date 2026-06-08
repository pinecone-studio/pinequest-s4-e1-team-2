import * as Speech from 'expo-speech';
import { VoiceSettings, SpeakPriority } from './config';

class SpeechManager {
  private settings: VoiceSettings | null = null;

  configure(settings: VoiceSettings) {
    this.settings = settings;
  }

  speak(text: string, priority: SpeakPriority = 'normal') {
    const s = this.settings;
    if (!s || !s.enabled || !text) return;

    if (s.mode === 'B' && priority === 'low') return;

    if (priority === 'urgent') {
      Speech.stop();
    }

    Speech.speak(text, { rate: s.rate, language: 'mn-MN' });
  }

  stop() {
    Speech.stop();
  }
}

export const speech = new SpeechManager();

export async function initAudio() {
  // expo-speech needs no initialization
}
