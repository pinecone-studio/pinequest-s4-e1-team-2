import { Audio } from "expo-av";
import { VOICE_CONFIG } from "./config";

// Chimege ярианы-таних (STT) REST эцэг. TTS-ийн synthesize-тэй ижил v1.2 API.
const CHIMEGE_TRANSCRIBE_URL = "https://api.chimege.com/v1.2/transcribe";

// Chimege transcribe нь 16kHz, 16-bit, моно PCM WAV-г найдвартай хүлээж авдаг.
// iOS дээр LINEARPCM-ээр шууд WAV бичнэ. (expo-av-г сонгосон шалтгаан: одоогийн
// dev build-д аль хэдийн орсон нь батлагдсан — mp3-ууд тоглодог.)
export const CHIMEGE_RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".wav",
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

/**
 * Бичигдсэн аудио файлыг Chimege STT руу илгээж монгол текст буцаана.
 * Файлын байт-уудыг түүхий биеэр (octet-stream) илгээнэ — Chimege-ийн REST
 * transcribe эцэг олон контейнерийг (WAV/M4A) задалдаг.
 */
export async function transcribeAudio(uri: string): Promise<string> {
  const token = VOICE_CONFIG.chimegeSttToken;
  if (!token) throw new Error("Chimege STT токен тохируулаагүй");

  // Локал файлыг blob болгож унших → fetch-ийн body-д шууд илгээнэ.
  const fileResp = await fetch(uri);
  const blob = await fileResp.blob();

  const res = await fetch(CHIMEGE_TRANSCRIBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      Token: token,
      Punctuate: "false",
    },
    body: blob,
  });

  const body = await res.text();
  if (!res.ok) {
    if (__DEV__) console.log("[Voice] transcribe HTTP", res.status, body);
    throw new Error(`Chimege STT ${res.status}: ${body}`);
  }

  // Хариу нь цэвэр текст эсвэл { text } JSON байж болно.
  try {
    const parsed = JSON.parse(body);
    return String(parsed.text ?? body).trim();
  } catch {
    return body.trim();
  }
}
