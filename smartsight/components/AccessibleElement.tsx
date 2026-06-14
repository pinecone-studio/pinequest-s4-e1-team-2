import React, { useRef, useEffect, useCallback } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { usePathname } from 'expo-router';
import type { AVPlaybackSource } from 'expo-av';
import { useAccessibility } from '@/providers/AccesibilityProvider';

interface AccessibleElementProps {
  id: string;
  label: string;             // What gets spoken when the finger lands here
  audioSource?: AVPlaybackSource;
  onActivate?: () => void;   // Called on activate (double-tap)
  style?: StyleProp<ViewStyle>;  // Applied to the wrapper (e.g. absolute positioning)
  children: React.ReactNode;
}

export function AccessibleElement({
  id,
  label,
  audioSource,
  onActivate,
  style,
  children,
}: AccessibleElementProps) {
  const ref = useRef<View>(null);
  const isFocused = useIsFocused();
  const pathname = usePathname();
  const { register, unregister, addRemeasurer } = useAccessibility();

  // Хамгийн сүүлийн утгуудыг ref-д хадгална — ингэснээр `measure`/бүртгэл
  // ТОГТВОРТОЙ хэвээр үлдэнэ. Explore үед setActiveElementId дуудагдаж эцэг
  // дэлгэц дахин render хийхэд onActivate closure шинэчлэгддэг ч элемент
  // unregister/re-register болж "алга болохгүй" (энэ нь release hit: NONE-ийн шалтгаан байсан).
  const labelRef = useRef(label);
  const audioRef = useRef(audioSource);
  const onActivateRef = useRef(onActivate);
  labelRef.current = label;
  audioRef.current = audioSource;
  onActivateRef.current = onActivate;

  // Зөвхөн жинхэнэ тогтвортой утгуудаас хамаарна → re-render бүрт өөрчлөгдөхгүй
  const measure = useCallback(() => {
    if (!isFocused) {
      unregister(id);
      return;
    }

    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        register(
          id,
          labelRef.current,
          pathname,
          { x, y, width, height },
          audioRef.current,
          () => onActivateRef.current?.(),
        );
      }
    });
  }, [id, isFocused, pathname, register, unregister]);

  useEffect(() => {
    const timer = setTimeout(measure, 150);

    return () => {
      clearTimeout(timer);
      unregister(id);
    };
  }, [id, measure, unregister]);

  // Scroll/layout өөрчлөгдөхөд дахин хэмжихийн тулд measure-г бүртгэнэ
  useEffect(() => addRemeasurer(measure), [addRemeasurer, measure]);

  return (
    <View
      ref={ref}
      style={style}
      // onLayout fires whenever this element's size/position changes —
      // catches orientation changes, keyboard appearing, scroll reflows, etc.
      onLayout={measure}
    >
      {children}
    </View>
  );
}
