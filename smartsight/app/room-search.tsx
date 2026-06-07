import { IndoorNavigationScreen } from "@/components/IndoorNavigation/IndoorNavigationScreen";
import { router } from "expo-router";

export default function RoomSearchPage() {
  return <IndoorNavigationScreen onBack={() => router.replace("/home")} />;
}
