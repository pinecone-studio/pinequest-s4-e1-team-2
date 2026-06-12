import { useRouter } from "expo-router";
import type { AVPlaybackSource } from "expo-av";
import { Screen } from "@/components/Screen";
import { Text, View } from "react-native";
import { Logo } from "@/components/ui-generated/_comps";
import { Button, ss } from "@/components/ui-generated/_comps";
import { ExploreOverlay } from "@/components/ExploreOverlay";
const ROUTES = {
  obstacle: "/obstacle",
  money: "/money",
  recognize: "/recognize",
  ocr: "/ocr",
  location: "/location",
  "room-search": "/room-search",
  settings: "/settings",
  instructions: "/",
  "bus-route": "/bus-route",
  "nearby-stops": "/nearby-stops",
} as const;

type HomeRoute =
  | "obstacle"
  | "money"
  | "recognize"
  | "ocr"
  | "location"
  | "room-search"
  | "settings"
  | "bus-route"
  | "nearby-stops";

const AUDIO_SOURCES: Partial<Record<HomeRoute, AVPlaybackSource>> = {
  obstacle: require("@/assets/haptics/obidentifybtn.mp3"),
  recognize: require("@/assets/haptics/grlidentifybtn.mp3"),
  ocr: require("@/assets/haptics/textreaderbtn.mp3"),
  location: require("@/assets/haptics/locationdefinebtn.mp3"),
  "room-search": require("@/assets/haptics/SearchRoomBtn.mp3"),
  settings: require("@/assets/haptics/SettingsBtn.mp3"),
};
const instruction = require("@/assets/haptics/Instruction.mp3");

export default function HomePage() {
  const router = useRouter();

  return (
    <HomeScreen
      audioSources={AUDIO_SOURCES}
      onNav={(id) => router.push(ROUTES[id] as any)}
    />
  );
}
// 4 · HOME
const FEATURES = [
  { id: "obstacle",     label: "Саад мэдрэгч" },
  { id: "money",        label: "Мөнгө таних" },
  { id: "recognize",    label: "Тоот таних" },
  { id: "ocr",          label: "Текст унших" },
  { id: "location",     label: "Байршил" },
  { id: "room-search",  label: "Өрөө хайх" },
  { id: "settings",     label: "Тохиргоо" },
  { id: "bus-route",    label: "Автобус чиглэл" },
  { id: "nearby-stops", label: "Ойр буудал" },
] as const;

type FeatureId = (typeof FEATURES)[number]["id"];

export function HomeScreen({
  audioSources,
  onNav,
}: {
  audioSources?: Partial<Record<FeatureId, AVPlaybackSource>>;
  onNav: (id: FeatureId) => void;
}) {
  return (
    <Screen style={{ gap: 18 }}>
      <ExploreOverlay />
      <Logo size={24} />
      <Text style={ss.homeHeading}>Юу хийх вэ?</Text>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={ss.featureRow}>
          <View style={{ flex: 1 }}>
            <Button label={FEATURES[0].label} height={150} onPress={() => onNav(FEATURES[0].id)} audioSource={audioSources?.[FEATURES[0].id]} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={FEATURES[1].label} height={150} onPress={() => onNav(FEATURES[1].id)} audioSource={audioSources?.[FEATURES[1].id]} />
          </View>
        </View>
        <View style={ss.featureRow}>
          <View style={{ flex: 1 }}>
            <Button label={FEATURES[2].label} height={150} onPress={() => onNav(FEATURES[2].id)} audioSource={audioSources?.[FEATURES[2].id]} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={FEATURES[3].label} height={150} onPress={() => onNav(FEATURES[3].id)} audioSource={audioSources?.[FEATURES[3].id]} />
          </View>
        </View>
        <View style={ss.featureRow}>
          <View style={{ flex: 1 }}>
            <Button label={FEATURES[4].label} height={112} onPress={() => onNav(FEATURES[4].id)} audioSource={audioSources?.[FEATURES[4].id]} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={FEATURES[5].label} height={112} onPress={() => onNav(FEATURES[5].id)} audioSource={audioSources?.[FEATURES[5].id]} />
          </View>
        </View>
        <View style={ss.featureRow}>
          <View style={{ flex: 1 }}>
            <Button label={FEATURES[6].label} height={100} onPress={() => onNav(FEATURES[6].id)} audioSource={audioSources?.[FEATURES[6].id]} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={FEATURES[7].label} height={100} onPress={() => onNav(FEATURES[7].id)} audioSource={audioSources?.[FEATURES[7].id]} />
          </View>
        </View>
        <View style={ss.featureRow}>
          <View style={{ flex: 1 }}>
            <Button label={FEATURES[8].label} height={100} onPress={() => onNav(FEATURES[8].id)} audioSource={audioSources?.[FEATURES[8].id]} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={"Заавар"} height={100} audioSource={instruction} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
