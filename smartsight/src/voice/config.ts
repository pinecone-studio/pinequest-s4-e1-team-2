export type VoiceGender = 'female' | 'male';
export type AppMode = 'A' | 'B';
export type SpeakPriority = 'low' | 'normal' | 'urgent';

export interface VoiceSettings {
  enabled: boolean;
  gender: VoiceGender;
  rate: number;   // 0.5–2.0
  volume: number; // 0–1
  mode: AppMode;
}

export const AZURE_VOICES: Record<VoiceGender, string> = {
  female: 'mn-MN-YesuiNeural',
  male: 'mn-MN-BataaNeural',
};

// Backend proxy: GET {ttsProxyUrl}?text=...&voice=...&rate=... -> audio/mpeg
export const VOICE_CONFIG = {
  ttsProxyUrl: process.env.EXPO_PUBLIC_TTS_PROXY_URL ?? 'https://YOUR-BACKEND/tts',
};

export const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  gender: 'male',
  rate: 1.1,
  volume: 1.0,
  mode: 'A',
};
