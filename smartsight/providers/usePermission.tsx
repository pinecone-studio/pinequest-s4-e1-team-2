import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Location from "expo-location";

type PermissionContextType = {
  getPermission: () => Promise<void>;
  cameraGranted: boolean;
  micGranted: boolean;
  locationGranted: boolean;
  allGranted: boolean; // convenience flag — true when all three are good
};

const PermissionContext = createContext<PermissionContextType>({
  getPermission: async () => {},
  cameraGranted: false,
  micGranted: false,
  locationGranted: false,
  allGranted: false,
});

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const [locationGranted, setLocationGranted] = useState(false);

  const checkLocation = async () => {
    const loc = await Location.getForegroundPermissionsAsync();
    setLocationGranted(loc.status === "granted");
  };
  //checking if the user already granted permission on mount
  useEffect(() => {
    checkLocation();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkLocation();
    });
    return () => sub.remove();
  }, []);

  const getPermission = async () => {
    await requestCamera();
    await requestMic();
    const loc = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(loc.status === "granted");
  };

  const allGranted =
    (cameraPermission?.granted ?? false) &&
    (micPermission?.granted ?? false) &&
    locationGranted;

  return (
    <PermissionContext.Provider
      value={{
        getPermission,
        cameraGranted: cameraPermission?.granted ?? false,
        micGranted: micPermission?.granted ?? false,
        locationGranted,
        allGranted,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => useContext(PermissionContext);
