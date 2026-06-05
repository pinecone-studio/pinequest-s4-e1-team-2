import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function VisionSelectScreen() {
  const router = useRouter();
  const select = (type: string) => {
    router.push({ pathname: "/login", params: { visionType: type } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>SMART SIGHT</Text>
      <Text style={styles.title}>Харааны чадвараа{"\n"}сонгоно уу</Text>

      <TouchableOpacity style={styles.btn} onPress={() => select("blind")}>
        <Text style={styles.btnText}>БҮРЭН{"\n"}ХАРААНЫ</Text>
        <Text style={styles.btnSub}>Огт харагддаггүй бол</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={() => select("partial")}>
        <Text style={styles.btnText}>ХАГАС{"\n"}ХАРААНЫ</Text>
        <Text style={styles.btnSub}>Бага зэрэг харагддаг бол</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={() => select("other")}>
        <Text style={styles.btnText}>БУСАД</Text>
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
  label: { fontSize: 13, color: "#999", marginBottom: 8, fontWeight: "600" },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 32,
    lineHeight: 36,
  },
  btn: {
    backgroundColor: "#000",
    borderRadius: 16,
    padding: 24,
    marginBottom: 12,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 30,
  },
  btnSub: { color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" },
});
