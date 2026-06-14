import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef } from "react";
import { ActivityIndicator, PanResponder, StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { BackButton } from "@/components/ui-generated/_comps";
import { useMoneyDetection } from "@/components/Recognition/useMoneyDetection";

function PermissionPrompt({ onRequest }: { onRequest: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.permissionText}>Камерын зөвшөөрөл шаардлагатай</Text>
      <TouchableOpacity style={styles.button} onPress={onRequest} accessible accessibilityLabel="Камерын зөвшөөрөл авах">
        <Text style={styles.buttonText}>КАМЕР ЗӨВШӨӨРӨХ</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MoneyPage() {
  const [permission, requestPermission] = useCameraPermissions();
  const { cameraRef, result, status } = useMoneyDetection();
  const router = useRouter();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Зүүнээс баруун руу шудрах = буцах (Таних систем рүү)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 25 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 80) {
          router.back();
        }
      },
    })
  ).current;

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return <PermissionPrompt onRequest={requestPermission} />;
  }

  const isUnknown = status === "unknown";

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <CameraView ref={cameraRef} style={styles.camera} autofocus="on" />

      {status === "scanning" && !result && (
        <View style={styles.scanningBadge}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.scanningText}>Уншиж байна...</Text>
        </View>
      )}

      {result ? (
        <View style={[styles.resultCard, isUnknown && styles.resultCardUnknown]}>
          {!isUnknown && <Text style={styles.typeLabel}>МӨНГӨ</Text>}
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}

      <BackButton onBack={() => router.back()} style={styles.backBtn} label="← Буцах" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  resultCard: {
    position: "absolute", bottom: 80, left: 16, right: 16,
    backgroundColor: "rgba(34,139,34,0.92)",
    padding: 20, borderRadius: 12, alignItems: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  resultCardUnknown: { backgroundColor: "rgba(80,80,80,0.92)" },
  typeLabel: {
    color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "700",
    letterSpacing: 1, marginBottom: 6, textTransform: "uppercase",
  },
  resultText: { color: "#fff", fontSize: 28, textAlign: "center", fontWeight: "bold" },
  scanningBadge: {
    position: "absolute", top: 100, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  scanningText: { color: "#fff", fontSize: 14 },
  button: {
    backgroundColor: "#1a1a1a", padding: 32, alignItems: "center",
    margin: 16, borderRadius: 16, minHeight: 80, justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  permissionText: { color: "#fff", fontSize: 18, textAlign: "center", marginHorizontal: 24, marginBottom: 8 },
  backBtn: {
    position: "absolute", top: 50, left: 20,
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  backBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
