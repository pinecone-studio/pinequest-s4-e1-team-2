import { View } from "react-native";
import { Room } from "@/services/indoor-navigation";
import { Button } from "@/components/ui-generated/_comps";

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
        <Button
          key={room.id}
          label={room.name}
          height={84}
          onPress={() => onSelect(room)}
        />
      ))}
    </View>
  );
}
