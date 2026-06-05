import { Pressable, StyleSheet, useWindowDimensions } from "react-native";

import SelfLocationTracker, {
  useSelfLocationTracker,
} from "@/components/SelfLocationTracker";
import { Text, View } from "@/components/Themed";

export default function TabOneScreen() {
  const { height } = useWindowDimensions();
  const { addressText, errorMessage, handleGetLocation, loading } =
    useSelfLocationTracker();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleGetLocation}
        disabled={loading}
        style={[styles.locationButton, { height: height * 0.2 }]}
      >
        <Text style={styles.locationButtonText}>
          {loading ? "Тогтоож байна..." : "Байршил тогтоох"}
        </Text>
      </Pressable>

      <SelfLocationTracker
        addressText={addressText}
        errorMessage={errorMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
  },
  locationButton: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  locationButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
});
