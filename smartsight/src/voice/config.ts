export type VoiceGender = 'female' | 'male';
export type AppMode = 'A' | 'B';
export type SpeakPriority = 'low' | 'normal' | 'urgent';

export interface VoiceSettings {
  enabled: boolean;
  gender: VoiceGender;
  rate: number;   // 0.2–4.0 (Chimege speed)
  volume: number; // 0–1
  mode: AppMode;
}

export const CHIMEGE_VOICES: Record<VoiceGender, string> = {
  female: 'FEMALE3v2',
  male: 'MALE1v2',
};

export const VOICE_CONFIG = {
  chimegeToken: process.env.EXPO_PUBLIC_CHIMEGE_TOKEN ?? '',
};

export const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  gender: 'male',
  rate: 1.0,
  volume: 1.0,
  mode: 'A',
};
