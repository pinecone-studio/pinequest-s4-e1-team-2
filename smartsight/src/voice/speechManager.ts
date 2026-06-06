// Дараалал, давхцал, тасалдлыг удирдана.
// react-native-tts утасны дотоод TTS engine ашиглана (карт шаардахгүй, офлайн).

import Tts from 'react-native-tts';
import { VoiceSettings, SpeakPriority } from './config';

class SpeechManager {
  private settings: VoiceSettings | null = null;

  configure(settings: VoiceSettings) {
    this.settings = settings;
    Tts.setDefaultRate(settings.rate);
  }

  speak(text: string, priority: SpeakPriority = 'normal') {
    const s = this.settings;
    if (!s || !s.enabled || !text) return;

    // Mode B: бага ач холбогдолтой дуугийг алгасана
    if (s.mode === 'B' && priority === 'low') return;

    if (priority === 'urgent') {
      Tts.stop(); // одоо ярьж байгааг тасалж, яаралтай мэдэгдэл
    }

    Tts.speak(text);
  }

  stop() {
    Tts.stop();
  }
}

export const speech = new SpeechManager();

// Апп эхлэхэд нэг удаа дуудна
export async function initAudio() {
  try {
    await Tts.getInitStatus();
    await Tts.setDefaultLanguage('mn-MN');
    Tts.setDefaultPitch(1.0);
  } catch {
    // Монгол TTS байхгүй бол утасны default хэлээр ажиллана
  }
}
