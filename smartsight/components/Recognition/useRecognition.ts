import { useRef, useState, useCallback, useEffect } from "react";
import { Vibration } from "react-native";
import { CameraView } from "expo-camera";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { speech } from "@/src/voice";
import { detectDoorNumber, formatMoney, selectPrimaryBlock } from "./classifyRecognition";
import { detectMoneyViaTM } from "./detectMoneyViaTM";

const SCAN_INTERVAL_MS = 500;
const MONEY_CONSISTENCY_THRESHOLD = 1;
const MIN_BLOCK_RATIO = 0.01;

export type ResultType = "money" | "door" | "text" | "scanning" | "none";

export function useRecognition() {
  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const lastAnnouncedRef = useRef<string | null>(null);
  const moneyCandidateRef = useRef<number | null>(null);
  const moneyMatchCountRef = useRef(0);
  const [result, setResult] = useState("");
  const [resultType, setResultType] = useState<ResultType>("none");
  const [isScanning, setIsScanning] = useState(false);
  const lastResultRef = useRef<string>("");
  const lastResultTypeRef = useRef<ResultType>("none");
  const tooSmallCountRef = useRef(0);
  const hasSpokenIntroRef = useRef(false);

  useEffect(() => {
    if (!hasSpokenIntroRef.current) {
      hasSpokenIntroRef.current = true;
      setTimeout(() => {
        speech.speak("Мөнгө эсвэл хаалганы дугаар камер руу харуулна уу");
      }, 500);
    }
  }, []);

  const announce = useCallback((text: string, type: ResultType) => {
    if (text === lastAnnouncedRef.current) return;
    lastAnnouncedRef.current = text;
    setResult(text);
    setResultType(type);
    lastResultRef.current = text;
    lastResultTypeRef.current = type;
    tooSmallCountRef.current = 0;
    if (type === "money") {
      Vibration.vibrate([0, 100, 50, 100, 50, 100]);
    } else if (type === "door") {
      Vibration.vibrate([0, 200, 100, 200]);
    } else {
      Vibration.vibrate(100);
    }
    if (type === "money") {
      speech.speak(text);
      setTimeout(() => speech.speak(text), 1500);
    } else {
      speech.speak(text);
    }
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
        announce(formatMoney(denomination), "money");
        return true;
      }
      return false;
    },
    [announce]
  );

  const tick = useCallback(async () => {
    if (!cameraRef.current || busyRef.current) return;
    busyRef.current = true;
    setIsScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 1, shutterSound: false });
      if (!photo) return;
      const photoArea = photo.width * photo.height;
      const [tmMoney, ocrResult] = await Promise.all([
        detectMoneyViaTM(photo.uri),
        TextRecognition.recognize(photo.uri),
      ]);
      if (tmMoney !== null) {
        handleMoney(tmMoney);
        return;
      }
      handleMoney(null);
      const block = selectPrimaryBlock(ocrResult.blocks);
      if (block?.frame && photoArea > 0) {
        const blockRatio = (block.frame.width * block.frame.height) / photoArea;
        if (blockRatio < MIN_BLOCK_RATIO && block.text?.trim()) {
          tooSmallCountRef.current++;
          if (tooSmallCountRef.current >= 3) {
            speech.speak("Ойртуулна уу, текст жижиг байна");
            tooSmallCountRef.current = 0;
          }
          if (lastResultRef.current) {
            setResult(lastResultRef.current);
            setResultType(lastResultTypeRef.current);
          }
          return;
        }
      }
      const doorDetection = detectDoorNumber(block, photoArea);
      if (doorDetection) {
        announce(doorDetection, "door");
      } else if (block?.text?.trim()) {
        announce(block.text.trim(), "text");
      } else {
        lastAnnouncedRef.current = null;
        if (lastResultRef.current) {
          setResult(lastResultRef.current);
          setResultType(lastResultTypeRef.current);
        } else {
          setResultType("none");
        }
      }
    } catch {
      // ignore
    } finally {
      busyRef.current = false;
      setIsScanning(false);
    }
  }, [announce, handleMoney]);

  useEffect(() => {
    const id = setInterval(tick, SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  return { cameraRef, result, resultType, isScanning };
}
