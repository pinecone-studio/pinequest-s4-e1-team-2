import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui-generated/_comps";
import { AccessibleElement } from "@/components/AccessibleElement";
import { useAccessibility } from "@/providers/AccesibilityProvider";

const OPTIONS = [
  {
    id: "location",
    label: "Байршил",
    sub: "Одоо хаана байгааг мэдэх",
    route: "/location",
    audio: require("@/assets/haptics/locationbtn.mp3"),
  },
  {
    id: "bus-route",
    label: "Автобус чиглэл",
    sub: "Хаанаас хааш явах",
    route: "/bus-route",
    audio: require("@/assets/haptics/busroutebtn.mp3"),
  },
  {
    id: "nearby-stops",
    label: "Ойр буудал",
    sub: "Ойролцоох буудлууд",
    route: "/nearby-stops",
    audio: require("@/assets/haptics/nearbusstopbtn.mp3"),
  },
] as const;

export default function TransportScreen() {
  const router = useRouter();
  const { activeElementId } = useAccessibility();
  // Instance тус бүрд давтагдашгүй угтвар — олон instance mount хэвээр үлдвэл
  // тогтмол id мөргөлдөж register/unregister гүйлгэлддэг асуудлаас сэргийлнэ.
  const uid = React.useId().replace(/:/g, "-");

  return (
    <View style={s.root}>
      <Text style={s.title}>Зам тээвэр</Text>

      <View style={s.list}>
        {OPTIONS.map((opt) => {
          const accessibleId = `transport-${uid}-${opt.id}`;
          const highlighted = activeElementId === accessibleId;

          return (
            <AccessibleElement
              key={opt.id}
              id={accessibleId}
              label={opt.label}
              onActivate={() => router.push(opt.route as any)}
              audioSource={opt.audio}
            >
              <TouchableOpacity
                style={[s.card, highlighted && s.cardActive]}
                onPress={() => router.push(opt.route as any)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                activeOpacity={0.7}
              >
                <Text style={s.cardLabel}>{opt.label}</Text>
                <Text style={s.cardSub}>{opt.sub}</Text>
              </TouchableOpacity>
            </AccessibleElement>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      <Button
        label="Буцах"
        height={88}
        audioSource={require("@/assets/haptics/backbtn.mp3")}
        onPress={() => router.back()}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  title: {
    color: "#0A0A0A",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  list: { gap: 16 },
  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  cardActive: { borderColor: "#45FFF7", borderWidth: 2 },
  cardLabel: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  cardSub: { color: "rgba(255,255,255,0.6)", fontSize: 16, marginTop: 6 },
});
