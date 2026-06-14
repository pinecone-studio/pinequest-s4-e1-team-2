import { CameraView, useCameraPermissions } from "expo-camera";
import { ActivityIndicator, Linking, StyleSheet, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { useRecognition, type ResultType } from "./useRecognition";

function PermissionPrompt({ onRequest }: { onRequest: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.permissionText}>Камерын зөвшөөрөл шаардлагатай</Text>
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

function getCardStyle(type: ResultType) {
  switch (type) {
    case "door":  return styles.resultCardDoor;
    case "money": return styles.resultCardMoney;
    case "text":  return styles.resultCardText;
    default:      return styles.resultCard;
  }
}

function getTypeLabel(type: ResultType): string {
  switch (type) {
    case "door":  return "Өрөөний дугаар";
    case "money": return "Мөнгө";
    case "text":  return "Текст";
    default:      return "";
  }
}

export default function RecognitionCamera({
  targetDoorNumber,
}: {
  targetDoorNumber?: string;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const { cameraRef, result, resultType, isScanning } = useRecognition({
    targetDoorNumber,
  });
  const router = useRouter();

  // Зөвшөөрлийг автоматаар асууна
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleRequest = async () => {
    const res = await requestPermission();
    // "Дахиж бүү асуу" гэж татгалзсан бол OS дахиж асуухгүй — Тохиргоо руу оруулна
    if (!res.granted && !res.canAskAgain) {
      Linking.openSettings();
    }
  };

  if (permission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return <PermissionPrompt onRequest={handleRequest} />;
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} autofocus="on" />

      {targetDoorNumber ? (
        <View style={styles.targetBadge}>
          <Text style={styles.targetBadgeText}>{targetDoorNumber} тоот өрөө хайж байна</Text>
        </View>
      ) : null}

      {/* [2] Scanning indicator */}
      {isScanning && !result && (
        <View style={styles.scanningBadge}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.scanningText}>Хайж байна...</Text>
        </View>
      )}

      {/* [7] Төрөл ялгасан result card */}
      {result ? (
        <View style={[styles.resultCard, getCardStyle(resultType)]}>
          {resultType !== "none" && (
            <Text style={styles.typeLabel}>{getTypeLabel(resultType)}</Text>
          )}
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Буцах</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  targetBadge: {
    position: "absolute",
    top: 96,
    left: 16,
    right: 16,
    backgroundColor: "rgba(30,100,200,0.92)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  targetBadgeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  resultCard: {
    position: "absolute", bottom: 80, left: 16, right: 16,
    backgroundColor: "rgba(0,0,0,0.85)",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  // Дугаар — цэнхэр
  resultCardDoor: {
    backgroundColor: "rgba(30,100,200,0.92)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  resultCardMoney: {
    backgroundColor: "rgba(34,139,34,0.92)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  // [7] Текст — хар
  resultCardText: {
    backgroundColor: "rgba(0,0,0,0.85)",
  },

  typeLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  resultText: { color: "#fff", fontSize: 28, textAlign: "center", fontWeight: "bold" },

  // [2] Scanning indicator
  scanningBadge: {
    position: "absolute", top: 150, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  scanningText: { color: "#fff", fontSize: 14 },

  button: {
    backgroundColor: "#1a1a1a",
    padding: 32,
    alignItems: "center",
    margin: 16,
    borderRadius: 16,
    minHeight: 80,
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  permissionText: { color: "#fff", fontSize: 18, textAlign: "center", marginHorizontal: 24, marginBottom: 8 },
  backBtn: {
    position: "absolute", top: 50, left: 20,
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  backBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
