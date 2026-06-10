import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAccessibility } from "@/providers/AccesibilityProvider";
import { playSoundFile } from "@/services/audio";

const DOUBLE_TAP_MS = 350;
const DRAG_SLOP = 12;

export function ExploreOverlay() {
  const pathname = usePathname();
  const { hitTest, setActiveElementId } = useAccessibility();
  const currentIdRef = useRef<string | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const readAtPoint = useCallback(
    (x?: number, y?: number) => {
      if (typeof x !== "number" || typeof y !== "number") return null;

      const hit = hitTest(x, y, pathname);
      if (!hit) {
        currentIdRef.current = null;
        setActiveElementId(null);
        return null;
      }

      setActiveElementId(hit.id);

      if (hit.id !== currentIdRef.current) {
        currentIdRef.current = hit.id;
        Haptics.selectionAsync();
        void playSoundFile(hit.audioSource);
      }

      return hit;
    },
    [hitTest, pathname, setActiveElementId],
  );

  useEffect(() => {
    currentIdRef.current = null;
    lastTapRef.current = null;
    startPointRef.current = null;
    movedRef.current = false;
    setActiveElementId(null);
  }, [pathname, setActiveElementId]);

  const markMoved = useCallback((x?: number, y?: number) => {
    const start = startPointRef.current;
    if (!start || typeof x !== "number" || typeof y !== "number") return;
    if (Math.abs(x - start.x) > DRAG_SLOP || Math.abs(y - start.y) > DRAG_SLOP) {
      movedRef.current = true;
    }
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          const x = evt.nativeEvent.pageX ?? evt.nativeEvent.locationX;
          const y = evt.nativeEvent.pageY ?? evt.nativeEvent.locationY;
          return Boolean(readAtPoint(x, y));
        },
        onMoveShouldSetPanResponder: (evt) => {
          const x = evt.nativeEvent.pageX ?? evt.nativeEvent.locationX;
          const y = evt.nativeEvent.pageY ?? evt.nativeEvent.locationY;
          return Boolean(readAtPoint(x, y));
        },
        onPanResponderGrant: (evt) => {
          const x = evt.nativeEvent.pageX ?? evt.nativeEvent.locationX;
          const y = evt.nativeEvent.pageY ?? evt.nativeEvent.locationY;
          startPointRef.current = { x, y };
          movedRef.current = false;
          readAtPoint(x, y);
        },
        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.pageX ?? evt.nativeEvent.locationX;
          const y = evt.nativeEvent.pageY ?? evt.nativeEvent.locationY;
          markMoved(x, y);
          readAtPoint(x, y);
        },
        onPanResponderRelease: (evt) => {
          const x = evt.nativeEvent.pageX ?? evt.nativeEvent.locationX;
          const y = evt.nativeEvent.pageY ?? evt.nativeEvent.locationY;
          const hit = hitTest(x, y, pathname);
          const now = Date.now();

          if (hit && !movedRef.current) {
            const lastTap = lastTapRef.current;
            if (lastTap?.id === hit.id && now - lastTap.time <= DOUBLE_TAP_MS) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              hit.onActivate?.();
              lastTapRef.current = null;
            } else {
              lastTapRef.current = { id: hit.id, time: now };
            }
          }

          currentIdRef.current = null;
          setActiveElementId(null);
          startPointRef.current = null;
        },
        onPanResponderTerminate: () => {
          currentIdRef.current = null;
          setActiveElementId(null);
          startPointRef.current = null;
        },
      }),
    [hitTest, markMoved, pathname, readAtPoint, setActiveElementId],
  );

  return (
    <View
      pointerEvents="auto"
      style={styles.overlay}
      {...panResponder.panHandlers}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});
