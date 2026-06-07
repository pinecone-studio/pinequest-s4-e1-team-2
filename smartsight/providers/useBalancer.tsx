import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Gyroscope } from "expo-sensors";
import { Accelerometer } from "expo-sensors";
import * as Speech from "expo-speech";

//the component is for help adjusting device positions 
const LEVEL_THRESHOLD_DEG = 12;
// Complementary filter weight — how much we trust the gyroscope
const ALPHA = 0.98;
// Sensor polling interval in ms
const INTERVAL_MS = 100;

type BalancerContextType = {
  tiltX: number;          // degrees: forward/back tilt (pitch)
  tiltY: number;          // degrees: left/right tilt (roll)
  isLevel: boolean;       // true when phone is flat enough to scan
  guidance: string;       // human-readable instruction e.g. "Tilt left a little"
};

export const BalancerContext = createContext({} as BalancerContextType);

export const BalancerProvider = ({ children }: { children: React.ReactNode }) => {
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);

  const angleX = useRef(0);  // pitch accumulated from gyro
  const angleY = useRef(0);  // roll accumulated from gyro
  const lastTimestamp = useRef<number | null>(null);

  // Latest accelerometer reading — stored in ref, not state,
  // because we only need it inside the gyro callback math
  const accelRef = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    Accelerometer.setUpdateInterval(INTERVAL_MS);
    Gyroscope.setUpdateInterval(INTERVAL_MS);

    const accelSub = Accelerometer.addListener((accel) => {
      // Raw accelerometer data: x/y/z in G-force units
      // When the phone lies flat: x≈0, y≈0, z≈-1
      // When tilted forward: y increases
      accelRef.current = accel;
    });

    const gyroSub = Gyroscope.addListener((gyro) => {
      const now = Date.now();

      if (lastTimestamp.current === null) {
        lastTimestamp.current = now;
        return;
      }

      // dt = elapsed seconds since last sample
      // This is the key step: integrating angular velocity → angle
      // ∫ω dt = Δangle  (in radians, then converted to degrees)
      const dt = (now - lastTimestamp.current) / 1000;
      lastTimestamp.current = now;

      // Integrate gyroscope to get how much we rotated this tick
      const gyroAngleX = angleX.current + gyro.x * dt * (180 / Math.PI);
      const gyroAngleY = angleY.current + gyro.y * dt * (180 / Math.PI);

      // Accelerometer-derived tilt angle (noisy but drift-free)
      // Math.atan2 gives the angle of the gravity vector projection
      const accel = accelRef.current;
      const accelAngleX = Math.atan2(accel.y, accel.z) * (180 / Math.PI);
      const accelAngleY = Math.atan2(-accel.x, accel.z) * (180 / Math.PI);

      // Complementary filter: blend gyro (smooth) + accel (corrects drift)
      angleX.current = ALPHA * gyroAngleX + (1 - ALPHA) * accelAngleX;
      angleY.current = ALPHA * gyroAngleY + (1 - ALPHA) * accelAngleY;

      // Only update React state (triggers re-render) — not on every tick
      // but that's fine at 100ms intervals
      setTiltX(Math.round(angleX.current));
      setTiltY(Math.round(angleY.current));
    });

    return () => {
      accelSub.remove();
      gyroSub.remove();
    };
  }, []);

  // Derive level status and voice guidance from tilt values
  const absX = Math.abs(tiltX);
  const absY = Math.abs(tiltY);
  const isLevel = absX < LEVEL_THRESHOLD_DEG && absY < LEVEL_THRESHOLD_DEG;

  const guidance = isLevel
    ? "Phone is level"
    : absX > absY
      ? tiltX > 0 ? "Tilt forward a little" : "Tilt back a little"
      : tiltY > 0 ? "Tilt right a little"   : "Tilt left a little";

  // Speak guidance only when it changes — using a ref to avoid
  // repeating the same instruction every 100ms
  const lastGuidance = useRef("");
  useEffect(() => {
    if (guidance !== lastGuidance.current) {
      lastGuidance.current = guidance;
      Speech.speak(guidance, { rate: 1.1 });
    }
  }, [guidance]);

  return (
    <BalancerContext.Provider value={{ tiltX, tiltY, isLevel, guidance }}>
      {children}
    </BalancerContext.Provider>
  );
};

export const useBalancer = () => useContext(BalancerContext);