import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Audio, type AVPlaybackSource } from "expo-av";
import { Screen } from "@/components/Screen";
import { Button, ss } from "@/components/ui-generated/_comps";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/providers/SettingsProvider";

const BUTTON_ARM_TIME_MS = 3000;

const SOUNDS = {
  login: require("../assets/haptics/loginbtn.mp3"),
  back: require("../assets/haptics/backbtn.mp3"),
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [armedButton, setArmedButton] = useState<string | null>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const activeSoundRef = useRef<Audio.Sound | null>(null);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      await sound.setRateAsync(speechSpeed ?? 1, true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          activeSoundRef.current = null;
        }
      });
    } catch (err) {
      console.warn("[A11y] Button audio failed:", err);
    }
  }

  function handleTwoPressButton(
    buttonId: string,
    audioSource: AVPlaybackSource,
    action: () => void,
  ) {
    if (armedButton === buttonId) {
      if (armTimerRef.current) {
        clearTimeout(armTimerRef.current);
        armTimerRef.current = null;
      }
      setArmedButton(null);
      action();
      return;
    }

    setArmedButton(buttonId);
    void playSoundFile(audioSource);

    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
    }
    armTimerRef.current = setTimeout(() => {
      setArmedButton(null);
      armTimerRef.current = null;
    }, BUTTON_ARM_TIME_MS);
  }

  useEffect(() => {
    return () => {
      if (armTimerRef.current) {
        clearTimeout(armTimerRef.current);
      }
      if (activeSoundRef.current) {
        activeSoundRef.current.unloadAsync();
        activeSoundRef.current = null;
      }
    };
  }, []);

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert(
        "Мэдээлэл дутуу",
        "Имэйл болон нууц үгээ оруулна уу.",
      );
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Нэвтрэхэд алдаа гарлаа", error.message);
      return;
    }

    router.replace("/home");
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={ss.loginHeader}>
            <Text style={ss.loginTitle}>Smart Sight</Text>
            <Text style={ss.loginSub}>Бүртгэлтэй хэрэглэгч</Text>
          </View>

          <View style={styles.form}>
            <Pressable onPress={() => emailInputRef.current?.focus()}>
              <Text style={styles.label}>Та имэйл хаягаа оруулна уу.</Text>
            </Pressable>
            <TextInput
              ref={emailInputRef}
              value={email}
              onChangeText={setEmail}
              placeholder="Жишээ: name@example.com"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!loading}
              keyboardType="email-address"
              returnKeyType="next"
              textContentType="emailAddress"
              style={styles.input}
            />

            <Pressable onPress={() => passwordInputRef.current?.focus()}>
              <Text style={styles.label}>Та нууц үгээ оруулна уу.</Text>
            </Pressable>
            <TextInput
              ref={passwordInputRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Нууц үг"
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
              returnKeyType="done"
              secureTextEntry
              textContentType="password"
              style={styles.input}
            />

            <Button
              label={loading ? "Түр хүлээнэ үү" : "Нэвтрэх"}
              height={88}
              onPress={
                loading
                  ? undefined
                  : () =>
                      handleTwoPressButton("login", SOUNDS.login, handleLogin)
              }
            />

            <Button
              label="Буцах"
              height={88}
              onPress={() =>
                handleTwoPressButton("back", SOUNDS.back, () => router.back())
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 20,
  },
  form: {
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginTop: 4,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    backgroundColor: "#fff",
  },
});
