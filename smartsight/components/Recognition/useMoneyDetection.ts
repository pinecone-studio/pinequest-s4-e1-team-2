import { useRef, useState, useCallback, useEffect } from "react";
import { Vibration } from "react-native";
import { CameraView } from "expo-camera";
import { speech } from "@/src/voice";
import { formatMoney } from "./classifyRecognition";
import { detectMoneyViaTM } from "./detectMoneyViaTM";

const SCAN_INTERVAL_MS = 500;

export type MoneyStatus = "idle" | "scanning" | "money" | "unknown";

export function useMoneyDetection() {
  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const lastAnnouncedRef = useRef<number | null>(null);
  const spokeUnknownRef = useRef(false);
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<MoneyStatus>("idle");
  const hasSpokenIntroRef = useRef(false);

  useEffect(() => {
    if (!hasSpokenIntroRef.current) {
      hasSpokenIntroRef.current = true;
      setTimeout(() => {
        speech.speak("Мөнгө камер руу харуулна уу");
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
      const denomination = await detectMoneyViaTM(photo.uri);
      if (denomination !== null) {
        spokeUnknownRef.current = false;
        const text = formatMoney(denomination);
        setResult(text);
        setStatus("money");
        if (denomination !== lastAnnouncedRef.current) {
          lastAnnouncedRef.current = denomination;
          Vibration.vibrate([0, 100, 50, 100, 50, 100]);
          speech.speak(text);
          setTimeout(() => speech.speak(text), 1500);
        }
      } else {
        // 0.8-аас дээш ямар ч мөнгөтэй таарсангүй
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
