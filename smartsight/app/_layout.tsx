import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { BalancerProvider } from "../providers/useBalancer";
import { PermissionProvider } from "../providers/usePermission";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <PermissionProvider>
      <BalancerProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="permissions" />
          <Stack.Screen name="home" />
          <Stack.Screen name="obstacle" />
          <Stack.Screen name="recognize" />
          <Stack.Screen name="ocr" />
          <Stack.Screen name="location" />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      </BalancerProvider>
    </PermissionProvider>
  );
}