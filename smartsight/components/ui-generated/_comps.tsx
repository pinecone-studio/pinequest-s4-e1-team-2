// components.tsx — Smart Sight · React Native
// Drop this into your /components/ folder.
// Replaces all 5 ui-generated files (frame, component, screens-onboarding, screens-features, app)
// Usage: import { T, Button, HomeScreen, ... } from '@/components/components'
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Audio, type AVPlaybackSource } from "expo-av";
import { useSettings } from "@/providers/SettingsProvider";
import { useVoice } from "@/src/voice";
import { Screen } from "../Screen";
import SelfLocationTracker, {
  useSelfLocationTracker,
} from "../SelfLocationTracker";
const { width: SCREEN_W } = Dimensions.get("window");

let activeButtonSound: Audio.Sound | null = null;

async function playButtonSound(source?: AVPlaybackSource) {
  if (!source) return;
  try {
    if (activeButtonSound) {
      await activeButtonSound.unloadAsync();
      activeButtonSound = null;
    }
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
    });
    activeButtonSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        activeButtonSound = null;
      }
    });
  } catch (err) {
    console.warn("[A11y] Button audio failed:", err);
  }
}

// ─────────────────────────────────────────────
// DESIGN TOKENS  (was: const T = { ... })
// ─────────────────────────────────────────────
export const T = {
  bg: "#FFFFFF",
  text: "#0A0A0A",
  surface: "#F1F1F1",
  danger: "#E24B4A",
  success: "#1D9E75",
  muted: "#888888",
  btnBg: "#0A0A0A",
  btnText: "#FFFFFF",
  pad: 20,
  rBtn: 16,
  rCard: 20,
};

// ─────────────────────────────────────────────
// SCREEN WRAPPERS  (was: <div style={{flex:1}}>)
// Web <div style={{flex:1, padding:20}}> → RN <View style={{flex:1, padding:20}}>
// Web overflow scroll <div> → RN <ScrollView>

interface ButtonProps {
  label: string;
  sub?: string;
  onPress?: () => void;
  onAction?: () => void;
  audioSource?: AVPlaybackSource;
  doubleTapDelay?: number;
  danger?: boolean;
  height?: number;
  fontSize?: number;
}

export function Button({
  label,
  sub,
  onPress,
  onAction,
  audioSource,
  doubleTapDelay = 300,
  danger,
  height = 122,
  fontSize = 24,
}: ButtonProps) {
  const { fontSize: globalFontSize } = useSettings();
  const adjustedFontSize = Math.max(14, fontSize + (globalFontSize - 16));
  const scale = React.useRef(new Animated.Value(1)).current;
  const lastTapTime = React.useRef<number | null>(null);
  const singleTapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const action = onAction ?? onPress;
  const useDoubleTap = Boolean(audioSource || onAction);

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 50,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();

  React.useEffect(() => {
    return () => {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
      }
    };
  }, []);

  const handlePress = () => {
    if (!action) return;
    const now = Date.now();
    const elapsed = lastTapTime.current ? now - lastTapTime.current : Infinity;

    if (!useDoubleTap) {
      action();
      return;
    }

    if (elapsed < doubleTapDelay) {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      lastTapTime.current = null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      action();
      return;
    }

    lastTapTime.current = now;
    singleTapTimer.current = setTimeout(() => {
      lastTapTime.current = null;
      singleTapTimer.current = null;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      void playButtonSound(audioSource);
    }, doubleTapDelay);
  };

  return (
    <Animated.View style={{ transform: [{ scale }], width: "100%", height }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        accessible={true}
        accessibilityRole="button"
        style={[ss.button, danger && { backgroundColor: T.danger }, { height }]}
      >
        <Text style={[ss.buttonLabel, { fontSize: adjustedFontSize }]}>{label}</Text>
        {sub && (
          <Text
            style={[ss.buttonSub, { fontSize: Math.max(14, adjustedFontSize - 8) }]}
          >
            {sub}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// ALERT BAR
// ─────────────────────────────────────────────
// Web: CSS animation ssBlink → RN: Animated.loop with Animated.sequence
export function AlertBar({
  dir,
  dist,
  blink,
}: {
  dir: string;
  dist: string | number;
  blink?: boolean;
}) {
  const opacity = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (!blink) {
      opacity.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.32,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [blink]);
  return (
    <Animated.View style={[ss.alertBar, { opacity }]}>
      <Text style={ss.alertText}>
        {dir} · {dist}м
      </Text>
    </Animated.View>
  );
}


const TABS = [
  { id: "obstacle", label: "Саад" },
  { id: "recognize", label: "Таних" },
  { id: "ocr", label: "Текст" },
  { id: "location", label: "Байршил" },
];
export function TabBar({
  active,
  onNav,
}: {
  active: string;
  onNav: (id: string) => void;
}) {
  return (
    <View style={ss.tabBar}>
      {TABS.map((t) => {
        const on = active === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            onPress={() => onNav(t.id)}
            style={ss.tabItem}
          >
            <View
              style={[ss.tabPill, on && { backgroundColor: T.text }]}
            ></View>
            <Text
              style={[ss.tabLabel, on && { fontWeight: "700", color: T.text }]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────
// SMALL SHARED PIECES
// ─────────────────────────────────────────────
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <View style={ss.logoRow}>
      <Text style={[ss.logoText, { fontSize: size }]}>Smart Sight</Text>
    </View>
  );
}

export function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <TouchableOpacity onPress={onBack} style={ss.backRow}>
      <Text style={ss.backLabel}>Буцах</Text>
    </TouchableOpacity>
  );
}

export function TopBar({
  title,
  onBack,
  big,
}: {
  title: string;
  onBack: () => void;
  big?: boolean;
}) {
  return (
    <View style={ss.topBar}>
      <TouchableOpacity
        onPress={onBack}
        style={ss.topBarBack}
      ></TouchableOpacity>
      <Text style={[ss.topBarTitle, big && { fontSize: 28 }]}>{title}</Text>
    </View>
  );
}

function CameraView({
  height,
  frame,
  children,
}: {
  height: number;
  frame?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View style={[ss.cameraView, { height }, frame && ss.cameraViewFrame]}>
      <Text style={ss.cameraLabel}>CAMERA</Text>
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────
// SCREENS — ONBOARDING
// ─────────────────────────────────────────────

// 1 · VISION
export function VisionScreen({
  onPick,
}: {
  onPick: (mode: "A" | "B") => void;
}) {
  return (
    <Screen style={{ justifyContent: "center", gap: 16 }}>
      <View style={{ marginBottom: 6 }}>
        <Text style={ss.visionEyebrow}>SMART SIGHT</Text>
        <Text style={ss.visionHeading}>Харааны чадвараа{"\n"}сонгоно уу</Text>
      </View>
      <View style={{ gap: 16 }}>
        <Button
          label="БҮРЭН ХАРААНЫ"
          sub="Огт харагддаггүй бол"
          height={132}
          onPress={() => onPick("A")}
        />
        <Button
          label="ХАГАС ХАРААНЫ"
          sub="Бага зэрэг харагддаг бол"
          height={132}
          onPress={() => onPick("B")}
        />
        <Button label="БУСАД" height={132} onPress={() => onPick("B")} />
      </View>
    </Screen>
  );
}

// 2 · LOGIN
export function LoginScreen({
  onBack,
  onLogin,
}: {
  onBack: () => void;
  onLogin: () => void;
}) {
  return (
    <Screen style={{ gap: 16 }}>
      <BackRow onBack={onBack} />
      <View style={ss.loginHeader}>
        <Text style={ss.loginTitle}>Smart Sight</Text>
        <Text style={ss.loginSub}>Нэвтэрч орно уу</Text>
      </View>
      <View style={{ gap: 16 }}>
        <Button
          label="GOOGLE"
          sub="-ООР НЭВТРЭХ"
          height={128}
          onPress={onLogin}
        />
        <Button
          label="APPLE"
          sub="-ААР НЭВТРЭХ"
          height={128}
          onPress={onLogin}
        />
        <Button
          label="FACEBOOK"
          sub="-ООР НЭВТРЭХ"
          height={128}
          onPress={onLogin}
        />
      </View>
    </Screen>
  );
}

// 3 · PERMISSIONS
const PERMS = [
  {
    id: "camera",
    title: "Камерын зөвшөөрөл",
    desc: "Объект таних, текст унших, орчноо мэдэхэд хэрэглэнэ.",
  },
  {
    id: "mic",
    title: "Микрофоны зөвшөөрөл",
    desc: "Дуун заавар өгөх, тушаал сонсоход хэрэглэнэ.",
  },
  {
    id: "loc",
    title: "Байршлын зөвшөөрөл",
    desc: "Одоо хаана байгааг тань тогтооход хэрэглэнэ.",
  },
];
export function PermissionsScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = React.useState(0);
  const p = PERMS[step];
  const next = () => (step < 2 ? setStep(step + 1) : onDone());
  return (
    <Screen style={{ gap: 20 }}>
      {/* step dots — web used CSS width transition, RN uses inline style */}
      <View style={ss.dotsRow}>
        {PERMS.map((_, i) => (
          <View
            key={i}
            style={[
              ss.dot,
              {
                width: i === step ? 26 : 8,
                backgroundColor: i <= step ? T.text : T.surface,
              },
            ]}
          />
        ))}
      </View>
      <View style={ss.permCenter}>
        <Text style={ss.permTitle}>{p.title}</Text>
        <Text style={ss.permDesc}>{p.desc}</Text>
      </View>
      <View style={{ gap: 12 }}>
        <Button label="Зөвшөөрөх" height={88} onPress={next} />
        <Button label="Үгүй" onPress={next} />
      </View>
    </Screen>
  );
}

// 4 · HOME
const FEATURES = [
  {
    id: "obstacle",
    label: "Саад мэдрэгч",
    audio: require("@/assets/haptics/obidentifybtn.mp3"),
  },
  {
    id: "recognize",
    label: "Таних систем",
    audio: require("@/assets/haptics/grlidentifybtn.mp3"),
  },
  {
    id: "ocr",
    label: "Текст унших",
    audio: require("@/assets/haptics/textreaderbtn.mp3"),
  },
  {
    id: "location",
    label: "Байршил",
    audio: require("@/assets/haptics/locationdefinebtn.mp3"),
  },
  {
    id: "room-search",
    label: "Өрөө хайх",
  },
] as const;
export function HomeScreen({
  onNav,
}: {
  onNav: (id: "obstacle" | "recognize" | "ocr" | "location" | "room-search") => void;
}) {
  return (
    <Screen style={{ gap: 18 }}>
      <Logo size={24} />
      <Text style={ss.homeHeading}>Юу хийх вэ?</Text>
      {/* Web used CSS grid 1fr 1fr. RN doesn't have CSS grid.
          Trick: wrap every 2 items in a row View */}
      <View style={{ flex: 1, gap: 14 }}>
        <View style={ss.featureRow}>
          <View style={{ flex: 1 }}>
            <Button
              label={FEATURES[0].label}
              height={150}
              onPress={() => onNav(FEATURES[0].id)}
              audioSource={FEATURES[0].audio}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={FEATURES[1].label}
              height={150}
              onPress={() => onNav(FEATURES[1].id)}
              audioSource={FEATURES[1].audio}
            />
          </View>
        </View>
        <View style={ss.featureRow}>
          <View style={{ flex: 1 }}>
            <Button
              label={FEATURES[2].label}
              height={150}
              onPress={() => onNav(FEATURES[2].id)}
              audioSource={FEATURES[2].audio}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={FEATURES[3].label}
              height={150}
              onPress={() => onNav(FEATURES[3].id)}
              audioSource={FEATURES[3].audio}
            />
          </View>
        </View>
        <Button
          label={FEATURES[4].label}
          height={112}
          onPress={() => onNav(FEATURES[4].id)}
        />
      </View>
    </Screen>
  );
}

// ─────────────────────────────────────────────
// SCREENS — FEATURES
// ─────────────────────────────────────────────

// 5 · OBSTACLE
const OBS_DATA = [
  { dir: "Шулуун урд", dist: 2.4 },
  { dir: "Баруун урд", dist: 1.4 },
  { dir: "Зүүн урд", dist: 3.1 },
  { dir: "Шулуун урд", dist: 0.9 },
];
export function ObstacleScreen({ onBack }: { onBack: () => void }) {
  const [run, setRun] = React.useState(false);
  const [i, setI] = React.useState(0);
  // setInterval in RN works exactly the same as in the browser
  React.useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setI((v) => (v + 1) % OBS_DATA.length), 2200);
    return () => clearInterval(t);
  }, [run]);
  const cur = OBS_DATA[i];
  const near = cur.dist <= 1.5;

  return (
    <Screen style={{ gap: 14 }}>
      <TopBar title="Саад мэдрэгч" onBack={onBack} />
      <CameraView height={310} frame={run && near}>
        {run ? (
          <DistTag dir={cur.dir} dist={cur.dist} />
        ) : (
          <Text style={ss.cameraHint}>Эхлүүлэхэд хүлээнэ</Text>
        )}
      </CameraView>
      {run && <AlertBar dir={cur.dir} dist={`${cur.dist}`} blink={near} />}
      <View style={{ flex: 1 }} />
      {!run ? (
        <Button
          label="Эхлүүлэх"
          height={92}
          onPress={() => {
            setRun(true);
            setI(0);
          }}
        />
      ) : (
        <Button
          label="Зогсоох"
          height={92}
          danger
          onPress={() => setRun(false)}
        />
      )}
    </Screen>
  );
}

// distance overlay inside CameraView
function DistTag({ dir, dist }: { dir: string; dist: number }) {
  return (
    // position:'absolute' works the same in RN — parent needs position:'relative' (CameraView has it)
    <View style={ss.distTagWrap}>
      <View style={ss.distDir}>
        <Text style={ss.distDirText}>{dir}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <Text style={ss.distNum}>{dist}</Text>
        <Text style={ss.distUnit}>м</Text>
      </View>
    </View>
  );
}

// 6 · RECOGNIZE
const REC_DATA = [
  { label: "11-р тоот хаалга", where: "урд байна", tag: "хаалга" },
  { label: "32-р чиглэлийн автобус", where: "ирж байна", tag: "автобус" },
  { label: "Гарц", where: "баруун тийш байна", tag: "гарц" },
  { label: "Хүн", where: "зүүн талд байна", tag: "хүн" },
];
export function RecognizeScreen({ onBack }: { onBack: () => void }) {
  const [run, setRun] = React.useState(false);
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setI((v) => (v + 1) % REC_DATA.length), 2400);
    return () => clearInterval(t);
  }, [run]);
  const cur = REC_DATA[i];
  return (
    <Screen style={{ gap: 14 }}>
      <TopBar title="Таних систем" onBack={onBack} />
      <CameraView height={330}>
        {run ? (
          // Web used position:absolute with % values.
          // RN supports % in position too — works the same here.
          <>
            <View style={ss.recognizeBox} />
            <View style={ss.recognizeTag}>
              <Text style={ss.recognizeTagText}>{cur.tag}</Text>
            </View>
          </>
        ) : (
          <Text style={ss.cameraHint}>Эхлүүлэхэд хүлээнэ</Text>
        )}
      </CameraView>
      {run && (
        <View style={ss.recognizeCard}>
          <Text style={ss.recognizeLabel}>{cur.label}</Text>
          <Text style={ss.recognizeWhere}>{cur.where}</Text>
        </View>
      )}
      <View style={{ flex: 1 }} />
      {!run ? (
        <Button
          label="Камер эхлүүлэх"
          height={92}
          onPress={() => {
            setRun(true);
            setI(0);
          }}
        />
      ) : (
        <Button
          label="Зогсоох"
          height={92}
          danger
          onPress={() => setRun(false)}
        />
      )}
    </Screen>
  );
}

// 8 · LOCATION
const LOC = {
  name: "Энхтайваны өргөн чөлөө",
  sub: "Сүхбаатарын талбайгаас 200 метрт",
};
export function LocationScreen({ onBack }: { onBack: () => void }) {
  const { addressText, errorMessage, handleGetLocation, loading } =
    useSelfLocationTracker();
  return (
    <Screen style={{ gap: 16 }}>
      <TopBar title="Байршил" onBack={onBack} />
      {/* Map placeholder — swap with react-native-maps MapView in real app */}
      {/* <View style={ss.mapThumb}>
        <Text style={ss.mapLabel}>ГАЗРЫН ЗУРАГ</Text>
      </View> */}
      <View style={{ minHeight: 140 }}>
        {loading || (!addressText && !errorMessage) ? (
          <Text style={ss.locHint}>
            {loading ? "Байршил хайж байна…" : "Доорх товчийг дарна уу"}
          </Text>
        ) : null}
        <SelfLocationTracker
          addressText={addressText}
          errorMessage={errorMessage}
        />
      </View>
      <View style={{ flex: 1 }} />
      <Button
        label={addressText ? "Давтах" : "Байршлаа мэдэх"}
        height={92}
        onPress={handleGetLocation}
      />
    </Screen>
  );
}

// ─────────────────────────────────────────────
// STYLESHEET
// All web style={{ ... }} objects live here now.
// StyleSheet.create() is the same as a CSS-in-JS object but RN validates
// it at startup and flattens it for performance.
// ─────────────────────────────────────────────
export const ss = StyleSheet.create({
  // wrappers
  screen: { flex: 1, padding: T.pad, backgroundColor: T.bg },
  // big button
  button: {
    width: "100%",
    backgroundColor: T.btnBg,
    borderRadius: T.rCard,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 14,
  },
  buttonLabel: {
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  buttonSub: {
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
  },
  // alert bar
  alertBar: {
    backgroundColor: T.danger,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  alertText: { fontSize: 22, fontWeight: "700", color: "#fff" },
  // camera view
  cameraView: {
    width: "100%",
    borderRadius: T.rBtn,
    backgroundColor: "#161616",
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraViewFrame: {
    borderWidth: 3,
    borderColor: T.danger,
  },
  cameraLabel: {
    position: "absolute",
    top: 12,
    left: 14,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
  },
  cameraHint: { color: "rgba(255,255,255,0.55)", fontSize: 18 },
  // tab bar
  tabBar: {
    height: 78,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: T.surface,
    backgroundColor: "#fff",
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5 },
  tabPill: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: { fontSize: 12, fontWeight: "500", color: T.muted },
  // logo
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoText: { fontWeight: "700", letterSpacing: -0.5, color: T.text },
  // back row
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  backLabel: { fontSize: 17, fontWeight: "600", color: T.muted },
  // top bar
  topBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  topBarBack: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: T.text,
  },
  // vision screen
  visionEyebrow: {
    fontSize: 22,
    fontWeight: "700",
    color: T.muted,
    letterSpacing: 0.5,
  },
  visionHeading: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
    marginTop: 8,
    color: T.text,
  },
  // login screen
  loginHeader: { alignItems: "center", marginVertical: 22 },
  loginTitle: {
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -1,
    color: T.text,
  },
  loginSub: { fontSize: 24, color: T.muted, marginTop: 8 },
  // permissions screen
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 10,
  },
  dot: { height: 8, borderRadius: 4 },
  permCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
  },
  permTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: T.text,
    textAlign: "center",
  },
  permDesc: {
    fontSize: 20,
    color: T.muted,
    lineHeight: 28,
    textAlign: "center",
    maxWidth: 320,
  },
  // home screen
  homeHeading: { fontSize: 24, fontWeight: "700", color: T.text },
  featureRow: { flexDirection: "row", gap: 14 },
  // dist tag (obstacle overlay)
  distTagWrap: {
    position: "absolute",
    left: 14,
    bottom: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  distDir: {
    backgroundColor: "rgba(226,75,74,0.92)",
    borderRadius: 12,
    padding: 10,
  },
  distDirText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  distNum: { color: "#fff", fontSize: 60, fontWeight: "700", lineHeight: 64 },
  distUnit: { color: "#fff", fontSize: 22, fontWeight: "500", marginBottom: 8 },
  // recognize screen
  recognizeBox: {
    position: "absolute",
    left: "18%",
    top: "24%",
    width: "58%",
    height: "38%",
    borderWidth: 3,
    borderColor: T.success,
    borderRadius: 14,
  },
  recognizeTag: {
    position: "absolute",
    left: "18%",
    top: "18%",
    backgroundColor: T.success,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  recognizeTagText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  recognizeCard: {
    backgroundColor: T.btnBg,
    borderRadius: T.rCard,
    padding: 18,
    gap: 6,
  },
  recognizeLabel: { color: "#fff", fontSize: 26, fontWeight: "700" },
  recognizeWhere: { color: "rgba(255,255,255,0.72)", fontSize: 20 },
  // ocr screen
  ocrResult: {
    flex: 1,
    backgroundColor: T.btnBg,
    borderRadius: T.rCard,
    padding: 18,
  },
  ocrResultText: {
    fontSize: 24,
    fontWeight: "500",
    color: "#fff",
    lineHeight: 35,
  },
  // location screen
  mapThumb: {
    width: "100%",
    height: 250,
    borderRadius: T.rBtn,
    backgroundColor: "#e7ece8",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mapLabel: {
    position: "absolute",
    top: 12,
    left: 14,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: "#7d877f",
    letterSpacing: 1,
  },
  mapPin: { position: "absolute" },
  locName: { fontSize: 26, fontWeight: "700", lineHeight: 32, color: T.text },
  locSub: { fontSize: 20, color: T.muted, marginTop: 6 },
  locHint: { fontSize: 20, color: T.muted },
});
