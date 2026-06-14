import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { BackButton } from "@/components/ui-generated/_comps";
import { AccessibleElement } from "@/components/AccessibleElement";
import { useAccessibility } from "@/providers/AccesibilityProvider";

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

export default function TransportScreen() {
  const router = useRouter();
  const { activeElementId } = useAccessibility();
  // Instance тус бүрд давтагдашгүй угтвар — олон instance mount хэвээр үлдвэл
  // тогтмол id мөргөлдөж register/unregister гүйлгэлддэг асуудлаас сэргийлнэ.
  const uid = React.useId().replace(/:/g, "-");

  return (
    <View style={s.root}>
      <BackButton onBack={() => router.back()} style={s.backBtn} />

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
            >
              <TouchableOpacity
                style={[s.card, highlighted && s.cardActive]}
                onPress={() => router.push(opt.route as any)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                activeOpacity={0.7}>
                <Text style={s.cardLabel}>{opt.label}</Text>
                <Text style={s.cardSub}>{opt.sub}</Text>
              </TouchableOpacity>
            </AccessibleElement>
          );
        })}
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
  cardActive: { borderColor: "#45FFF7", borderWidth: 2 },
  cardLabel: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  cardSub: { color: "rgba(255,255,255,0.6)", fontSize: 16, marginTop: 6 },
});
