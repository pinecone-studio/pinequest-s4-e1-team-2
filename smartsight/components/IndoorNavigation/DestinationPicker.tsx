import { Text, TouchableOpacity, View } from "react-native";
import { Room } from "@/services/indoor-navigation";

export function DestinationPicker({
  rooms,
  onSelect,
}: {
  rooms: Room[];
  onSelect: (room: Room) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {rooms.map((room) => (
        <TouchableOpacity
          key={room.id}
          onPress={() => onSelect(room)}
          style={{ backgroundColor: "#111", padding: 18, borderRadius: 12 }}
        >
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>
            {room.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
