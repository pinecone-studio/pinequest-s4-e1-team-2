import React, {
  useContext,
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AVPlaybackSource } from "expo-av";

type ElementBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type RegisteredElement = {
  label: string;
  screenKey: string;
  audioSource?: AVPlaybackSource;
  onActivate?: () => void;
  bound: ElementBounds;
};
interface HitResult {
  id: string;
  label: string;
  audioSource?: AVPlaybackSource;
  onActivate?: () => void;
}
interface AccessibilityContextValue {
  register: (
    id: string,
    label: string,
    screenKey: string,
    bound: ElementBounds,
    audioSource?: AVPlaybackSource,
    onActivate?: () => void,
  ) => void;
  unregister: (id: string) => void;
  hitTest: (x: number, y: number, screenKey: string) => HitResult | null;
  activeElementId: string | null;
  setActiveElementId: (id: string | null) => void;
}
const noop = () => {};
const AccessibilityContext = createContext<AccessibilityContextValue>({
  register: noop,
  unregister: noop,
  hitTest: () => null,
  activeElementId: null,
  setActiveElementId: noop,
});

export const AccessibilityProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const registry = useRef<Map<string, RegisteredElement>>(new Map());
  const [activeElementId, setActiveElementId] = useState<string | null>(null);

  const register = useCallback((
    id: string,
    label: string,
    screenKey: string,
    bound: ElementBounds,
    audioSource?: AVPlaybackSource,
    onActivate?: () => void,
  ) => {
    registry.current.set(id, { label, screenKey, audioSource, onActivate, bound });
  }, []);

  const unregister = useCallback((id: string) => {
    registry.current.delete(id);
    setActiveElementId((current) => (current === id ? null : current));
  }, []);

  const hitTest = useCallback((x: number, y: number, screenKey: string) => {
    const entries = Array.from(registry.current.entries()).reverse();
    for (const [id, { label, screenKey: elementScreenKey, audioSource, onActivate, bound }] of entries) {
      if (elementScreenKey !== screenKey) continue;
      if (
        x >= bound.x &&
        x <= bound.x + bound.width &&
        y >= bound.y &&
        y <= bound.y + bound.height
      ) {
        return { id, label, audioSource, onActivate };
      }
    }
    return null;
  }, []);

  const value = useMemo(
    () => ({
      register,
      unregister,
      hitTest,
      activeElementId,
      setActiveElementId,
    }),
    [activeElementId, hitTest, register, unregister],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => useContext(AccessibilityContext);
