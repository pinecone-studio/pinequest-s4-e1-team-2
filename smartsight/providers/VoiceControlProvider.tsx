import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { VolumeManager } from 'react-native-volume-manager';

// Дуут команд → route харилцаа
const COMMANDS = [
  { keywords: ['саад', 'мэдрэгч'], route: '/obstacle' },
  { keywords: ['байршил'], route: '/location' },
  { keywords: ['өрөө', 'хайх'], route: '/room-search' },
  { keywords: ['текст', 'унших'], route: '/ocr' },
  { keywords: ['таних'], route: '/recognize' },
  { keywords: ['тохиргоо'], route: '/settings' },
  { keywords: ['нүүр', 'гэр', 'эхлэл'], route: '/home' },
  { keywords: ['буцах'], route: 'back' },
];

function matchCommand(text: string): string | null {
  const lower = text.toLowerCase();
  for (const cmd of COMMANDS) {
    if (cmd.keywords.some((k) => lower.includes(k))) return cmd.route;
  }
  return null;
}

export function VoiceControlProvider({ children }: { children: React.ReactNode }) {
  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false);

  const startListening = useCallback(async () => {
    if (listeningRef.current) return;
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) return;
    listeningRef.current = true;
    setListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'mn-MN',
      interimResults: false,
      maxAlternatives: 1,
    });
  }, []);

  // Таних үр дүн
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    const route = matchCommand(text);
    if (!route) return;
    if (route === 'back') {
      router.back();
    } else {
      router.replace(route as any);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    listeningRef.current = false;
    setListening(false);
  });

  useSpeechRecognitionEvent('error', () => {
    listeningRef.current = false;
    setListening(false);
  });

  // Android: Volume товч дарахад идэвхждэг
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = VolumeManager.addVolumeListener(() => {
      startListening();
    });
    return () => sub.remove();
  }, [startListening]);

  return (
    <View style={{ flex: 1 }}>
      {/* iOS: дэлгэцийг удаан дарахад (long press) идэвхждэг */}
      {Platform.OS === 'ios' ? (
        <Pressable style={StyleSheet.absoluteFill} onLongPress={startListening} delayLongPress={800}>
          {children}
        </Pressable>
      ) : (
        children
      )}

      {/* Сонсож байгааг харуулах overlay */}
      {listening && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.text}>🎤 Сонсож байна…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.78)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
