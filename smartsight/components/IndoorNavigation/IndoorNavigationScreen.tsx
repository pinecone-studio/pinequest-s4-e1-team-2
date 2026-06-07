import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import navigationData from "@/assets/floorplans/gurvan-gol-floor-3.navigation.json";
import {
  findRoute,
  buildRouteInstructions,
  type GraphNode,
  type NavigationData,
  type QrAnchor,
  type Room,
} from "@/services/indoor-navigation";

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
  const [startAnchor, setStartAnchor] = useState<QrAnchor | null>(null);
  const [scanError, setScanError] = useState("");
  const [permission, requestPermission] = useCameraPermissions();

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

      const anchor = data.qrAnchors.find((item) => item.id === payload.anchorId);

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
      ? QR1_ROUTE_DISTANCE_METERS[selectedRoom.id] ?? route?.distanceMeters
      : route?.distanceMeters;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
      <TouchableOpacity onPress={onBack} style={{ alignSelf: "flex-start" }}>
        <Text style={{ color: "#666", fontSize: 17, fontWeight: "600" }}>
          Буцах
        </Text>
      </TouchableOpacity>

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
              <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
                <Text style={styles.primaryButtonText}>Камер зөвшөөрөх</Text>
              </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setSelectedRoom(null);
              setStartAnchor(null);
            }}
          >
            <Text style={styles.secondaryButtonText}>QR дахин уншуулах</Text>
          </TouchableOpacity>
        </View>
      )}

      {startAnchor ? (
        <DestinationPicker rooms={data.rooms} onSelect={setSelectedRoom} />
      ) : null}

      {selectedRoom && route ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: "700" }}>
            {selectedRoom.name} хүртэл {distanceMeters}м
          </Text>
          <RouteInstructions instructions={instructions} />
        </View>
      ) : null}
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
  primaryButton: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#111",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#eee",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: "#d00",
    fontSize: 16,
  },
});
