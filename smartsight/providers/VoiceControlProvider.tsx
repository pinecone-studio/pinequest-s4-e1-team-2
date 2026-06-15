import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { VolumeManager } from "react-native-volume-manager";
import { AccessibleElement } from "@/components/AccessibleElement";
import { speech } from "@/src/voice";
import { playSoundFile } from "@/services/audio";
import { transcribeAudio, CHIMEGE_RECORDING_OPTIONS } from "@/src/voice/sttManager";

// "Заавар" товч (home.tsx) навигац хийдэггүй — энэ аудио зааврыг тоглуулдаг.
const INSTRUCTION_AUDIO = require("@/assets/haptics/Instruction.mp3");

const COMMANDS = [
  { keywords: ["саад", "мэдрэгч"], route: "/obstacle" },
  { keywords: ["өрөө", "хайх"], route: "/room-search" },
  { keywords: ["зам", "тээвэр"], route: "/transport" },
  { keywords: ["текст", "унших"], route: "/ocr" },
  { keywords: ["мөнгө", "мөнгөн", "дэвсгэрт", "таних"], route: "/recognize" },
  { keywords: ["тохиргоо"], route: "/settings" },
  { keywords: ["заавар", "тусламж"], route: "instructions" },
  { keywords: ["нүүр", "гэр", "эхлэл"], route: "/home" },
  { keywords: ["буцах", "хаах"], route: "back" },
];

// Хэдэн секунд бичих вэ (командууд богино тул 4с хангалттай)
const RECORD_MS = 4000;

// Дуут команд товч эдгээр дэлгэцэд ХАРАГДАХГҮЙ:
// - камер/ML тасралтгүй ажилладаг (Саад мэдрэгч, Танилтын систем) — микрофонтой зөрчилдөнө
// - нэвтрэх/эхлэлийн урсгал (товч дарж "ороогүй" дэлгэцүүд)
const VOICE_HIDDEN_ROUTES = [
  "/",
  "/login",
  "/register",
  "/onboarding",
  "/permission",
  "/modal",
];

// Нэвтрэх/эхлэлийн (feature БИШ) дэлгэцүүд — энд дуут товч харагдахгүй.
// Бусад БҮХ feature дэлгэцэд (Саад мэдрэгч, Танилтын систем-ийг оруулаад) харагдана.

// Нийлмэл (жагсаалт/форм) дэлгэцүүд: буцах товч доод талд шилжсэн тул дуут товчийг
// ДЭЭД-ЗҮҮН буланд (хуучин буцах товчны байранд) жижиг icon-оор байрлуулж, доод
// контент/товчтой давхцахаас сэргийлнэ.
const VOICE_TOP_ROUTES: string[] = [];

// Байршил дэлгэц: доод "байршил хайх" товчтой давхцахгүйн тулд дуут товчийг
// 1 товчны өндрөөр (≈88px) дээш гаргана.
const VOICE_RAISED_ROUTES = ["/location"];

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
  // "listening" = бичиж байна, "processing" = Chimege руу илгээж байна
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const busyRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pathname = usePathname();
  const isHome = pathname === "/home";
  // Дуут команд товч: home + бусад feature дэлгэцэд харагдана
  // (obstacle/recognize/нэвтрэх урсгалаас бусад)
  const showVoiceButton =
    Platform.OS === "ios" && !VOICE_HIDDEN_ROUTES.includes(pathname);
  const voiceAtTop = VOICE_TOP_ROUTES.includes(pathname);
  const voiceRaised = VOICE_RAISED_ROUTES.includes(pathname);

  const runVoiceCommand = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        busyRef.current = false;
        return;
      }

      // iOS-д бичлэг хийхээр аудио session тохируулна
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      recordingRef.current = recording;
      await recording.prepareToRecordAsync(CHIMEGE_RECORDING_OPTIONS);
      await recording.startAsync();

      // "Одоо ярь" дохио — чичиргээ (TTS-ийг бичихгүйн тулд яриа БИШ)
      setListening(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await new Promise((resolve) => setTimeout(resolve, RECORD_MS));

      await recording.stopAndUnloadAsync();
      recordingRef.current = null;
      setListening(false);
      void Haptics.selectionAsync();

      // Тоглуулах горимд буцаана (TTS сонсогдоно)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const uri = recording.getURI();
      if (!uri) {
        busyRef.current = false;
        return;
      }

      setProcessing(true);
      const text = await transcribeAudio(uri);
      setProcessing(false);

      const route = matchCommand(text);
      busyRef.current = false;

      if (!route) {
        speech.speak("Ойлгосонгүй. Дахин оролдоно уу.");
        return;
      }
      if (route === "back") {
        router.back();
      } else if (route === "instructions") {
        // "Заавар" товчтой адил — навигац хийхгүй, зөвхөн зааврын аудио тоглуулна
        void playSoundFile(INSTRUCTION_AUDIO);
      } else if (route === "/home") {
        // Нүүр рүү — стекийг давхар home-оор бүү дүүргэ
        router.replace("/home");
      } else {
        // push (replace БИШ) — ингэснээр зорилтот дэлгэцийн "Буцах" товч
        // (router.back) нүүр рүү зөв буцна
        router.push(route as any);
      }
    } catch (e) {
      if (__DEV__) console.log("[Voice] command error:", String(e));
      // Цэвэрлэгээ
      try {
        await recordingRef.current?.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch {}
      setListening(false);
      setProcessing(false);
      busyRef.current = false;
      speech.speak("Алдаа гарлаа. Дахин оролдоно уу.");
    }
  }, []);

  // Android: volume товч дарахад voice control идэвхждэг
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = VolumeManager.addVolumeListener(() => {
      runVoiceCommand();
    });
    return () => sub.remove();
  }, [runVoiceCommand]);

  const badgeText = processing ? "⏳ Боловсруулж байна…" : "🎤 Сонсож байна…";

  return (
    <View style={{ flex: 1 }}>
      {children}

      {/* iOS: home + feature дэлгэцүүдэд "Дуут команд" товч харагдана */}
      {showVoiceButton && (
        <AccessibleElement
          id="voice-command"
          label="Дуут команд"
          onActivate={runVoiceCommand}
          ignoreFocus
          style={[
            styles.voiceBtn,
            voiceAtTop
              ? // Нийлмэл дэлгэцэд: дээд-зүүн булан, жижиг icon
                styles.voiceBtnTop
              : // Бусад: доод төв; feature дэлгэцэд доод "Буцах" товчны дээр.
                // voiceRaised дэлгэцэд (Байршил) 1 товчоор дээш гаргана.
                {
                  bottom: isHome ? 36 : voiceRaised ? 228 : 140,
                  alignSelf: "center",
                },
            listening && styles.voiceBtnActive,
            // Хүрэлтийг доорх ExploreOverlay рүү нэвтрүүлнэ (explore унших + 2 дарж идэвхжүүлнэ)
            { pointerEvents: "none" },
          ]}
        >
          <Text style={styles.voiceBtnIcon}>🎤</Text>
          {!voiceAtTop && (
            <Text style={styles.voiceBtnLabel}>Дуут команд</Text>
          )}
        </AccessibleElement>
      )}

      {/* Сонсож/Боловсруулж байна indicator */}
      {(listening || processing) && (
        <View style={styles.listeningBadge} pointerEvents="none">
          <Text style={styles.listeningText}>{badgeText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  voiceBtn: {
    position: "absolute",
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
  // Нийлмэл дэлгэцэд: дээд-зүүн булан, жижиг icon (хуучин буцах товчны байр)
  voiceBtnTop: {
    top: 54,
    left: 16,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
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
