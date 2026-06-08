import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";

const ROBOFLOW_API_KEY = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;
const MODEL_ID = "tree-branch-detection-jemc7/1";

type Prediction = {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function TreeDetectScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Камерын зөвшөөрөл хэрэгтэй</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Зөвшөөрөх</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const result = await cameraRef.current.takePictureAsync({ base64: true });
    if (!result) return;

    setPhoto(result.uri);
    setPredictions([]);
    setLoading(true);

    try {
      const response = await fetch(
        `https://serverless.roboflow.com/${MODEL_ID}?api_key=${ROBOFLOW_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: result.base64,
        },
      );
      const data = await response.json();
      setPredictions(data.predictions ?? []);
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setPredictions([]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>{"< Буцах"}</Text>
      </TouchableOpacity>

      {!photo ? (
        <View style={{ flex: 1 }}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
            <Text style={styles.captureBtnText}>Мод таних</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Image source={{ uri: photo }} style={styles.preview} />

          {loading ? (
            <ActivityIndicator size="large" color="#000" style={{ marginTop: 20 }} />
          ) : predictions.length > 0 ? (
            <View style={styles.results}>
              <Text style={styles.resultTitle}>
                {predictions.length} мод/мөчир олдлоо
              </Text>
              {predictions.map((p, i) => (
                <View key={i} style={styles.resultItem}>
                  <Text style={styles.resultClass}>{p.class}</Text>
                  <Text style={styles.resultConf}>
                    {(p.confidence * 100).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noResult}>Мод/мөчир олдсонгүй</Text>
          )}

          <TouchableOpacity style={styles.btn} onPress={reset}>
            <Text style={styles.btnText}>Дахин зураг авах</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  backBtn: { position: "absolute", top: 60, left: 24, zIndex: 10 },
  backText: { fontSize: 16, color: "#000", fontWeight: "600" },
  camera: { flex: 1 },
  captureBtn: {
    backgroundColor: "#000",
    padding: 20,
    margin: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  captureBtnText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  preview: { width: "100%", height: 400, resizeMode: "contain", marginTop: 80 },
  results: { padding: 24, gap: 12 },
  resultTitle: { fontSize: 22, fontWeight: "700" },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 12,
  },
  resultClass: { fontSize: 18, fontWeight: "600" },
  resultConf: { fontSize: 18, color: "#666" },
  noResult: {
    fontSize: 18,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
  },
  btn: {
    backgroundColor: "#000",
    padding: 18,
    margin: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 100,
    marginBottom: 20,
  },
});
