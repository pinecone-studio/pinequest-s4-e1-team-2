// components.tsx — Smart Sight · React Native
// Drop this into your /components/ folder.
// Replaces all 5 ui-generated files (frame, component, screens-onboarding, screens-features, app)
// Usage: import { T, BigButton, HomeScreen, ... } from '@/components/components'
import React, { useRef } from "react";
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

const { width: SCREEN_W } = Dimensions.get("window");

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
// ICONS  (was: <svg> paths → now react-native-svg)
// Install: npx expo install react-native-svg
// ─────────────────────────────────────────────
// If you haven't installed react-native-svg yet, swap every <Icon> with a
// plain <Text> emoji as a placeholder — the layout won't break.
import Svg, { Path, Circle, Rect } from "react-native-svg";

type IconName =
  | "eye"
  | "eyeOff"
  | "dots"
  | "radar"
  | "book"
  | "pin"
  | "camera"
  | "mic"
  | "check"
  | "x"
  | "back"
  | "volume"
  | "refresh"
  | "alert"
  | "scan";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}

export function Icon({
  name,
  size = 24,
  color = "#0A0A0A",
  stroke = 2,
}: IconProps) {
  const p = {
    stroke: color,
    strokeWidth: stroke,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const shapes: Record<IconName, React.ReactNode> = {
    eye: (
      <>
        <Path
          {...p}
          d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
        />
        <Circle {...p} cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <Path
          {...p}
          d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
        />
        <Circle {...p} cx="12" cy="12" r="3" />
        <Path {...p} d="M3 3l18 18" />
      </>
    ),
    dots: (
      <>
        <Circle fill={color} cx="5" cy="12" r="1.6" />
        <Circle fill={color} cx="12" cy="12" r="1.6" />
        <Circle fill={color} cx="19" cy="12" r="1.6" />
      </>
    ),
    radar: (
      <>
        <Circle fill={color} cx="12" cy="12" r="1.9" />
        <Circle {...p} cx="12" cy="12" r="5.5" />
        <Circle {...p} cx="12" cy="12" r="9.5" />
      </>
    ),
    book: (
      <>
        <Path {...p} d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2V4Z" />
        <Path {...p} d="M9 4v16" />
      </>
    ),
    pin: (
      <>
        <Path {...p} d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
        <Circle {...p} cx="12" cy="10" r="2.6" />
      </>
    ),
    camera: (
      <>
        <Path
          {...p}
          d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        />
        <Circle {...p} cx="12" cy="13" r="3.4" />
      </>
    ),
    mic: (
      <>
        <Path {...p} d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" />
        <Path {...p} d="M6 11a6 6 0 0 0 12 0" />
        <Path {...p} d="M12 17v4" />
      </>
    ),
    check: <Path {...p} d="M5 12.5l4.2 4.2L19 6.5" />,
    x: <Path {...p} d="M6 6l12 12M18 6L6 18" />,
    back: <Path {...p} d="M15 5l-7 7 7 7" />,
    volume: (
      <>
        <Path {...p} d="M4 9v6h4l5 4V5L8 9H4Z" />
        <Path {...p} d="M16.5 8.5a5 5 0 0 1 0 7" />
        <Path {...p} d="M19 6a8.5 8.5 0 0 1 0 12" />
      </>
    ),
    refresh: (
      <>
        <Path {...p} d="M4 12a8 8 0 0 1 13.7-5.6L21 9" />
        <Path {...p} d="M21 4v5h-5" />
        <Path {...p} d="M20 12a8 8 0 0 1-13.7 5.6L3 15" />
        <Path {...p} d="M3 20v-5h5" />
      </>
    ),
    alert: (
      <>
        <Path {...p} d="M12 3.5 21 19H3L12 3.5Z" />
        <Path {...p} d="M12 10v4" />
        <Circle fill={color} cx="12" cy="16.6" r="0.4" />
      </>
    ),
    scan: (
      <>
        <Path {...p} d="M4 8V5a1 1 0 0 1 1-1h3" />
        <Path {...p} d="M16 4h3a1 1 0 0 1 1 1v3" />
        <Path {...p} d="M20 16v3a1 1 0 0 1-1 1h-3" />
        <Path {...p} d="M8 20H5a1 1 0 0 1-1-1v-3" />
        <Path {...p} d="M4 12h16" />
      </>
    ),
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {shapes[name]}
    </Svg>
  );
}

// ─────────────────────────────────────────────
// SCREEN WRAPPERS  (was: <div style={{flex:1}}>)
// ─────────────────────────────────────────────
// Web <div style={{flex:1, padding:20}}> → RN <View style={{flex:1, padding:20}}>
// Web overflow scroll <div> → RN <ScrollView>

interface ScreenProps {
  children: React.ReactNode;
  style?: object;
}

export function Screen({ children, style }: ScreenProps) {
  return <View style={[ss.screen, style]}>{children}</View>;
}

export function ScreenScroll({ children, style }: ScreenProps) {
  // Web: overflowY: 'auto' div  →  RN: ScrollView with flex:1
  return (
    <ScrollView
      style={[{ flex: 1 }]}
      contentContainerStyle={[ss.screen, style]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// SHARED BUTTONS
// ─────────────────────────────────────────────
// Web: <button onClick={fn}> → RN: <TouchableOpacity onPress={fn}>
// Web: cursor:'pointer' → delete it (doesn't exist in RN)
// Web: transform: press ? 'scale(0.975)' → RN: Animated.spring on scale

interface BigButtonProps {
  label: string;
  sub?: string;
  onPress?: () => void;
  danger?: boolean;
  height?: number;
  flex?: boolean;
}
export function BigButton({
  label,
  sub,
  onPress,
  danger,
  height = 124,
  flex,
}: BigButtonProps) {
  const scale = React.useRef(new Animated.Value(1)).current;
  // Animated.spring is RN's equivalent of CSS transition: transform
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
  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        width: "100%",
        ...(flex ? { flex: 1 } : { height }),
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={[
          ss.bigBtn,
          danger && { backgroundColor: T.danger },
          { height: flex ? "100%" : height },
        ]}
      >
        <Text style={ss.bigBtnLabel}>{label}</Text>
        {sub && <Text style={ss.bigBtnSub}>{sub}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

interface FeatureBtnProps {
  icon?: IconName;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  height?: number;
  row?: boolean;
}
export function FeatureBtn({
  icon,
  label,
  onPress,
  danger,
  height = 122,
  row,
}: FeatureBtnProps) {
  const scale = React.useRef(new Animated.Value(1)).current;
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
  return (
    <Animated.View style={{ transform: [{ scale }], width: "100%", height }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={[
          ss.featureBtn,
          danger && { backgroundColor: T.danger },
          { height },
          row && { flexDirection: "row", gap: 14 },
        ]}
      >
        {icon && <Icon name={icon} size={44} color="#fff" stroke={2} />}
        <Text style={ss.featureBtnLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Secondary (grey) buttons
export function SecondaryBig({
  label,
  onPress,
  height = 84,
}: {
  label: string;
  onPress?: () => void;
  height?: number;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[ss.secondaryBig, { height }]}>
      <Text style={ss.secondaryBigLabel}>{label}</Text>
    </TouchableOpacity>
  );
}
export function SecondaryB({
  label,
  onPress,
  height = 76,
}: {
  label: string;
  onPress?: () => void;
  height?: number;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[ss.secondaryB, { height }]}>
      <Text style={ss.secondaryBLabel}>{label}</Text>
    </TouchableOpacity>
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
      <Icon name="alert" size={30} color="#fff" stroke={2.2} />
      <Text style={ss.alertText}>
        {dir} · {dist}м
      </Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// CAMERA VIEW  (was: styled <div> with dark bg)
// In a real app swap this out for expo-camera
// ─────────────────────────────────────────────
export function CameraView({
  children,
  height,
  frame,
}: {
  children?: React.ReactNode;
  height: number;
  frame?: boolean;
}) {
  const borderAnim = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (!frame) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [frame]);
  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", T.danger],
  });
  return (
    <Animated.View
      style={[
        ss.cameraView,
        { height },
        frame && { borderWidth: 4, borderColor },
      ]}
    >
      <Text style={ss.cameraLabel}>● КАМЕР · LIVE</Text>
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// TAB BAR  (was: <div style={{height:78}}>)
// In a real Expo Router app you'd use <Tabs> in _layout.tsx instead.
// This component is a UI-only replica for screens that embed it manually.
// ─────────────────────────────────────────────
const TABS = [
  { id: "obstacle", icon: "radar" as IconName, label: "Саад" },
  { id: "recognize", icon: "eye" as IconName, label: "Таних" },
  { id: "ocr", icon: "book" as IconName, label: "Текст" },
  { id: "location", icon: "pin" as IconName, label: "Байршил" },
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
            <View style={[ss.tabPill, on && { backgroundColor: T.text }]}>
              <Icon
                name={t.icon}
                size={24}
                color={on ? "#fff" : T.muted}
                stroke={2.1}
              />
            </View>
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
      <Icon name="eye" size={36} color={T.text} stroke={2.1} />
      <Text style={[ss.logoText, { fontSize: size }]}>Smart Sight</Text>
    </View>
  );
}

export function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <TouchableOpacity onPress={onBack} style={ss.backRow}>
      <Icon name="back" size={22} color={T.muted} />
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
      <TouchableOpacity onPress={onBack} style={ss.topBarBack}>
        <Icon name="back" size={26} color={T.text} stroke={2.2} />
      </TouchableOpacity>
      <Text style={[ss.topBarTitle, big && { fontSize: 28 }]}>{title}</Text>
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
        <BigButton
          label="БҮРЭН ХАРААНЫ"
          sub="Огт харагддаггүй бол"
          height={132}
          onPress={() => onPick("A")}
        />
        <BigButton
          label="ХАГАС ХАРААНЫ"
          sub="Бага зэрэг харагддаг бол"
          height={132}
          onPress={() => onPick("B")}
        />
        <BigButton label="БУСАД" height={132} onPress={() => onPick("B")} />
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
        <BigButton
          label="GOOGLE"
          sub="-ООР НЭВТРЭХ"
          height={128}
          onPress={onLogin}
        />
        <BigButton
          label="APPLE"
          sub="-ААР НЭВТРЭХ"
          height={128}
          onPress={onLogin}
        />
        <BigButton
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
    icon: "camera" as IconName,
    title: "Камерын зөвшөөрөл",
    desc: "Объект таних, текст унших, орчноо мэдэхэд хэрэглэнэ.",
  },
  {
    id: "mic",
    icon: "mic" as IconName,
    title: "Микрофоны зөвшөөрөл",
    desc: "Дуун заавар өгөх, тушаал сонсоход хэрэглэнэ.",
  },
  {
    id: "loc",
    icon: "pin" as IconName,
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
        <View style={ss.permIcon}>
          <Icon name={p.icon} size={64} color={T.text} stroke={1.8} />
        </View>
        <Text style={ss.permTitle}>{p.title}</Text>
        <Text style={ss.permDesc}>{p.desc}</Text>
      </View>
      <View style={{ gap: 12 }}>
        <FeatureBtn
          row
          icon="check"
          label="Зөвшөөрөх"
          height={88}
          onPress={next}
        />
        <SecondaryB label="Үгүй" onPress={next} />
      </View>
    </Screen>
  );
}

// 4 · HOME
const FEATURES = [
  { id: "obstacle", icon: "radar" as IconName, label: "Саад мэдрэгч" },
  { id: "recognize", icon: "eye" as IconName, label: "Таних систем" },
  { id: "ocr", icon: "book" as IconName, label: "Текст унших" },
  { id: "location", icon: "pin" as IconName, label: "Байршил" },
];
export function HomeScreen({ onNav }: { onNav: (id: string) => void }) {
  return (
    <Screen style={{ gap: 18 }}>
      <Logo size={24} />
      <Text style={ss.homeHeading}>Юу хийх вэ?</Text>
      {/* Web used CSS grid 1fr 1fr. RN doesn't have CSS grid.
          Trick: wrap every 2 items in a row View */}
      <View style={{ flex: 1, gap: 14 }}>
        <View style={ss.featureRow}>
          <View style={{ flex: 1 }}>
            <FeatureBtn
              icon={FEATURES[0].icon}
              label={FEATURES[0].label}
              height={150}
              onPress={() => onNav(FEATURES[0].id)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FeatureBtn
              icon={FEATURES[1].icon}
              label={FEATURES[1].label}
              height={150}
              onPress={() => onNav(FEATURES[1].id)}
            />
          </View>
        </View>
        <View style={ss.featureRow}>
          <View style={{ flex: 1 }}>
            <FeatureBtn
              icon={FEATURES[2].icon}
              label={FEATURES[2].label}
              height={150}
              onPress={() => onNav(FEATURES[2].id)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FeatureBtn
              icon={FEATURES[3].icon}
              label={FEATURES[3].label}
              height={150}
              onPress={() => onNav(FEATURES[3].id)}
            />
          </View>
        </View>
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
        <FeatureBtn
          row
          icon="radar"
          label="Эхлүүлэх"
          height={92}
          onPress={() => {
            setRun(true);
            setI(0);
          }}
        />
      ) : (
        <FeatureBtn
          row
          icon="x"
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
        <FeatureBtn
          row
          icon="eye"
          label="Камер эхлүүлэх"
          height={92}
          onPress={() => {
            setRun(true);
            setI(0);
          }}
        />
      ) : (
        <FeatureBtn
          row
          icon="x"
          label="Зогсоох"
          height={92}
          danger
          onPress={() => setRun(false)}
        />
      )}
    </Screen>
  );
}

// 7 · OCR
const OCR_RESULT =
  "ЦАЙНЫ ГАЗАР «ОРХОН»\nНээлттэй: 09:00 – 22:00\nАмерикано — 5500₮\nКапучино — 6500₮\nСүүтэй цай — 3500₮";
export function OcrScreen({ onBack }: { onBack: () => void }) {
  const [st, setSt] = React.useState<"idle" | "reading" | "done">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const capture = () => {
    setSt("reading");
    if (timer.current) {
      clearTimeout(timer.current);
    }
    // setTimeout works identically in RN — it's from the JS runtime, not the browser
    timer.current = setTimeout(() => setSt("done"), 1400);
  };
  React.useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );
  return (
    <Screen style={{ gap: 14 }}>
      <TopBar title="Текст унших" onBack={onBack} />
      <CameraView height={250}>
        <Text style={ss.cameraHint}>
          {st === "reading"
            ? "Уншиж байна…"
            : st === "done"
              ? "Дахин авахад хүлээнэ"
              : "Зураг авна"}
        </Text>
      </CameraView>
      {st === "done" && (
        // ScrollView inside a Screen — needs flex:1 so it doesn't overflow
        <ScrollView style={ss.ocrResult} showsVerticalScrollIndicator={false}>
          <Text style={ss.ocrResultText}>{OCR_RESULT}</Text>
        </ScrollView>
      )}
      {st !== "done" && <View style={{ flex: 1 }} />}
      {st === "done" ? (
        <FeatureBtn
          row
          icon="refresh"
          label="Дахин авах"
          height={92}
          onPress={() => setSt("idle")}
        />
      ) : (
        <FeatureBtn
          row
          icon="camera"
          label="Зураг авах"
          height={92}
          onPress={capture}
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
  const [st, setSt] = React.useState<"idle" | "locating" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const locate = () => {
    setSt("locating");
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setSt("done"), 1300);
  };
  React.useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );
  return (
    <Screen style={{ gap: 16 }}>
      <TopBar title="Байршил" onBack={onBack} />
      {/* Map placeholder — swap with react-native-maps MapView in real app */}
      <View style={ss.mapThumb}>
        <Text style={ss.mapLabel}>ГАЗРЫН ЗУРАГ</Text>
        <View style={ss.mapPin}>
          <Icon name="pin" size={48} color={T.danger} stroke={2.4} />
        </View>
      </View>
      <View style={{ minHeight: 70 }}>
        {st === "done" ? (
          <>
            <Text style={ss.locName}>{LOC.name}</Text>
            <Text style={ss.locSub}>{LOC.sub}</Text>
          </>
        ) : (
          <Text style={ss.locHint}>
            {st === "locating"
              ? "Байршил хайж байна…"
              : "Доорх товчийг дарна уу"}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }} />
      <FeatureBtn
        row
        icon={st === "done" ? "volume" : "pin"}
        label={st === "done" ? "Давтах" : "Байршлаа мэдэх"}
        height={92}
        onPress={locate}
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
const ss = StyleSheet.create({
  // wrappers
  screen: { flex: 1, padding: T.pad, backgroundColor: T.bg },
  // big button
  bigBtn: {
    width: "100%",
    backgroundColor: T.btnBg,
    borderRadius: T.rBtn,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
  },
  bigBtnLabel: {
    fontSize: 40,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  bigBtnSub: {
    fontSize: 18,
    color: "rgba(255,255,255,0.62)",
    textAlign: "center",
  },
  // feature button
  featureBtn: {
    width: "100%",
    backgroundColor: T.btnBg,
    borderRadius: T.rCard,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
  },
  featureBtnLabel: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  // secondary
  secondaryBig: {
    width: "100%",
    backgroundColor: T.surface,
    borderRadius: T.rBtn,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBigLabel: { fontSize: 34, fontWeight: "700", color: T.text },
  secondaryB: {
    width: "100%",
    backgroundColor: T.surface,
    borderRadius: T.rCard,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBLabel: { fontSize: 22, fontWeight: "700", color: T.text },
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
  permIcon: {
    width: 132,
    height: 132,
    borderRadius: 40,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
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
    top: "24%",
    left: "16%",
    width: "56%",
    height: "46%",
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 10,
  },
  recognizeTag: {
    position: "absolute",
    top: "18%",
    left: "16%",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recognizeTagText: { fontSize: 16, fontWeight: "700", color: T.text },
  recognizeCard: {
    backgroundColor: T.surface,
    borderRadius: T.rCard,
    padding: 18,
  },
  recognizeLabel: { fontSize: 26, fontWeight: "700", color: T.text },
  recognizeWhere: { fontSize: 20, color: T.muted, marginTop: 2 },
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
