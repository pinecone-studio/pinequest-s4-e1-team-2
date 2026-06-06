import { CameraView, useCameraPermissions } from "expo-camera";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { Text, View } from "@/components/Themed";
import { useRecognition } from "./useRecognition";

function PermissionPrompt({ onRequest }: { onRequest: () => void }) {
  return (
    <View style={styles.center}>
      <TouchableOpacity
        style={styles.button}
        onPress={onRequest}
        accessible
        accessibilityLabel="Камерын зөвшөөрөл авах"
      >
        <Text style={styles.buttonText}>КАМЕР ЗӨВШӨӨРӨХ</Text>
      </TouchableOpacity>
    </View>
  );
}

function ScanButton({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
      accessible
      accessibilityLabel={loading ? "Скан хийж байна" : "Скан хийх"}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="large" />
      ) : (
        <Text style={styles.buttonText}>СКАН ХИЙХ</Text>
      )}
    </TouchableOpacity>
  );
}

export default function RecognitionCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const { cameraRef, result, loading, scan } = useRecognition();

  if (!permission?.granted) {
    return <PermissionPrompt onRequest={requestPermission} />;
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} />
      {result ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}
      <ScanButton loading={loading} onPress={scan} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  resultCard: {
    backgroundColor: "rgba(0,0,0,0.85)",
    padding: 20,
    margin: 16,
    borderRadius: 12,
  },
  resultText: { color: "#fff", fontSize: 28, textAlign: "center", fontWeight: "bold" },
  button: {
    backgroundColor: "#1a1a1a",
    padding: 32,
    alignItems: "center",
    margin: 16,
    borderRadius: 16,
    minHeight: 80,
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
});
