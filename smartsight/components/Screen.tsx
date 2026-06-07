import { ss } from "../components/ui-generated/_comps";
import { View, ScrollView } from "react-native";
interface ScreenProps {
  children: React.ReactNode;
  style?: object;
}
export function Screen({ children, style }: ScreenProps) {
  return <View style={[ss.screen, style]}>{children}</View>;
}

export function ScreenScroll({ children, style }: ScreenProps) {
  // Web: overflowY: 'auto' div  →  RN: ScrollView with flex:1
  return (
    <ScrollView
      style={[{ flex: 1 }]}
      contentContainerStyle={[ss.screen, style]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
