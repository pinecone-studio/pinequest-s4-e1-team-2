import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import {
  BigButton,
  SecondaryB,
  Screen,
} from "@/components/ui-generated/_comps";

const STEPS = [
  {
    id: "camera",
    title: "Камерын зөвшөөрөл",
    desc: "Объект таних, текст унших, орчноо мэдэхэд хэрэглэнэ.",
  },
  {
    id: "mic",
    title: "Микрофоны зөвшөөрөл",
    desc: "Дуун заавар өгөх, тушаал сонсоход хэрэглэнэ.",
  },
  {
    id: "location",
    title: "Байршлын зөвшөөрөл",
    desc: "Одоо хаана байгааг тань тогтооход хэрэглэнэ.",
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [cameraPermission, requestCamera] = useCameraPermissions();

  // Speak the current step on mount/change
  // (swap console.log with speak() once expo-speech works)
  useEffect(() => {
    console.log(`Step ${step + 1}: ${STEPS[step].title}`);
  }, [step]);

  const handleAllow = async () => {
    const current = STEPS[step].id;

    if (current === "camera") {
      await requestCamera();
    }

    if (current === "mic") {
      await Audio.requestPermissionsAsync();
    }

    if (current === "location") {
      await Location.requestForegroundPermissionsAsync();
    }

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      router.replace("/home"); 
    }
  };

  const handleSkip = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      router.replace("/home");
    }
  };

  const p = STEPS[step];

  return (
    <Screen style={{ gap: 20 }}>

      <Text style={styles.step}>
        {step + 1} / {STEPS.length}
      </Text>


      <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.desc}>{p.desc}</Text>
      </View>

      <View style={{ gap: 14 }}>
        <BigButton label="ЗӨВШӨӨРӨХ" height={130} onPress={handleAllow} />
        <SecondaryB label="ҮГҮЙ" onPress={handleSkip} height={90} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: {
    fontSize: 22,
    fontWeight: "700",
    color: "#888",
    textAlign: "center",
    marginTop: 10,
  },
  title: { fontSize: 34, fontWeight: "700", color: "#0A0A0A" },
  desc: { fontSize: 28, color: "#0A0A0A", lineHeight: 38 },
});
