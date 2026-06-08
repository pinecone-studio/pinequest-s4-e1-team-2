// Voice модулийн нэгдсэн гарлыг (public API)
//
// Хэрэглэх:
//   import { VoiceProvider, useVoice, Strings } from '@/src/voice';
//   <VoiceProvider mode={mode}> ... </VoiceProvider>
//   const { speak, stop, vibrate, settings, setSettings } = useVoice();

export * from './config';
export { VoiceProvider, useVoice } from './VoiceProvider';
export { speech, initAudio } from './speechManager';
export { playCue } from './cues';
export type { CueName } from './cues';
export * as Strings from './strings';
export * as Haptics from './haptics';
