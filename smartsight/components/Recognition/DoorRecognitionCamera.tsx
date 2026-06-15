import { CameraView } from "expo-camera";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDoorScan } from "./useDoorScan";

export function DoorRecognitionCamera({
  targetName,
  instructions = [],
  onClose,
}: {
  targetName: string;
  instructions?: string[];
  onClose?: () => void;
}) {
  const { cameraRef, result, arrived } = useDoorScan(targetName);

  return (
    <View style={styles.full}>
      {/* Дээд хэсэг — зорьсон өрөө рүү явах зааварчилгаа */}
      <View style={styles.guide}>
        <Text style={styles.guideTitle}>{targetName} дугаар тоот руу явах зам</Text>
        {instructions.length > 0 ? (
          <ScrollView style={styles.guideScroll} nestedScrollEnabled>
            {instructions.map((item, i) => (
              <Text key={i} style={styles.guideStep}>
                {i + 1}. {item}
              </Text>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* Доод хэсэг — хаалганы дугаар таних камер (flex-ээр дүүргэнэ) */}
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" autofocus="on" />
        {result ? (
          <View style={[styles.badge, arrived && styles.badgeOk]}>
            <Text style={styles.badgeText}>{arrived ? `✓ Хүрлээ · ${result}` : result}</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={onClose}>
        <Text style={styles.backBtnText}>← Буцах</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#000",
    zIndex: 100,
  },
  guide: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#000",
    gap: 8,
  },
  guideTitle: { fontSize: 19, fontWeight: "800", color: "#fff" },
  guideScroll: { maxHeight: 140 },
  guideStep: { fontSize: 17, lineHeight: 25, fontWeight: "600", color: "#fff", marginBottom: 4 },
  cameraWrap: { flex: 1 },
  badge: {
    position: "absolute", bottom: 24, left: 16, right: 16,
    backgroundColor: "rgba(30,100,200,0.92)",
    paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, alignItems: "center",
  },
  badgeOk: { backgroundColor: "rgba(34,139,34,0.95)" },
  badgeText: { color: "#fff", fontSize: 22, fontWeight: "bold", textAlign: "center" },
  backBtn: {
    position: "absolute", top: 50, right: 16,
    backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  backBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
