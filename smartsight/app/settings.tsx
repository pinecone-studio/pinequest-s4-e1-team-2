import { useSettings } from "@/providers/SettingsProvider"
import { Screen } from "@/components/Screen"
import { Text, View, StyleSheet } from "react-native"
import { Button } from "@/components/ui-generated/_comps"

export default function SettingsPage() {
  const { speechSpeed, fontSize, setSpeechSpeed, setFontSize } = useSettings()

  return (
    <Screen style={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Audio Speed</Text>
        <Text style={styles.value}>{speechSpeed.toFixed(2)}x</Text>
        <View style={styles.controlRow}>
          <Button
            label="-"
            height={72}
            onPress={() => setSpeechSpeed(Math.max(0.5, +(speechSpeed - 0.1).toFixed(2)))}
          />
          <Button
            label="+"
            height={72}
            onPress={() => setSpeechSpeed(Math.min(2, +(speechSpeed + 0.1).toFixed(2)))}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Text Size</Text>
        <Text style={styles.value}>{fontSize}px</Text>
        <View style={styles.controlRow}>
          <Button
            label="-"
            height={72}
            onPress={() => setFontSize(Math.max(12, fontSize - 1))}
          />
          <Button
            label="+"
            height={72}
            onPress={() => setFontSize(Math.min(32, fontSize + 1))}
          />
        </View>
      </View>

      <Text style={styles.hint}>
        Use these controls to tune the audio playback speed and app text size.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    justifyContent: "center",
    padding: 20,
  },
  heading: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
  },
  section: {
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F7F7F7",
  },
  label: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0A0A0A",
  },
  value: {
    fontSize: 18,
    color: "#666",
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  hint: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 10,
  },
})
