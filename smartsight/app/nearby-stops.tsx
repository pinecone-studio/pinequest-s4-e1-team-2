import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui-generated/_comps";
import { AccessibleElement } from "@/components/AccessibleElement";
import { useAccessibility } from "@/providers/AccesibilityProvider";
import * as Location from "expo-location";
import { speech } from "@/src/voice";
import { getAllStopsWithRoutes, getAllStations, type BusStopGroup } from "@/services/busApi";

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface NearbyStop extends BusStopGroup {
  distance: number;
  lat: number;
  lon: number;
}

export default function NearbyStopsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState<NearbyStop[]>([]);
  const [error, setError] = useState("");
  const { setScroller, remeasureAll } = useAccessibility();
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const uid = React.useId().replace(/:/g, "-");

  // ExploreOverlay-ийн 2 хурууны scroll-ийг энэ ScrollView рүү холбоно
  useEffect(() => {
    setScroller((dy) => {
      const next = Math.max(0, offsetRef.current + dy);
      offsetRef.current = next;
      scrollRef.current?.scrollTo({ y: next, animated: false });
    });
    return () => setScroller(null);
  }, [setScroller]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = e.nativeEvent.contentOffset.y;
    remeasureAll(); // scroll бүрт элементийн байрлалыг шинэчилж stale координат засна
  };

  const findNearby = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Байршлын зөвшөөрөл шаардлагатай");
        speech.speak("Байршлын зөвшөөрөл шаардлагатай");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = loc.coords;

      // Бүх буудал (координаттай) + бүлгийн чиглэлийн мэдээллийг зэрэг татна
      const [allStations, allGroups] = await Promise.all([
        getAllStations(),
        getAllStopsWithRoutes(),
      ]);

      // Чиглэлийн жагсаалтыг хурдан хайхад Map (busStopId → routeList)
      const routeMap = new Map(allGroups.map((g) => [g.busStopId, g.routeList]));

      // Бүх буудал хүртэлх зайг бодож, хамгийн ойр 10-г сонгоно
      const nearby: NearbyStop[] = allStations
        .map((s) => {
          const lat = parseFloat(s.gpxY);
          const lon = parseFloat(s.gpxX);
          return {
            busStopId: s.busStopId,
            busStopName: s.busStopName,
            routeList: routeMap.get(s.busStopId) ?? null,
            distance: haversineM(latitude, longitude, lat, lon),
            lat,
            lon,
          };
        })
        .filter((s) => !Number.isNaN(s.lat) && !Number.isNaN(s.lon))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);

      setStops(nearby);

      if (nearby.length > 0) {
        const closest = nearby[0];
        const distText =
          closest.distance < 1000
            ? `${Math.round(closest.distance)} метр`
            : `${(closest.distance / 1000).toFixed(1)} километр`;
        speech.speak(
          `Хамгийн ойр буудал ${closest.busStopName}, ${distText} зайтай`,
        );
      } else {
        speech.speak("Ойролцоо буудал олдсонгүй");
      }
    } catch (err) {
      console.warn("[NearbyStops] error:", err);
      setError("Буудал хайхад алдаа гарлаа");
      speech.speak("Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      speech.speak("Ойролцоох буудлуудыг хайж байна");
    }, 500);
    findNearby();
  }, []);

  function formatDist(m: number) {
    return m < 1000 ? `${Math.round(m)} м` : `${(m / 1000).toFixed(1)} км`;
  }

  // Мэдээлэл ирэх/төлөв солигдоход layout шилждэг тул элементүүдийг дахин хэмжинэ
  // (буцах товчны байрлал тогтворгүй болж "ажиллахгүй" асуудлыг засна)
  useEffect(() => {
    const timers = [
      setTimeout(remeasureAll, 250),
      setTimeout(remeasureAll, 600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [stops, loading, error, remeasureAll]);

  return (
    <View style={s.root}>
      <Text style={s.title}>Ойролцоох буудлууд</Text>

      {loading && (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={s.loadText}>Хайж байна...</Text>
        </View>
      )}

      {error ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={findNearby}>
            <Text style={s.retryText}>Дахин оролдох</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Контентын талбай үргэлж flex:1 — доорх "Буцах" товч ТОГТВОРТОЙ доод талд үлдэнэ
          (мэдээлэл ирэхэд байрлал шилждэггүй) */}
      <View style={{ flex: 1 }}>
        {!loading && !error && (
          <ScrollView
            ref={scrollRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 90, gap: 8 }}
          >
            {stops.length === 0 && (
              <View style={s.center}>
                <Text style={s.emptyText}>Буудал олдсонгүй</Text>
              </View>
            )}

            {/* Буудал бүр explore-by-touch — хуруу хүрэхэд нэр+зай уншина, 2 дарж очно */}
            {stops.map((item, index) => (
              <AccessibleElement
                key={item.busStopId}
                id={`nearby-${uid}-${item.busStopId}`}
                label={`${item.busStopName}, ${formatDist(item.distance)} зайтай`}
                onActivate={() =>
                  router.push({
                    pathname: "/bus-route",
                    params: { prefillTo: item.busStopName },
                  } as any)
                }
              >
                <View style={s.stopCard}>
                  <View style={s.stopHeader}>
                    <Text style={s.stopIndex}>{index + 1}</Text>
                    <View style={s.stopInfo}>
                      <Text style={s.stopName}>{item.busStopName}</Text>
                      {item.routeList && item.routeList.length > 0 && (
                        <Text style={s.routeText}>
                          {item.routeList.map((r) => r.busRouteNo).join(", ")}
                        </Text>
                      )}
                    </View>
                    <Text style={s.distText}>{formatDist(item.distance)}</Text>
                  </View>
                </View>
              </AccessibleElement>
            ))}

            <AccessibleElement
              id={`nearby-${uid}-refresh`}
              label="Шинэчлэх"
              onActivate={findNearby}
            >
              <View style={s.refreshBtn}>
                <Text style={s.refreshText}>ШИНЭЧЛЭХ</Text>
              </View>
            </AccessibleElement>
          </ScrollView>
        )}
      </View>

      {/* Буцах товч ТОГТВОРТОЙ доод талд — scroll-д хөдлөхгүй */}
      <View style={{ paddingTop: 8, paddingBottom: 24 }}>
        <Button
          label="Буцах"
          height={88}
          audioSource={require("@/assets/haptics/backbtn.mp3")}
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 60,
    paddingHorizontal: 16,
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
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  center: { alignItems: "center", paddingVertical: 40 },
  loadText: { color: "rgba(255,255,255,0.6)", fontSize: 16, marginTop: 12 },
  errorText: { color: "#FF9800", fontSize: 18, fontWeight: "600" },
  retryBtn: {
    backgroundColor: "#1E88E5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  retryText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  list: { flex: 1 },
  stopCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  stopHeader: { flexDirection: "row", alignItems: "center" },
  stopIndex: { color: "#1E88E5", fontSize: 20, fontWeight: "bold", width: 32 },
  stopInfo: { flex: 1 },
  stopName: { color: "#fff", fontSize: 17, fontWeight: "600" },
  routeText: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 },
  distText: { color: "#4CAF50", fontSize: 16, fontWeight: "bold" },
  emptyText: { color: "rgba(255,255,255,0.5)", fontSize: 18 },
  refreshBtn: {
    backgroundColor: "#1E88E5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 30,
    marginTop: 12,
  },
  refreshText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
