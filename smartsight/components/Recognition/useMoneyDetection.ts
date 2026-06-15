import { useRef, useState, useCallback, useEffect } from "react";
import { Vibration } from "react-native";
import { CameraView } from "expo-camera";
import { speech } from "@/src/voice";
// Хуучин on-device Teachable Machine хувилбар (хадгалсан, ашиглахгүй):
// import { detectMoneyViaTM } from "./detectMoneyViaTM";
import { detectMoneyViaOpenAI } from "./detectMoneyViaOpenAI";

// OpenAI API дуудлага тутамд ~1-2с, мөн зардал хэмнэх тул удаан интервал
const SCAN_INTERVAL_MS = 2500;
const CONSISTENCY_THRESHOLD = 1; // OpenAI нарийвчлалтай тул нэг таниулсан даруйд зарлана

export type MoneyStatus = "idle" | "scanning" | "money" | "unknown";

export function useMoneyDetection() {
  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const lastAnnouncedRef = useRef<string | null>(null);
  const candidateRef = useRef<string | null>(null);
  const candidateCountRef = useRef(0);
  const spokeUnknownRef = useRef(false);
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<MoneyStatus>("idle");
  const hasSpokenIntroRef = useRef(false);

  useEffect(() => {
    if (!hasSpokenIntroRef.current) {
      hasSpokenIntroRef.current = true;
      setTimeout(() => {
        speech.speak("Мөнгө таних. Мөнгөн дэвсгэртээ камер руу харуулна уу");
      }, 500);
    }
  }, []);

  const tick = useCallback(async () => {
    if (!cameraRef.current || busyRef.current) return;
    busyRef.current = true;
    setStatus("scanning");
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 1, shutterSound: false });
      if (!photo) return;
      // OpenAI монгол ярианы текст буцаана (ж: "арван мянган төгрөг") эс бол null
      const phrase = await detectMoneyViaOpenAI(photo.uri);
      if (phrase !== null) {
        // Тогтвортой байдал — N удаа дараалан ижил хариу таарвал л баталгаажна
        if (phrase === candidateRef.current) {
          candidateCountRef.current += 1;
        } else {
          candidateRef.current = phrase;
          candidateCountRef.current = 1;
        }
        if (candidateCountRef.current < CONSISTENCY_THRESHOLD) return;

        spokeUnknownRef.current = false;
        setResult(phrase);
        setStatus("money");
        if (phrase !== lastAnnouncedRef.current) {
          lastAnnouncedRef.current = phrase;
          Vibration.vibrate([0, 100, 50, 100, 50, 100]);
          // OpenAI-ийн буцаасан текстийг Chimege-ээр хэлнэ
          speech.speak(phrase);
          setTimeout(() => speech.speak(phrase), 1500);
        }
      } else {
        candidateRef.current = null;
        candidateCountRef.current = 0;
        lastAnnouncedRef.current = null;
        setResult("Танихгүй байна");
        setStatus("unknown");
        if (!spokeUnknownRef.current) {
          spokeUnknownRef.current = true;
          speech.speak("Танихгүй байна");
        }
      }
    } catch {
      // ignore
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    const id = setInterval(tick, SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  return { cameraRef, result, status };
}
