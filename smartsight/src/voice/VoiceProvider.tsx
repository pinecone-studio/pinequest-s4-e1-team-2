// React context + useVoice() hook.
// Бүх дэлгэцүүдэд speak / vibrate / тохиргоог энд дамжуулна.

import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SETTINGS, VoiceSettings, SpeakPriority, AppMode,
} from './config';
import { speech, initAudio } from './speechManager';
import * as vibrate from './haptics';

// v3: хадгалсан эрэгтэй gender-ийг хүчингүй болгож, эмэгтэй default-ыг хүчээр ачаална
const STORAGE_KEY = 'ss_voice_settings_v3';

type VoiceContextValue = {
  settings: VoiceSettings;
  setSettings: (patch: Partial<VoiceSettings>) => void;
  speak: (text: string, priority?: SpeakPriority) => void;
  stop: () => void;
  vibrate: typeof vibrate;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({
  children, mode,
}: { children: React.ReactNode; mode?: AppMode }) {
  const [settings, setState] = useState<VoiceSettings>(DEFAULT_SETTINGS);

  useEffect(() => { initAudio(); }, []);

  // Хадгалсан тохиргоог ачаална. gender-ийг ХАДГАЛСНААС ҮЛ ХАМААРАН үргэлж эмэгтэй
  // болгоно (хэрэглэгч бүх дуу хоолойг эмэгтэй байхыг хүссэн).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        const saved = v ? JSON.parse(v) : {};
        setState((s) => ({ ...s, ...saved, gender: 'female' }));
      })
      .catch(() => setState((s) => ({ ...s, gender: 'female' })));
  }, []);

  // App-аас ирэх Mode A/B-г тугана
  useEffect(() => {
    if (mode) setState((s) => ({ ...s, mode }));
  }, [mode]);

  // Тохиргоог speech manager-т өгөөд хадгална
  useEffect(() => {
    speech.configure(settings);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  const setSettings = useCallback((patch: Partial<VoiceSettings>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const speak = useCallback(
    (text: string, priority: SpeakPriority = 'normal') => speech.speak(text, priority),
    [],
  );
  const stop = useCallback(() => speech.stop(), []);

  return (
    <VoiceContext.Provider value={{ settings, setSettings, speak, stop, vibrate }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice-ийг <VoiceProvider> дотор ашиглана уу');
  return ctx;
}
