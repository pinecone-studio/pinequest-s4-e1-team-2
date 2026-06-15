import { useRef, useState, useCallback, useEffect } from "react";
import { Vibration } from "react-native";
import { CameraView } from "expo-camera";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { speech } from "@/src/voice";
import { detectDoorNumbers, detectDoorNumberValues } from "./classifyRecognition";

// Зураг авах бүрт preview түр царцдаг тул интервалыг сунгаж preview харагдах зав өгнө
const SCAN_INTERVAL_MS = 1800;

export function useDoorScan(targetNumber: string | null) {
  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const lastSpokenRef = useRef<string | null>(null);
  const arrivedRef = useRef(false);
  const [result, setResult] = useState("");
  const [arrived, setArrived] = useState(false);

  const tick = useCallback(async () => {
    if (!cameraRef.current || busyRef.current || arrivedRef.current) return;
    busyRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.5, shutterSound: false });
      if (!photo) return;
      const ocr = await TextRecognition.recognize(photo.uri);
      const values = detectDoorNumberValues(ocr.blocks);

      // Зорьсон өрөөтэй тулгана
      if (targetNumber && values.includes(targetNumber)) {
        arrivedRef.current = true;
        setArrived(true);
        setResult(`${targetNumber} дугаар тоот`);
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
        speech.speak(`Зорьсон өрөөнд хүрлээ. ${targetNumber} дугаар тоот`);
        return;
      }

      // Эс таарвал уншсан тоонуудыг хэлнэ
      const spoken = detectDoorNumbers(ocr.blocks, photo.width);
      if (spoken && spoken !== lastSpokenRef.current) {
        lastSpokenRef.current = spoken;
        setResult(spoken);
        speech.speak(spoken);
      }
    } catch {
      // ignore
    } finally {
      busyRef.current = false;
    }
  }, [targetNumber]);

  useEffect(() => {
    const id = setInterval(tick, SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  return { cameraRef, result, arrived };
}
