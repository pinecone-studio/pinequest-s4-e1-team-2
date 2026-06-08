
import React, { useRef, useEffect, useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

// ─── Types ────────────────────────────────────────────────────────────────────
interface A11yHapticButtonProps {
  /** require()'d audio file: require('../assets/audio/mn_submit.mp3') */
  audioSource: ReturnType<typeof require>;
  /** Fires only on double tap */
  onAction: () => void;
  label: string;
  doubleTapDelay?: number;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

// ─── Audio singleton ──────────────────────────────────────────────────────────
// Kept outside the component so it survives re-renders and is shared
// across all button instances — only one voice plays at a time
let activeSound: Audio.Sound | null = null;

async function playSoundFile(source: ReturnType<typeof require>) {
  try {
    // Unload whatever was playing before — no overlapping voices
    if (activeSound) {
      await activeSound.unloadAsync();
      activeSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(source as any, {
      shouldPlay: true,
    });

    activeSound = sound;

    // Auto-cleanup after playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        activeSound = null;
      }
    });

  } catch (err) {
    console.warn('[A11y] Audio playback failed:', err);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function HapticButton({
  audioSource,
  onAction,
  label,
  doubleTapDelay = 300,
  style,
  labelStyle,
}: A11yHapticButtonProps) {

  const lastTapTime = useRef<number | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Kill any pending timer if button unmounts mid-wait
  useEffect(() => {
    return () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    const now = Date.now();
    const elapsed = lastTapTime.current ? now - lastTapTime.current : Infinity;

    if (elapsed < doubleTapDelay) {
      // ── DOUBLE TAP ───────────────────────────────────────────────────────
      // Cancel the audio that was queued by the first tap
      clearTimeout(singleTapTimer.current!);
      singleTapTimer.current = null;
      lastTapTime.current = null;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAction(); // ✅ real action fires

    } else {
      // ── FIRST TAP ────────────────────────────────────────────────────────
      // Record when this tap happened so the next tap can measure elapsed time
      lastTapTime.current = now;

      // Wait — if no second tap arrives within the window, play audio
      singleTapTimer.current = setTimeout(() => {
        lastTapTime.current = null;
        singleTapTimer.current = null;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        playSoundFile(audioSource); // 🔊 plays bundled Mongolian MP3
      }, doubleTapDelay);
    }
  }, [audioSource, doubleTapDelay, onAction]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.button, style]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});