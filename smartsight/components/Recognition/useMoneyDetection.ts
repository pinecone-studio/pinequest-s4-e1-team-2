import { useRef, useState, useCallback, useEffect } from "react";
import { Vibration } from "react-native";
import { CameraView } from "expo-camera";
import { speech } from "@/src/voice";
import { formatMoney } from "./classifyRecognition";
import { detectMoneyViaTM } from "./detectMoneyViaTM";

const SCAN_INTERVAL_MS = 500;

export function useMoneyDetection() {
  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const lastAnnouncedRef = useRef<number | null>(null);
  const [result, setResult] = useState("");
  const [isScanning, setIsScanning] = useState(false);
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
    setIsScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 1, shutterSound: false });
      if (!photo) return;
      const denomination = await detectMoneyViaTM(photo.uri);
      if (denomination !== null && denomination !== lastAnnouncedRef.current) {
        lastAnnouncedRef.current = denomination;
        const text = formatMoney(denomination);
        setResult(text);
        Vibration.vibrate([0, 100, 50, 100, 50, 100]);
        speech.speak(text);
        setTimeout(() => speech.speak(text), 1500);
      } else if (denomination === null) {
        lastAnnouncedRef.current = null;
      }
    } catch {
      // ignore
    } finally {
      busyRef.current = false;
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(tick, SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  return { cameraRef, result, isScanning };
}
