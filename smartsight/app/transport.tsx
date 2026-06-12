import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { speech } from "@/src/voice";

const OPTIONS = [
  {
    id: "location",
    label: "Байршил",
    sub: "Одоо хаана байгааг мэдэх",
    route: "/location",
  },
  {
    id: "bus-route",
    label: "Автобус чиглэл",
    sub: "Хаанаас хааш явах",
    route: "/bus-route",
  },
  {
    id: "nearby-stops",
    label: "Ойр буудал",
    sub: "Ойролцоох буудлууд",
    route: "/nearby-stops",
  },
] as const;

const DOUBLE_TAP_MS = 350;

export default function TransportScreen() {
  const router = useRouter();
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);

  React.useEffect(() => {
    setTimeout(() => {
      speech.speak("Зам тээвэр. Сонголтоо дарна уу");
    }, 500);
  }, []);

  const handleTap = (opt: (typeof OPTIONS)[number]) => {
    const now = Date.now();
    const last = lastTapRef.current;

    if (last?.id === opt.id && now - last.time <= DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(opt.route as any);
    } else {
      lastTapRef.current = { id: opt.id, time: now };
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      speech.speak(opt.label);
    }
  };

  return (
    <View style={s.root}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>Буцах</Text>
      </TouchableOpacity>

      <Text style={s.title}>Зам тээвэр</Text>

      <View style={s.list}>
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={s.card}
            onPress={() => handleTap(opt)}
            activeOpacity={0.7}>
            <Text style={s.cardLabel}>{opt.label}</Text>
            <Text style={s.cardSub}>{opt.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  list: { gap: 16 },
  card: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  cardLabel: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  cardSub: { color: "rgba(255,255,255,0.6)", fontSize: 16, marginTop: 6 },
});
