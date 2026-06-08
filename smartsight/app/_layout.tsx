import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { BalancerProvider } from "../providers/useBalancer";
import { PermissionProvider } from "../providers/usePermission";
import { SettingsProvider } from "@/providers/SettingsProvider";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SettingsProvider>
      <PermissionProvider>
        <BalancerProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="permission" />
            <Stack.Screen name="home" />
            <Stack.Screen name="obstacle" />
            <Stack.Screen name="recognize" />
            <Stack.Screen name="ocr" />
            <Stack.Screen name="location" />
            <Stack.Screen name="room-search" />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          </Stack>
        </BalancerProvider>
      </PermissionProvider>
    </SettingsProvider>
  );
}
