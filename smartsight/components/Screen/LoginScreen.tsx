import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();

  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  const signInWithGoogle = async () => {
    try {
      const result = await promptAsync();

      if (result.type !== "success") return;

      const idToken = result.authentication?.idToken;
      if (!idToken) {
        Alert.alert("Алдаа", "Google token авч чадсангүй.");
        return;
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) {
        Alert.alert("Алдаа", error.message);
        return;
      }

      router.replace("/(tabs)");
    } catch {
      Alert.alert("Алдаа", "Нэвтрэхэд алдаа гарлаа.");
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>{"< Буцах"}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Smart Sight</Text>
      <Text style={styles.sub}>Нэвтэрч орно уу</Text>

      <TouchableOpacity style={styles.btn} onPress={signInWithGoogle}>
        <Text style={styles.btnTitle}>GOOGLE</Text>
        <Text style={styles.btnSub}>-ООР НЭВТРЭХ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn}>
        <Text style={styles.btnTitle}>APPLE</Text>
        <Text style={styles.btnSub}>-ААР НЭВТРЭХ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn}>
        <Text style={styles.btnTitle}>FACEBOOK</Text>
        <Text style={styles.btnSub}>-ООР НЭВТРЭХ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    justifyContent: "center",
  },
  back: { position: "absolute", top: 60, left: 24 },
  backText: { fontSize: 16, color: "#000", fontWeight: "600" },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
  },
  sub: { fontSize: 16, color: "#999", textAlign: "center", marginBottom: 40 },
  btn: {
    backgroundColor: "#000",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: "center",
  },
  btnTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  btnSub: { color: "#888", fontSize: 13, marginTop: 4 },
});
