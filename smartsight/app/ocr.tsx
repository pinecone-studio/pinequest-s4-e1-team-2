import React, { useState, useEffect, useRef, useCallback } from "react";
import { Screen } from "@/components/Screen";
import { router } from "expo-router";
import { TopBar, ss } from "@/components/ui-generated/_comps";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui-generated/_comps";
import { BalancerProvider } from "@/providers/useBalancer";
import { useBolorSpellCheck } from "@/components/useBolorSpellCheck";
import { useVoice } from "@/src/voice";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { CameraType } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { playSoundFile, stopAllAudio } from "@/services/audio";

const AUTO_DETECT_INTERVAL_MS = 2600;

const PRELOADED_AUDIO = {
  instruction: require("@/assets/haptics/tilt-device-instruction.mp3"),
  pleaseWait: require("@/assets/haptics/pleasewait.mp3"),
  back: require("@/assets/haptics/backbtn.mp3"),
};

export default function OcrPage() {
  return <OcrScreen onBack={() => router.replace("/home")} />;
}

async function runOcr(base64: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OCR_KEY;

  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_OCR_KEY in your .env file");
  }

  const formData = new FormData();
  formData.append("base64Image", `data:image/jpeg;base64,${base64}`);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("filetype", "JPG");
  formData.append("detectOrientation", "true");
  formData.append("scale", "true");
  formData.append("OCREngine", "2");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: apiKey },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`OCR request failed: HTTP ${response.status}`);
  }

  if (data?.IsErroredOnProcessing) {
    const message = Array.isArray(data?.ErrorMessage)
      ? data.ErrorMessage.join(" ")
      : data?.ErrorMessage || data?.ErrorDetails || "OCR processing failed";
    throw new Error(message);
  }

  return String(data?.ParsedResults?.[0]?.ParsedText ?? "").trim();
}

async function preparePhotoForOcr(uri: string): Promise<string> {
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1400 } }],
    {
      base64: true,
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  if (!resized.base64) {
    throw new Error("Could not convert captured photo to base64");
  }

  return resized.base64;
}

function OcrScreen({ onBack }: { onBack: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [st, setSt] = useState<"idle" | "reading" | "correcting" | "done">(
    "idle",
  );
  const [ocrText, setOcrText] = useState<string>("");
  const [cameraReady, setCameraReady] = useState(false);
  const [scanVersion, setScanVersion] = useState(0);
  const cameraFacing: CameraType = "back";
  const cameraRef = useRef<CameraView | null>(null);
  const busyRef = useRef(false);
  const foundTextRef = useRef(false);
  const { checkSpelling, reset: resetSpellCheck } = useBolorSpellCheck();
  const { stop } = useVoice();
  const balanceDisabled = st !== "idle";

  useEffect(() => {
    if (!permission) {
      requestPermission().catch((err) => {
        console.warn("[OCR] Camera permission request failed:", err);
      });
    }

    return () => {
      void stopAllAudio();
    };
  }, [permission, requestPermission]);

  useEffect(() => {
    return () => {
      stop();
      void stopAllAudio();
    };
  }, [stop]);

  const captureAndOcr = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || busyRef.current || foundTextRef.current) {
      return;
    }
    busyRef.current = true;
    setSt("reading");
    resetSpellCheck();
    stop();
    await stopAllAudio();
    await playSoundFile(PRELOADED_AUDIO.pleaseWait);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.75,
        shutterSound: false,
      });

      if (!photo?.uri) {
        return;
      }

      const base64 = await preparePhotoForOcr(photo.uri);
      const text = await runOcr(base64);
      console.log("[OCR] Parsed text:", text);

      if (!text.trim()) {
        setSt("idle");
        return;
      }

      setSt("correcting");
      const correctedText = await correctOcrText(text);
      const nextText = prepareTextForSpeech(correctedText || text);

      if (!nextText) {
        setSt("idle");
        return;
      }

      foundTextRef.current = true;
      setOcrText(nextText);
      await stopAllAudio();
      setSt("done");
    } catch (error) {
      console.warn("[OCR] Capture or recognition failed:", error);
      await stopAllAudio();
      setSt("idle");
    } finally {
      busyRef.current = false;
    }
  }, [cameraReady, resetSpellCheck, stop]);

  async function correctOcrText(text: string): Promise<string> {
    if (!text.trim()) return text;

    const spellCheckResult = await checkSpelling(text);
    return spellCheckResult?.correctedText ?? text;
  }

  function prepareTextForSpeech(text: string): string {
    return text
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  useEffect(() => {
    async function startupAudio() {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await playSoundFile(PRELOADED_AUDIO.instruction);
    }
    startupAudio();
  }, []);

  useEffect(() => {
    if (!permission?.granted || !cameraReady || foundTextRef.current) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (cancelled || foundTextRef.current) return;
      timer = setTimeout(async () => {
        await captureAndOcr();
        schedule();
      }, AUTO_DETECT_INTERVAL_MS);
    };

    void captureAndOcr().finally(schedule);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [cameraReady, captureAndOcr, permission?.granted, scanVersion]);

  if (!permission) {
    return (
      <BalancerProvider disabled>
        <Screen>
          <TopBar title="Текст унших" onBack={onBack} />
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text>Requesting camera permission...</Text>
          </View>
        </Screen>
      </BalancerProvider>
    );
  }

  if (!permission.granted) {
    return (
      <BalancerProvider disabled>
        <Screen>
          <TopBar title="Текст унших" onBack={onBack} />
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text>No access to camera</Text>
            <Button
              label="Камер зөвшөөрөх"
              height={92}
              onPress={requestPermission}
            />
          </View>
        </Screen>
      </BalancerProvider>
    );
  }

  return (
    <BalancerProvider disabled={balanceDisabled}>
      <Screen style={{ gap: 5 }}>
        <TopBar title="Текст унших" onBack={onBack} />
        <View style={styles.cameraWrap}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraFacing}
            onCameraReady={() => setCameraReady(true)}
          />
          {ocrText ? (
            <ScrollView
              style={styles.detectedTextOverlay}
              contentContainerStyle={styles.detectedTextContent}
              showsVerticalScrollIndicator
            >
              <Text style={styles.detectedText}>{ocrText}</Text>
            </ScrollView>
          ) : null}
        </View>
        <Text style={ss.cameraHint}>
          {st === "reading"
            ? "Текст хайж байна…"
            : st === "correcting"
              ? "Алдааг шалгаж байна…"
              : st === "done"
                ? "Текст олдлоо"
                : "Камер текст автоматаар хайж байна"}
        </Text>
        <View style={ss.featureRow}>
          <View style={{ flex: 1 }}>
            <Button
              label={st === "done" ? "Дахин хайх" : "Одоо хайх"}
              height={80}
              onPress={() => {
                foundTextRef.current = false;
                setOcrText("");
                setSt("idle");
                setScanVersion((current) => current + 1);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              audioSource={PRELOADED_AUDIO.back}
              label="Буцах"
              height={80}
              onPress={() => {
                stop();
                void stopAllAudio();
                router.back();
              }}
            />
          </View>
        </View>
        {st !== "done" && <View style={{ flex: 1 }} />}
      </Screen>
    </BalancerProvider>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    height: 500,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  detectedTextOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  detectedTextContent: {
    padding: 18,
  },
  detectedText: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 40,
    fontWeight: "700",
  },
});
