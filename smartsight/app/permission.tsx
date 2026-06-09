import { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { Audio, AVPlaybackSource } from "expo-av";
import { Button } from "@/components/ui-generated/_comps";
import { Screen } from "@/components/Screen";
import { useSettings } from "@/providers/SettingsProvider";

const STEPS = [
  {
    id: "camera",
    title: "Камерын зөвшөөрөл",
    desc: "Объект таних, текст унших, орчноо мэдэхэд хэрэглэнэ.",
    intro: require("../assets/haptics/camerapermissionintro.mp3"),
  },
  {
    id: "mic",
    title: "Микрофоны зөвшөөрөл",
    desc: "Дуун заавар өгөх, тушаал сонсоход хэрэглэнэ.",
    intro: require("../assets/haptics/micpermissionintro.mp3"),
  },
  {
    id: "location",
    title: "Байршлын зөвшөөрөл",
    desc: "Одоо хаана байгааг тань тогтооход хэрэглэнэ.",
    intro: require("../assets/haptics/locationpermissionintro.mp3"),
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const router = useRouter();
  const activeSoundRef = useRef<Audio.Sound | null>(null);
  const { speechSpeed, setSpeechSpeed } = useSettings();

  // Speak the current step on mount/change
  // (swap console.log with speak() once expo-speech works)
  useEffect(() => {
    async function speakStep() {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) return;
        await playSoundFile(STEPS[step].intro);
      } catch (err) {
        console.warn("[A11y] Step audio failed:", err);
      }
    }
    speakStep();
  }, [step]);

  // audio helper
  async function playSoundFile(source: AVPlaybackSource) {
    try {
      if (activeSoundRef.current) {
        await activeSoundRef.current.stopAsync().catch(() => {});
        await activeSoundRef.current.unloadAsync().catch(() => {});
        activeSoundRef.current = null;
      }

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
      });
      activeSoundRef.current = sound;

      // Apply app speech speed setting to playback
      // [control] — connective point where speed value is applied
      await sound.setRateAsync(speechSpeed ?? 1, true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          activeSoundRef.current = null;
        }
      });
    } catch (err) {
      console.warn("[A11y] Step audio failed:", err);
    }
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeSoundRef.current) {
        activeSoundRef.current.unloadAsync().catch(() => {});
        activeSoundRef.current = null;
      }
    };
  }, []);

  const handleAllow = async () => {
    const current = STEPS[step].id;

    if (current === "camera") {
      await requestCamera();
    }

    if (current === "mic") {
      await Audio.requestPermissionsAsync();
    }

    if (current === "location") {
      await Location.requestForegroundPermissionsAsync();
    }

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      router.replace("/home");
    }
  };

  const handleSkip = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      router.replace("/home");
    }
  };

  const p = STEPS[step];
  const preloaded = {
    allow: require("../assets/haptics/allowbtn.mp3"),
    deny: require("../assets/haptics/denybtn.mp3"),
  };
  return (
    <Screen style={{ gap: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
        <Button
          label="- Speed"
          height={72}
          onPress={() => setSpeechSpeed(Math.max(0.5, +(speechSpeed - 0.1).toFixed(2)))}
        />
        <View style={{ alignSelf: "center" }}>
          <Text style={{ fontSize: 18 }}>Speed: {speechSpeed.toFixed(2)}x</Text>
        </View>
        <Button
          label="+ Speed"
          height={72}
          onPress={() => setSpeechSpeed(Math.min(2, +(speechSpeed + 0.1).toFixed(2)))}
        />
      </View>
      <Text style={styles.step}>
        {step + 1} / {STEPS.length}
      </Text>

      <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.desc}>{p.desc}</Text>
      </View>

      <View style={{ gap: 14 }}>
        <Button
          label="ЗӨВШӨӨРӨХ"
          height={130}
          onPress={handleAllow}
          audioSource={preloaded.allow}
        />
        <Button
          label="ҮГҮЙ"
          onPress={handleSkip}
          height={90}
          audioSource={preloaded.deny}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: {
    fontSize: 22,
    fontWeight: "700",
    color: "#888",
    textAlign: "center",
    marginTop: 10,
  },
  title: { fontSize: 34, fontWeight: "700", color: "#0A0A0A" },
  desc: { fontSize: 28, color: "#0A0A0A", lineHeight: 38 },
});
