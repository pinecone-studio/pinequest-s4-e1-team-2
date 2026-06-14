import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAccessibility } from "@/providers/AccesibilityProvider";
import { playSoundFile } from "@/services/audio";
import { speech } from "@/src/voice";

const DOUBLE_TAP_MS = 600;
const DRAG_SLOP = 12;

export function ExploreOverlay() {
  const pathname = usePathname();
  const { hitTest, setActiveElementId, scrollActiveBy } = useAccessibility();
  const currentIdRef = useRef<string | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  // Хоёр хурууны scroll төлөв
  const scrollingRef = useRef(false);
  const lastDyRef = useRef(0);

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
        if (hit.audioSource) {
          void playSoundFile(hit.audioSource);
        } else {
          speech.speak(hit.label);
        }
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
        // Нэг хуруу элемент дээр буусан үед барина (унших/сонгох).
        // Хоёр хуруу = scroll тул үргэлж барина.
        onStartShouldSetPanResponder: (evt) => {
          if (evt.nativeEvent.touches.length >= 2) return true;
          const x = evt.nativeEvent.pageX ?? evt.nativeEvent.locationX;
          const y = evt.nativeEvent.pageY ?? evt.nativeEvent.locationY;
          return Boolean(readAtPoint(x, y));
        },
        onMoveShouldSetPanResponder: (evt) => {
          if (evt.nativeEvent.touches.length >= 2) return true;
          const x = evt.nativeEvent.pageX ?? evt.nativeEvent.locationX;
          const y = evt.nativeEvent.pageY ?? evt.nativeEvent.locationY;
          return Boolean(readAtPoint(x, y));
        },
        onPanResponderGrant: (evt) => {
          scrollingRef.current = false;
          lastDyRef.current = 0;
          const x = evt.nativeEvent.pageX ?? evt.nativeEvent.locationX;
          const y = evt.nativeEvent.pageY ?? evt.nativeEvent.locationY;
          startPointRef.current = { x, y };
          movedRef.current = false;
          if (evt.nativeEvent.touches.length >= 2) {
            scrollingRef.current = true;
            return;
          }
          readAtPoint(x, y);
        },
        onPanResponderMove: (evt, gestureState) => {
          // Хоёр (ба түүнээс олон) хуруу мэдрэгдвэл scroll горимд шилжинэ
          if (evt.nativeEvent.touches.length >= 2) {
            if (!scrollingRef.current) {
              scrollingRef.current = true;
              lastDyRef.current = gestureState.dy;
              currentIdRef.current = null;
              setActiveElementId(null);
            }
            const delta = gestureState.dy - lastDyRef.current;
            lastDyRef.current = gestureState.dy;
            // Хуруу доош = контент доош (offset буурна)
            scrollActiveBy(-delta);
            return;
          }

          if (scrollingRef.current) return;

          const x = evt.nativeEvent.pageX ?? evt.nativeEvent.locationX;
          const y = evt.nativeEvent.pageY ?? evt.nativeEvent.locationY;
          markMoved(x, y);
          readAtPoint(x, y);
        },
        onPanResponderRelease: (evt) => {
          if (scrollingRef.current) {
            scrollingRef.current = false;
            currentIdRef.current = null;
            setActiveElementId(null);
            startPointRef.current = null;
            return;
          }

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
          scrollingRef.current = false;
          currentIdRef.current = null;
          setActiveElementId(null);
          startPointRef.current = null;
        },
      }),
    [hitTest, markMoved, pathname, readAtPoint, setActiveElementId, scrollActiveBy],
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
