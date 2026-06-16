import React, { useState, useEffect, useRef, useCallback } from "react";
import { Screen } from "@/components/Screen";
import { router } from "expo-router";
import { TopBar, ss, BackButton } from "@/components/ui-generated/_comps";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui-generated/_comps";
import { BalancerProvider } from "@/providers/useBalancer";
import { speech, useVoice } from "@/src/voice";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { CameraType } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { playSoundFile, stopAllAudio } from "@/services/audio";
import { useAccessibility } from "@/providers/AccesibilityProvider";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const PRELOADED_AUDIO = {
  instruction: require("@/assets/haptics/tilt-device-instruction.mp3"),
  pleaseWait: require("@/assets/haptics/pleasewait.mp3"),
  back: require("@/assets/haptics/backbtn.mp3"),
};

export default function OcrPage() {
  return <OcrScreen onBack={() => router.replace("/home")} />;
}

async function readTextFromPhoto(uri: string): Promise<string | null> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  console.log("[OCR] API key байна уу:", key ? "тийм" : "ҮГҮЙ");
  if (!key) return null;

  try {
    const img = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { base64: true, compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    if (!img.base64) {
      console.warn("[OCR] base64 хоосон");
      return null;
    }
    console.log("[OCR] Зураг бэлэн, OpenAI руу илгээж байна...");

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 700,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "You are helping a blind person understand the text in a photo. " +
                  "Read the meaningful text and convey it clearly. " +
                  "Preserve exact wording for names, numbers, prices. " +
                  "Reply in Mongolian Cyrillic. If no readable text, reply: none",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${img.base64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
      }),
    });

    console.log("[OCR] OpenAI хариу статус:", res.status);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn("[OCR] OpenAI алдаа:", res.status, errBody.slice(0, 300));
      return null;
    }

    const json = await res.json();
    const text: string = (json.choices?.[0]?.message?.content ?? "").trim();
    console.log("[OCR] OpenAI текст:", text.slice(0, 150));

    if (!text || /^none\.?$/i.test(text)) return null;
    return text;
  } catch (err) {
    console.warn("[OCR] OpenAI алдаа:", err);
    return null;
  }
}

function OcrScreen({ onBack }: { onBack: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [st, setSt] = useState<"idle" | "reading" | "done">("idle");
  const [ocrText, setOcrText] = useState<string>("");
  const [cameraReady, setCameraReady] = useState(false);
  const [scanVersion, setScanVersion] = useState(0);
  const cameraFacing: CameraType = "back";
  const cameraRef = useRef<CameraView | null>(null);
  const busyRef = useRef(false);
  const foundTextRef = useRef(false);
  const { stop } = useVoice();
  const { setScroller } = useAccessibility();
  const textScrollRef = useRef<ScrollView | null>(null);
  const textOffsetRef = useRef(0);
  const textViewportHeightRef = useRef(0);
  const textContentHeightRef = useRef(0);
  const balanceDisabled = st !== "idle";

  useEffect(() => {
    return () => {
      stop();
      void stopAllAudio();
    };
  }, [stop]);

  useEffect(() => {
    if (!ocrText) return;
    textOffsetRef.current = 0;
    setScroller((dy) => {
      const maxOffset = Math.max(
        0,
        textContentHeightRef.current - textViewportHeightRef.current,
      );
      const next = Math.min(maxOffset, Math.max(0, textOffsetRef.current + dy));
      textOffsetRef.current = next;
      textScrollRef.current?.scrollTo({ y: next, animated: false });
    });
    return () => setScroller(null);
  }, [ocrText, setScroller]);

  const captureAndOcr = useCallback(async () => {
    if (
      !cameraRef.current ||
      !cameraReady ||
      busyRef.current ||
      foundTextRef.current
    ) {
      console.log("[OCR] skip:", { cameraReady, busy: busyRef.current, found: foundTextRef.current });
      return;
    }
    busyRef.current = true;
    setSt("reading");
    stop();
    await stopAllAudio();
    await playSoundFile(PRELOADED_AUDIO.pleaseWait);

    try {
      console.log("[OCR] Зураг авч байна...");
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        shutterSound: false,
      });

      if (!photo?.uri) {
        console.warn("[OCR] Зураг авч чадсангүй");
        setSt("idle");
        return;
      }
      console.log("[OCR] Зураг авлаа:", photo.uri.slice(-30));

      const text = await readTextFromPhoto(photo.uri);

      if (!text) {
        console.log("[OCR] Текст олдсонгүй");
        speech.speak("Текст олдсонгүй. Дахин оролдоно уу");
        setSt("idle");
        busyRef.current = false;
        return;
      }

      const cleaned = text.replace(/\s+/g, " ").trim();
      foundTextRef.current = true;
      setOcrText(cleaned);
      console.log("[OCR] Chimege уншиж байна...");
      speech.speak(cleaned);
      setSt("done");
    } catch (error) {
      console.warn("[OCR] Алдаа:", error);
      speech.speak("Алдаа гарлаа");
      setSt("idle");
    } finally {
      busyRef.current = false;
    }
  }, [cameraReady, stop]);

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
    void captureAndOcr();
    return () => {};
  }, [cameraReady, captureAndOcr, permission?.granted, scanVersion]);

  if (!permission) {
    return (
      <BalancerProvider disabled>
        <Screen>
          <TopBar title="Текст унших" onBack={onBack} />
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text>No access to camera</Text>
            <Button label="Камер зөвшөөрөх" height={92} onPress={requestPermission} />
          </View>
        </Screen>
      </BalancerProvider>
    );
  }

  return (
    <BalancerProvider disabled={balanceDisabled}>
      <Screen style={{ gap: 5 }}>
        <BackButton
          onBack={() => {
            stop();
            void stopAllAudio();
            router.back();
          }}
          style={styles.backBtn}
          labelStyle={styles.backBtnLabel}
        />
        <View style={styles.cameraWrap}>
          {ocrText ? (
            <ScrollView
              ref={textScrollRef}
              style={styles.textPanel}
              contentContainerStyle={styles.detectedTextContent}
              scrollEnabled
              nestedScrollEnabled
              showsVerticalScrollIndicator
              scrollEventThrottle={16}
              onLayout={(e) => {
                textViewportHeightRef.current = e.nativeEvent.layout.height;
              }}
              onContentSizeChange={(_, height) => {
                textContentHeightRef.current = height;
              }}
              onScroll={(e) => {
                textOffsetRef.current = e.nativeEvent.contentOffset.y;
              }}
            >
              <Text style={styles.detectedText}>{ocrText}</Text>
            </ScrollView>
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraFacing}
              onCameraReady={() => setCameraReady(true)}
            />
          )}
        </View>
        <View style={{ flex: 1 }} />
        <View style={ss.featureRow}>
          <View style={{ flex: 1 }}>
            <Button
              label={st === "done" ? "Дахин хайх" : "Одоо хайх"}
              height={80}
              onPress={() => {
                stop();
                foundTextRef.current = false;
                setOcrText("");
                setSt("idle");
                setCameraReady(false);
                setScanVersion((current) => current + 1);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Унших"
              height={80}
              onPress={() => {
                if (ocrText) speech.speak(ocrText);
              }}
            />
          </View>
        </View>
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
  camera: { flex: 1 },
  textPanel: { flex: 1, backgroundColor: "#000" },
  backBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  backBtnLabel: { color: "#000" },
  detectedTextContent: { padding: 18, paddingBottom: 36 },
  detectedText: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 40,
    fontWeight: "700",
  },
});
