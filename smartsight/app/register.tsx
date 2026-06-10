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
import { useRouter } from "expo-router";
import { Audio, type AVPlaybackSource } from "expo-av";
import { Screen } from "@/components/Screen";
import { Button, Logo } from "@/components/ui-generated/_comps";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/providers/SettingsProvider";

const BUTTON_ARM_TIME_MS = 3000;

const SOUNDS = {
  register: require("../assets/haptics/registerbtn.mp3"),
  back: require("../assets/haptics/backbtn.mp3"),
};

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [armedButton, setArmedButton] = useState<string | null>(null);
  const fullNameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const activeSoundRef = useRef<Audio.Sound | null>(null);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speechSpeed } = useSettings();

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

  async function handleRegister() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!fullName.trim() || !normalizedEmail || !password) {
      Alert.alert("Мэдээлэл дутуу", "Бүх талбарыг бөглөнө үү.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Нууц үг богино байна",
        "Нууц үг хамгийн багадаа 6 тэмдэгт байна.",
      );
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert("Бүртгүүлэхэд алдаа гарлаа", error.message);
      return;
    }

    if (data.session) {
      Alert.alert(
        "Бүртгэл үүслээ",
        "Supabase дээр Confirm email асаалттай бол хэрэглэгч имэйлээ баталгаажуулсны дараа нэвтэрнэ.",
        [{ text: "OK", onPress: () => router.replace("/login") }],
      );
      return;
    }

    Alert.alert(
      "Баталгаажуулах имэйл илгээгдлээ",
      "Имэйлээ шалгаад баталгаажуулсны дараа нэвтэрнэ үү.",
      [{ text: "OK", onPress: () => router.replace("/login") }],
    );
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
          <View style={styles.header}>
            <Logo size={34} />
            <Text style={styles.subtitle}>Шинэ бүртгэл үүсгэнэ үү.</Text>
          </View>

          <View style={styles.form}>
            <Pressable onPress={() => fullNameInputRef.current?.focus()}>
              <Text style={styles.label}>Та өөрийн нэрээ оруулна уу.</Text>
            </Pressable>
            <TextInput
              ref={fullNameInputRef}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Жишээ: Бат-Эрдэнэ"
              autoComplete="name"
              editable={!loading}
              returnKeyType="next"
              textContentType="name"
              style={styles.input}
            />

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
              placeholder="Хамгийн багадаа 6 тэмдэгт"
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!loading}
              returnKeyType="done"
              secureTextEntry
              textContentType="newPassword"
              style={styles.input}
            />

            <Button
              label={loading ? "Түр хүлээнэ үү" : "Бүртгүүлэх"}
              height={88}
              onPress={
                loading
                  ? undefined
                  : () =>
                      handleTwoPressButton(
                        "register",
                        SOUNDS.register,
                        handleRegister,
                      )
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
  header: {
    alignItems: "center",
  },
  subtitle: {
    fontSize: 26,
    color: "#111",
    marginTop: 8,
    textAlign: "center",
    maxWidth: 320,
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
