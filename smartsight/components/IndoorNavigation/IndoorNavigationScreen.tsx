import { useEffect, useMemo, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";

import navigationData from "@/assets/floorplans/gurvan-gol-floor-3.navigation.json";
import {
  findRoute,
  buildRouteInstructions,
  type GraphNode,
  type NavigationData,
  type QrAnchor,
  type Room,
} from "@/services/indoor-navigation";

import { useVoice } from "@/src/voice";
import { useAccessibility } from "@/providers/AccesibilityProvider";
import { Button } from "@/components/ui-generated/_comps";
import { DestinationPicker } from "./DestinationPicker";
import { RouteInstructions } from "./RouteInstructions";

const data = navigationData as NavigationData;

type IndoorQrPayload = {
  type?: string;
  buildingId?: string;
  floor?: number;
  anchorId?: string;
};

const QR1_ROUTE_DISTANCE_METERS: Record<string, number> = {
  room_302: 6.6,
  room_301: 9.9,
  room_304: 6.2,
  room_305: 8.7,
  room_00: 17.4,
  exit_floor_3: 18.7,
};

function getAnchorDisplayName(anchor: QrAnchor) {
  const match = anchor.id.match(/^qr_(\d+)$/);
  if (match) return `${match[1]}-р QR`;
  return anchor.label;
}

export function IndoorNavigationScreen({ onBack }: { onBack: () => void }) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectVersion, setSelectVersion] = useState(0);
  const [startAnchor, setStartAnchor] = useState<QrAnchor | null>(null);
  const [scanError, setScanError] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const { speak } = useVoice();
  const { setScroller, remeasureAll } = useAccessibility();
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);

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
    // Scroll хийх бүрт бүртгэгдсэн байрлалуудыг шинэчилнэ (stale координат засна)
    remeasureAll();
  };

  // QR уншсаны/өрөө сонгосны дараа камер задарч layout огцом шилждэг.
  // Layout суусны дараа бүх элементийг дахин хэмжиж зөв байрлалд бүртгэнэ.
  useEffect(() => {
    const timers = [
      setTimeout(remeasureAll, 250),
      setTimeout(remeasureAll, 600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [startAnchor, selectedRoom, remeasureAll]);

  const handleQrScanned = ({ data: rawData }: { data: string }) => {
    if (startAnchor) return;

    try {
      const payload = JSON.parse(rawData) as IndoorQrPayload;

      if (
        payload.type !== "indoor_anchor" ||
        payload.buildingId !== data.buildingId ||
        payload.floor !== data.floor ||
        !payload.anchorId
      ) {
        setScanError("Энэ давхрын QR биш байна.");
        return;
      }

      const anchor = data.qrAnchors.find(
        (item) => item.id === payload.anchorId,
      );

      if (!anchor) {
        setScanError("QR цэг navigation data дотор олдсонгүй.");
        return;
      }

      setScanError("");
      setSelectedRoom(null);
      setStartAnchor(anchor);
    } catch {
      setScanError("QR data уншиж чадсангүй.");
    }
  };

  const route = useMemo(() => {
    if (!selectedRoom || !startAnchor) return null;
    return findRoute(data, startAnchor.nodeId, selectedRoom.doorNodeId);
  }, [selectedRoom, startAnchor]);

  const routeNodes = useMemo(() => {
    if (!route) return [];
    return route.nodeIds
      .map((id) => data.graph.nodes.find((node) => node.id === id))
      .filter(Boolean) as GraphNode[];
  }, [route]);

  const instructions = useMemo(
    () => buildRouteInstructions(routeNodes),
    [routeNodes],
  );
  const distanceMeters =
    startAnchor?.id === "qr_1" && selectedRoom
      ? (QR1_ROUTE_DISTANCE_METERS[selectedRoom.id] ?? route?.distanceMeters)
      : route?.distanceMeters;

  // Өрөө сонгох болгонд (ижил өрөө дахин сонгосон ч selectVersion-оор) зааврыг дуудна
  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setSelectVersion((v) => v + 1);
  };

  useEffect(() => {
    if (!selectedRoom || instructions.length === 0) return;
    // Нийт зайг хэлэлгүй зөвхөн алхам алхмаар зааврыг уншина
    speak(instructions.join(". "));
    // selectVersion-ийг dep-д оруулснаар ижил өрөө дахин сонгоход дахин уншина
  }, [selectVersion, instructions, selectedRoom, speak]);

  const startRoomRecognition = () => {
    if (!selectedRoom) return;
    router.push({
      pathname: "/recognize",
      params: { targetRoom: selectedRoom.name },
    });
  };

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 64,
        paddingBottom: 96,
        gap: 18,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "700" }}>Өрөө хайх</Text>

      {!startAnchor ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 16 }}>
            Эхлэх цэгээ тогтоохын тулд давхрын QR уншуулна уу.
          </Text>

          {!permission ? (
            <View style={styles.cameraPlaceholder} />
          ) : !permission.granted ? (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 16 }}>
                QR уншуулахад камерын зөвшөөрөл хэрэгтэй.
              </Text>
              <Button
                label="Камер зөвшөөрөх"
                height={84}
                onPress={requestPermission}
              />
            </View>
          ) : (
            <View style={styles.cameraBox}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleQrScanned}
              />
              <View style={styles.scanFrame} pointerEvents="none" />
            </View>
          )}

          {scanError ? <Text style={styles.errorText}>{scanError}</Text> : null}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 16 }}>
            Барилгын нэр: {data.buildingName} · {data.floor} давхар ·{" "}
            {getAnchorDisplayName(startAnchor)}
          </Text>
          <Button
            label="QR дахин уншуулах"
            height={84}
            onPress={() => {
              setSelectedRoom(null);
              setStartAnchor(null);
            }}
          />
        </View>
      )}

      {startAnchor ? (
        <DestinationPicker rooms={data.rooms} onSelect={handleSelectRoom} />
      ) : null}

      <Button
        label="Буцах"
        height={88}
        audioSource={require("@/assets/haptics/backbtn.mp3")}
        onPress={onBack}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cameraBox: {
    height: 320,
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#111",
  },
  cameraPlaceholder: {
    height: 320,
    borderRadius: 16,
    backgroundColor: "#111",
  },
  scanFrame: {
    position: "absolute",
    left: "18%",
    right: "18%",
    top: "22%",
    bottom: "22%",
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 18,
  },
  errorText: {
    color: "#d00",
    fontSize: 16,
  },
});
