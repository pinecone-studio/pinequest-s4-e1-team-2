import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, usePathname } from "expo-router";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { VolumeManager } from "react-native-volume-manager";

const COMMANDS = [
  { keywords: ["саад", "мэдрэгч"], route: "/obstacle" },
  { keywords: ["өрөө", "хайх"], route: "/room-search" },
  { keywords: ["текст", "унших"], route: "/ocr" },
  { keywords: ["мөнгө", "мөнгөн", "дэвсгэрт"], route: "/money" },
  { keywords: ["танилтын", "систем"], route: "/recognize" },
  { keywords: ["тохиргоо"], route: "/settings" },
  { keywords: ["нүүр", "гэр", "эхлэл", "буцах"], route: "/home" },
  { keywords: ["буцах"], route: "back" },
];

// Recognizer-т хүлээгдэж буй үгсийг сэжүүр болгож өгнө (mn-MN танилтыг сайжруулна)
const CONTEXTUAL_STRINGS = Array.from(new Set(COMMANDS.flatMap((c) => c.keywords)));

function matchCommand(text: string): string | null {
  const lower = text.toLowerCase().trim();
  for (const cmd of COMMANDS) {
    if (cmd.keywords.some((k) => lower.includes(k))) return cmd.route;
  }
  return null;
}

export function VoiceControlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false);
  const pathname = usePathname();
  const isHome = pathname === "/home";

  const startListening = useCallback(async () => {
    if (listeningRef.current) return;
    listeningRef.current = true;
    const { granted } =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      listeningRef.current = false;
      return;
    }
    setListening(true);
    try {
      ExpoSpeechRecognitionModule.start({
        lang: "mn-MN",
        interimResults: false,
        maxAlternatives: 5,
        contextualStrings: CONTEXTUAL_STRINGS,
        requiresOnDeviceRecognition: false,
      });
    } catch {
      listeningRef.current = false;
      setListening(false);
    }
  }, []);

  useSpeechRecognitionEvent("result", (event) => {
    // Бүх таамгийг шалгаж, командтай таарсан эхнийг авна
    let route: string | null = null;
    for (const r of event.results) {
      route = matchCommand(r.transcript ?? "");
      if (route) break;
    }
    if (!route) return;
    ExpoSpeechRecognitionModule.stop();
    if (route === "back") {
      router.back();
    } else {
      router.replace(route as any);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    listeningRef.current = false;
    setListening(false);
  });

  useSpeechRecognitionEvent("error", () => {
    listeningRef.current = false;
    setListening(false);
  });

  // Android: volume товч дарахад voice control идэвхждэг
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = VolumeManager.addVolumeListener(() => {
      startListening();
    });
    return () => sub.remove();
  }, [startListening]);

  return (
    <View style={{ flex: 1 }}>
      {children}

      {/* iOS: зөвхөн /home дэлгэцэд "Дуут команд" товч харагдана */}
      {Platform.OS === "ios" && isHome && (
        <TouchableOpacity
          style={[styles.voiceBtn, listening && styles.voiceBtnActive]}
          onPress={startListening}
          activeOpacity={0.75}
          accessible
          accessibilityLabel="Дуут команд"
          accessibilityHint="Дарж дуут командыг эхлүүлнэ"
          accessibilityRole="button"
        >
          <Text style={styles.voiceBtnIcon}>🎤</Text>
          <Text style={styles.voiceBtnLabel}>Дуут команд</Text>
        </TouchableOpacity>
      )}

      {/* Сонсож байна indicator — Android болон iOS хоёуланд */}
      {listening && (
        <View style={styles.listeningBadge} pointerEvents="none">
          <Text style={styles.listeningText}>🎤 Сонсож байна…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  voiceBtn: {
    position: "absolute",
    bottom: 36,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1C1C2E",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 32,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  voiceBtnActive: {
    backgroundColor: "#2D6A4F",
  },
  voiceBtnIcon: {
    fontSize: 22,
  },
  voiceBtnLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  listeningBadge: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.80)",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    zIndex: 1001,
  },
  listeningText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
