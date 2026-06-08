import React, { useState, useEffect, useRef } from "react";
import { Screen } from "@/components/Screen";
import { router } from "expo-router";
import { TopBar, ss } from "@/components/ui-generated/_comps";
import { ScrollView, Text, View } from "react-native";
import { Button } from "@/components/ui-generated/_comps";
import { BalancerProvider } from "@/providers/useBalancer";
import { useSettings } from "@/providers/SettingsProvider";
import { Audio, AVPlaybackSource } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { CameraType } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";

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
  const [st, setSt] = useState<"idle" | "reading" | "done">("idle");
  const [ocrText, setOcrText] = useState<string>("");
  const [cameraReady, setCameraReady] = useState(false);
  const cameraFacing: CameraType = "back";
  const cameraRef = useRef<CameraView | null>(null);
  const activeSoundRef = useRef<Audio.Sound | null>(null);
  const { speechSpeed } = useSettings();

  const preloaded = {
    instruction: require("@/assets/haptics/tilt-device-instruction.mp3"),
    dontmove: require("@/assets/haptics/directions/dont-move-device.mp3"),
    back: require("@/assets/haptics/backbtn.mp3"),
  };

  useEffect(() => {
    if (!permission) {
      requestPermission().catch((err) => {
        console.warn("[OCR] Camera permission request failed:", err);
      });
    }

    return () => {
      if (activeSoundRef.current) {
        activeSoundRef.current.unloadAsync().catch(() => {});
        activeSoundRef.current = null;
      }
    };
  }, [permission, requestPermission]);

  async function playSoundFile(source: AVPlaybackSource) {
    try {
      if (activeSoundRef.current) {
        await activeSoundRef.current.unloadAsync();
        activeSoundRef.current = null;
      }

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
      });
      activeSoundRef.current = sound;

      // [control] — connective point where speed value is applied
      await sound.setRateAsync(speechSpeed ?? 1, true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          activeSoundRef.current = null;
        }
      });
    } catch (err) {
      console.warn("OCR audio failed:", err);
    }
  }

  async function captureAndOcr() {
    if (!cameraRef.current || !cameraReady) {
      return;
    }
    setSt("reading");
    setOcrText("");

    try {
      // Take picture, then resize/compress it for OCR.space upload limits.
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.75,
        shutterSound: false,
      });

      if (!photo?.uri) {
        setOcrText("(No image captured)");
        setSt("done");
        return;
      }

      const base64 = await preparePhotoForOcr(photo.uri);

      // play a short prompt while processing
      await playSoundFile(preloaded.dontmove);

      // Send photo base64 to OCR
      const text = await runOcr(base64);
      console.log("[OCR] Parsed text:", text);
      setOcrText(text || "(No text found)");
      setSt("done");
    } catch (error) {
      console.warn("[OCR] Capture or recognition failed:", error);
      setOcrText(
        error instanceof Error ? `(Recognition failed: ${error.message})` : "(Recognition failed)",
      );
      setSt("done");
    }
  }

  useEffect(() => {
    async function startupAudio() {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await playSoundFile(preloaded.instruction);
    }
    startupAudio();
  }, []);

  if (!permission) {
    return (
      <BalancerProvider>
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
      <BalancerProvider>
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
    <BalancerProvider>
      <Screen style={{ gap: 14 }}>
        <TopBar title="Текст унших" onBack={onBack} />
        <CameraView
          ref={cameraRef}
          style={{ height: 500, borderRadius: 12, overflow: "hidden" }}
          facing={cameraFacing}
          onCameraReady={() => setCameraReady(true)}
        />
        <Text style={ss.cameraHint}>
          {st === "reading"
            ? "Уншиж байна…"
            : st === "done"
              ? "Дахин авахад хүлээнэ"
              : "Зураг авна"}
        </Text>

        {st === "done" && (
          <ScrollView style={ss.ocrResult} showsVerticalScrollIndicator={false}>
            <Text style={ss.ocrResultText}>{ocrText || "(No result)"}</Text>
          </ScrollView>
        )}

        {st !== "done" && <View style={{ flex: 1 }} />}

        {st === "done" ? (
          <Button
            label="Дахин авах"
            height={92}
            onPress={() => {
              setSt("idle");
              setOcrText("");
            }}
          />
        ) : (
          <Button label="Зураг авах" height={92} onPress={captureAndOcr} />
        )}

        <Button
          audioSource={preloaded.back}
          label="Буцах"
          height={92}
          onPress={() => router.back()}
        />
      </Screen>
    </BalancerProvider>
  );
}
