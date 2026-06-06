import { useRef, useState, useCallback } from "react";
import { CameraView } from "expo-camera";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import ImageLabeling from "@react-native-ml-kit/image-labeling";
import Tts from "react-native-tts";
import { classifyFromContext } from "./classifyRecognition";

async function scanImage(uri: string): Promise<string> {
  try {
    const [ocrResult, labelResult] = await Promise.all([
      TextRecognition.recognize(uri),
      ImageLabeling.label(uri),
    ]);
    const labels = labelResult.map((l: { text: string }) => l.text);
    return classifyFromContext(labels, ocrResult.text ?? "");
  } catch {
    return "Алдаа гарлаа";
  }
}

export function useRecognition() {
  const cameraRef = useRef<CameraView>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async () => {
    if (!cameraRef.current || loading) return;

    setLoading(true);
    Tts.speak("Скан хийж байна");

    const photo = await cameraRef.current.takePictureAsync({ base64: false });
    const output = await scanImage(photo.uri);

    Tts.speak(output);
    setResult(output);
    setLoading(false);
  }, [loading]);

  return { cameraRef, result, loading, scan };
}
