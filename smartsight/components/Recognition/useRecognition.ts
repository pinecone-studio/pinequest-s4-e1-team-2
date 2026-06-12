import { useRef, useState, useCallback, useEffect } from "react";
import { Vibration } from "react-native";
import { CameraView } from "expo-camera";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { speech } from "@/src/voice";
import { detectDoorNumber, formatMoney, selectPrimaryBlock } from "./classifyRecognition";
import { detectMoneyViaTM } from "./detectMoneyViaTM";

const SCAN_INTERVAL_MS = 800;
const MIN_BLOCK_RATIO = 0.01;

export type ResultType = "door" | "text" | "money" | "scanning" | "none";

export function useRecognition() {
  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const lastAnnouncedRef = useRef<string | null>(null);
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
        speech.speak("Таних систем. Мөнгөн дэвсгэрт, хаалганы дугаар эсвэл текстээ камер руу харуулна уу");
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
    speech.speak(text);
    if (type === "money") {
      setTimeout(() => {
        if (lastAnnouncedRef.current === text) speech.speak(text);
      }, 1500);
    }
  }, []);

  const tick = useCallback(async () => {
    if (!cameraRef.current || busyRef.current) return;
    busyRef.current = true;
    setIsScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 1, shutterSound: false });
      if (!photo) return;
      const photoArea = photo.width * photo.height;

      const denomination = await detectMoneyViaTM(photo.uri);
      if (denomination !== null) {
        announce(formatMoney(denomination), "money");
        return;
      }

      const ocrResult = await TextRecognition.recognize(photo.uri);
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
  }, [announce]);

  useEffect(() => {
    const id = setInterval(tick, SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  return { cameraRef, result, resultType, isScanning };
}
