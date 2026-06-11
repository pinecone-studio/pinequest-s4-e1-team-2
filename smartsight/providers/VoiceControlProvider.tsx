import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { VolumeManager } from 'react-native-volume-manager';

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startListening = useCallback(async () => {
    if (listeningRef.current) return;
    listeningRef.current = true;
    let granted = false;
    try {
      ({ granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync());
    } catch {
      listeningRef.current = false;
      return;
    }
    if (!granted) {
      listeningRef.current = false;
      return;
    }
    setListening(true);
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'mn-MN',
        interimResults: false,
        maxAlternatives: 1,
      });
    } catch {
      listeningRef.current = false;
      setListening(false);
    }
  }, []);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    const route = matchCommand(text);
    if (!route) return;
    ExpoSpeechRecognitionModule.stop();
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

  // Android: volume товч дарахад идэвхждэг
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = VolumeManager.addVolumeListener((result) => {
      if (result.type !== 'music') return;
      startListening();
    });
    return () => sub.remove();
  }, [startListening]);

  // iOS: 2 хуруугаар 700ms барихад идэвхждэг
  const panResponder = useRef(
    Platform.OS === 'ios'
      ? PanResponder.create({
          onStartShouldSetPanResponderCapture: (evt) =>
            evt.nativeEvent.touches.length >= 2,
          onMoveShouldSetPanResponderCapture: (evt) =>
            evt.nativeEvent.touches.length >= 2,
          onPanResponderGrant: () => {
            timerRef.current = setTimeout(() => startListening(), 700);
          },
          onPanResponderRelease: () => {
            if (timerRef.current) clearTimeout(timerRef.current);
          },
          onPanResponderTerminate: () => {
            if (timerRef.current) clearTimeout(timerRef.current);
          },
        })
      : null,
  ).current;

  return (
    <View style={{ flex: 1 }}>
      {children}

      {/* iOS: children-ий дараа render болдог тул ExploreOverlay (zIndex:999)-аас дээр байна */}
      {Platform.OS === 'ios' && panResponder && (
        <View
          style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}
          accessible
          accessibilityLabel="Дуут команд"
          accessibilityHint="Хоёр хуруугаар удаан дарж дуут командыг эхлүүлнэ"
          onMagicTap={startListening}
          {...panResponder.panHandlers}
        />
      )}

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
    zIndex: 1001,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
