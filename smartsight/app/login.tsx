import { router } from "expo-router";
import { View, Text } from "react-native";
import { Screen } from "../components/Screen";
import { Button, ss } from "../components/ui-generated/_comps";
export default function LoginPage() {
const preloaded = {
  back: require("../assets/haptics/backbtn.mp3"),
}

  return (
    <Screen style={{ gap: 16 }}>
      <View style={ss.loginHeader}>
        <Text style={ss.loginTitle}>Smart Sight</Text>
        <Text style={ss.loginSub}>Нэвтэрч орно уу</Text>
      </View>
      <View style={{ gap: 16 }}>
        <Text>(iishe burtgeliin sys oruularai)</Text>
        <Button
          label="Буцах"
          height={88}
          onPress={() => router.back()}
          audioSource={preloaded.back}
        />
      </View>
    </Screen>
  );
}
