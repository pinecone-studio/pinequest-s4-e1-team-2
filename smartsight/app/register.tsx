import { Button, Logo } from "@/components/ui-generated/_comps";
import { Screen } from "@/components/Screen";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Audio, AVPlaybackSource } from "expo-av";
import { useRef, useEffect } from "react";
import { useSettings } from "@/providers/SettingsProvider";

export default function RegisterPage() {
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
    continue: require("../assets/haptics/continuebtn.mp3"),
    back: require("../assets/haptics/backbtn.mp3"),
  };

  useEffect(() => {
    async function startupAudio() {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await playSoundFile(require("../assets/haptics/introduction.mp3"));
    }
    startupAudio();
  }, []);
  return (
    <Screen style={{ justifyContent: "center", gap: 20 }}>
      <View style={{ alignItems: "center" }}>
        <Logo size={34} />
        <Text style={{ fontSize: 26, fontWeight: "700", marginTop: 18 }}>
          Шинэ хэрэглэгч
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#666",
            marginTop: 8,
            textAlign: "center",
            maxWidth: 280,
          }}
        >
          Танд Smart Sight програмын үндсэн функцуудтай танилцах боломж байна.
        </Text>
      </View>

      <Button
        audioSource={SOUNDS.continue}
        label="Бүртгүүлэх"
        sub="Шинэ ашиглагч бол энд дарна уу"
        height={140}
        onPress={() => router.replace("/onboarding")}
      />
      <Button
        audioSource={SOUNDS.back}
        label="Буцах"
        height={92}
        onPress={() => router.back()}
      />
    </Screen>
  );
}
