import { CameraView } from "expo-camera";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useDoorScan } from "./useDoorScan";

export function DoorRecognitionCamera({
  targetName,
  instructions = [],
}: {
  targetName: string;
  instructions?: string[];
}) {
  const { cameraRef, result, arrived } = useDoorScan(targetName);

  return (
    <View style={{ gap: 10 }}>
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

      {/* Доод хэсэг — хаалганы дугаар таних камер */}
      <View style={styles.box}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" autofocus="on" />
        {result ? (
          <View style={[styles.badge, arrived && styles.badgeOk]}>
            <Text style={styles.badgeText}>{arrived ? `✓ Хүрлээ · ${result}` : result}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  guide: {
    backgroundColor: "rgba(30,100,200,0.10)",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  guideTitle: { fontSize: 18, fontWeight: "700", color: "#1e64c8" },
  guideScroll: { maxHeight: 160 },
  guideStep: { fontSize: 16, lineHeight: 24, marginBottom: 4 },
  box: { height: 300, overflow: "hidden", borderRadius: 16, backgroundColor: "#111" },
  badge: {
    position: "absolute", bottom: 16, left: 16, right: 16,
    backgroundColor: "rgba(30,100,200,0.92)",
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, alignItems: "center",
  },
  badgeOk: { backgroundColor: "rgba(34,139,34,0.95)" },
  badgeText: { color: "#fff", fontSize: 22, fontWeight: "bold", textAlign: "center" },
});
