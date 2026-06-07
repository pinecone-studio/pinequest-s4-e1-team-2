import { useRef, useState, useCallback, useEffect } from "react";
import { CameraView } from "expo-camera";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import Tts from "react-native-tts";
import {
  classifyByColor,
  detectDoorNumber,
  formatMoney,
  selectPrimaryBlock,
} from "./classifyRecognition";
import { sampleCenterColor } from "./sampleImageColor";

const SCAN_INTERVAL_MS = 1200;
const MONEY_CONSISTENCY_THRESHOLD = 3;

export function useRecognition() {
  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const lastAnnouncedRef = useRef<string | null>(null);
  const moneyCandidateRef = useRef<number | null>(null);
  const moneyMatchCountRef = useRef(0);
  const [result, setResult] = useState("");

  useEffect(() => {
    Tts.setDefaultLanguage("mn-MN");
  }, []);

  const announce = useCallback((text: string) => {
    if (text === lastAnnouncedRef.current) return;
    lastAnnouncedRef.current = text;
    setResult(text);
    Tts.speak(text);
  }, []);

  const handleMoney = useCallback(
    (denomination: number | null) => {
      if (denomination === null) {
        moneyCandidateRef.current = null;
        moneyMatchCountRef.current = 0;
        return false;
      }

      if (denomination === moneyCandidateRef.current) {
        moneyMatchCountRef.current += 1;
      } else {
        moneyCandidateRef.current = denomination;
        moneyMatchCountRef.current = 1;
      }

      if (moneyMatchCountRef.current >= MONEY_CONSISTENCY_THRESHOLD) {
        announce(formatMoney(denomination));
      }
      return true;
    },
    [announce]
  );

  const tick = useCallback(async () => {
    if (!cameraRef.current || busyRef.current) return;
    busyRef.current = true;

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 1, shutterSound: false });

      const hex = await sampleCenterColor(photo.uri);
      const denomination = hex ? classifyByColor(hex) : null;
      if (handleMoney(denomination)) return;

      const ocrResult = await TextRecognition.recognize(photo.uri);
      const block = selectPrimaryBlock(ocrResult.blocks);
      const doorDetection = detectDoorNumber(block, photo.width * photo.height);
      if (doorDetection) {
        announce(doorDetection);
      } else {
        lastAnnouncedRef.current = null;
      }
    } catch {
      // ignore — try again on the next interval tick
    } finally {
      busyRef.current = false;
    }
  }, [announce, handleMoney]);

  useEffect(() => {
    const id = setInterval(tick, SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  return { cameraRef, result };
}
