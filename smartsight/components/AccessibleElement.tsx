import React, { useRef, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { usePathname } from 'expo-router';
import type { AVPlaybackSource } from 'expo-av';
import { useAccessibility } from '@/providers/AccesibilityProvider';

interface AccessibleElementProps {
  id: string;
  label: string;             // What gets spoken when the finger lands here
  audioSource?: AVPlaybackSource;
  onActivate?: () => void;   // Called on release (double-tap or lift, your choice)
  children: React.ReactNode;
}

export function AccessibleElement({
  id,
  label,
  audioSource,
  onActivate,
  children,
}: AccessibleElementProps) {
  const ref = useRef<View>(null);
  const isFocused = useIsFocused();
  const pathname = usePathname();
  const { register, unregister } = useAccessibility();

  // Separated into its own function so both useEffect and onLayout can call it
  const measure = useCallback(() => {
    if (!isFocused) {
      unregister(id);
      return;
    }

    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        register(id, label, pathname, { x, y, width, height }, audioSource, onActivate);
      }
    });
  }, [audioSource, id, isFocused, label, onActivate, pathname, register, unregister]);

  useEffect(() => {
    const timer = setTimeout(measure, 150);

    return () => {
      clearTimeout(timer);
      unregister(id);
    };
    // Re-register if id or label ever changes (e.g. dynamic labels)
  }, [id, label, measure, unregister]);

  return (
    <View
      ref={ref}
      // onLayout fires whenever this element's size/position changes —
      // catches orientation changes, keyboard appearing, scroll reflows, etc.
      onLayout={measure}
    >
      {children}
    </View>
  );
}