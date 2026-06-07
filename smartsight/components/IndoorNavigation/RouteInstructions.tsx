import { Text, View } from "react-native";

export function RouteInstructions({
  instructions,
}: {
  instructions: string[];
}) {
  return (
    <View style={{ gap: 10 }}>
      {instructions.map((item, index) => (
        <Text key={index} style={{ fontSize: 18, lineHeight: 26 }}>
          {index + 1}. {item}
        </Text>
      ))}
    </View>
  );
}
