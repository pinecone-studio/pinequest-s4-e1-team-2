import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { PermissionProvider } from "../providers/usePermission";
import { SettingsProvider } from "@/providers/SettingsProvider";
import { AccessibilityProvider } from "@/providers/AccesibilityProvider";
import { ExploreOverlay } from "@/components/ExploreOverlay";
import { VoiceProvider } from "@/src/voice";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <VoiceProvider>
      <AccessibilityProvider>
        <PermissionProvider>
          <SettingsProvider>
            <ExploreOverlay />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="permission" />
              <Stack.Screen name="home" />
              <Stack.Screen name="obstacle" />
              <Stack.Screen name="recognize" />
              <Stack.Screen name="ocr" />
              <Stack.Screen name="location" />
              <Stack.Screen name="room-search" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="bus-route" />
              <Stack.Screen name="bus-journey" />
              <Stack.Screen name="bus-scan" />
              <Stack.Screen name="nearby-stops" />
              <Stack.Screen name="modal" options={{ presentation: "modal" }} />
            </Stack>
          </SettingsProvider>
        </PermissionProvider>
      </AccessibilityProvider>
    </VoiceProvider>
  );
}
