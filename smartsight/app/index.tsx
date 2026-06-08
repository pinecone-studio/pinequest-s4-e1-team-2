import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import { Audio, type AVPlaybackSource } from "expo-av";
import { Button, Logo } from "@/components/ui-generated/_comps";
import { useRouter } from "expo-router";
import { useSettings } from "@/providers/SettingsProvider";

export default function App() {
  const router = useRouter();
  const activeSoundRef = useRef<Audio.Sound | null>(null);
  const { speechSpeed } = useSettings();

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
      console.warn("[A11y] Welcome audio failed:", err);
    }
  }
  const SOUNDS = {
    newUser: require("../assets/haptics/newuserbtn.mp3"),
    registeredUser: require("../assets/haptics/registereduserbtn.mp3"),
  };

  useEffect(() => {
    async function startupAudio() {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await playSoundFile(require("../assets/haptics/user-recog.mp3"));
    }
    startupAudio();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 20, padding: 20 }}>
      <View style={{ alignItems: "center" }}>
        <Logo size={34} />
        <Text>
          Бүртгэлтэй хэрэглэгч бол "Нэвтрэх", шинээр эхлэгч бол "Шинэ хэрэглэгч"
          товчийг дарна уу.
        </Text>
      </View>
      <Button
        label="Шинэ хэрэглэгч"
        audioSource={SOUNDS.newUser}
        onPress={() => router.push("/register")}
      />
      <Button
        label="Бүртгэлтэй хэрэглэгч"
        audioSource={SOUNDS.registeredUser}
        onPress={() => router.push("/login")}
      />
      <Button
        label="Тохиргоо"
        audioSource={SOUNDS.registeredUser}
        onPress={() => router.push("/settings")}
      />
    </View>
  );
}
