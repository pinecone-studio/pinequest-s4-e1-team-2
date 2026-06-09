/**
 * ObstacleDetector.tsx — production (expo run:android / expo run:ios)
 *
 * Expo Go дэмждэггүй — react-native-fast-tflite native module шаарддаг.
 * Ажиллуулах: npx expo run:android
 *
 * Pipeline:
 *   CameraView → takePictureAsync → resize 640×640 → NHWC float32 tensor
 *   → YOLOv8n.tflite inference → NMS → danger zone + proximity filter
 *   → Vibration + beep alert + TTS
 *
 * Функцууд:
 *   1. Шөнийн горим (auto torch)
 *   2. Ойртож буй объект мэдрэх (approaching detection)
 *   3. Олон объект нэгтгэж хэлэх
 *   4. Тохиргоотой мэдрэмж (sensitivity)
 *   5. Машин/тээвэр priority анхааруулга
 *   6. Паркинг сенсор загварын beep
 *   7. Гэрлэн дохио / зогсоох тэмдэг таних
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { useSettings } from '@/providers/SettingsProvider';

// ── Model ─────────────────────────────────────────────────────────────────────

const MODEL_INPUT   = 640;   // YOLOv8n input: 640×640
const NUM_ANCHORS   = 8400;  // 80²+40²+20² grid points
const NUM_CLASSES   = 80;    // COCO
const CONF_THRESHOLD = 0.45;
const IOU_THRESHOLD  = 0.45;

// ── Мэдрэмж тохиргоо (sensitivity → MIN_BBOX_AREA) ──────────────────────────

const SENSITIVITY_MAP = {
  low:    0.10,  // ~1.5м хүртэл
  medium: 0.06,  // ~2м хүртэл
  high:   0.03,  // ~3.5м хүртэл
} as const;

// ── Дунд бүс ─────────────────────────────────────────────────────────────────

const DANGER = { xMin: 0.25, xMax: 0.75, yMin: 0.18, yMax: 0.85 } as const;

// ── Хугацаа ───────────────────────────────────────────────────────────────────

const DETECT_INTERVAL_MS = 500;
const ALERT_COOLDOWN_MS  = 1500;
const VEHICLE_COOLDOWN_MS = 800; // Тээврийн хэрэгсэлд хурдан cooldown

// ── Шөнийн горим ─────────────────────────────────────────────────────────────
const DARK_BRIGHTNESS_THRESHOLD = 60; // 0-255, доор нь torch асна

// ── Roboflow мөчир таних ────────────────────────────────────────────────────
const ROBOFLOW_API_KEY = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;
const BRANCH_MODEL_ID = 'tree-branch-detection-jemc7/1';
const BRANCH_CHECK_INTERVAL = 3000;

// ── COCO class нэрүүд (монгол) ──────────────────────────────────────────────

const COCO_NAMES_MN: Record<number, string> = {
  0: 'Хүн', 1: 'Унадаг дугуй', 2: 'Машин', 3: 'Мотоцикл', 4: 'Онгоц',
  5: 'Автобус', 6: 'Галт тэрэг', 7: 'Ачааны машин', 8: 'Завь', 9: 'Гэрлэн дохио',
  10: 'Гал хонхорхой', 11: 'Зогсоох тэмдэг', 12: 'Паркметр', 13: 'Сандал',
  14: 'Шувуу', 15: 'Муур', 16: 'Нохой', 17: 'Морь', 18: 'Хонь', 19: 'Үхэр',
  20: 'Заан', 21: 'Баавгай', 22: 'Тахь', 23: 'Ахуйн амьтан',
  24: 'Цүнх', 25: 'Шүхэр', 26: 'Гар цүнх', 27: 'Зүүлт',
  28: 'Чемодан', 29: 'Фрисби', 30: 'Цана', 31: 'Цанын тавцан',
  32: 'Бөмбөг', 33: 'Бейсбол', 34: 'Бейсбол бээлий', 35: 'Скейтборд',
  36: 'Серфинг', 37: 'Теннис', 38: 'Лонх', 39: 'Дарсны аяга',
  40: 'Аяга', 41: 'Сэрээ', 42: 'Хутга', 43: 'Халбага', 44: 'Аяга',
  45: 'Жимс', 46: 'Банан', 47: 'Алим', 48: 'Жигнэмэг', 49: 'Жүрж',
  50: 'Брокколи', 51: 'Лууван', 52: 'Хотдог', 53: 'Пицца', 54: 'Бялуу',
  55: 'Бялуу', 56: 'Ширээ', 57: 'Цэцэг', 58: 'Суудлын ширээ',
  59: 'Ор', 60: 'Хоолны ширээ', 61: 'Жорлон', 62: 'ТВ',
  63: 'Зөөврийн компьютер', 64: 'Хулгана', 65: 'Удирдлагч', 66: 'Гар утас',
  67: 'Зуух', 68: 'Шарагч', 69: 'Угаалгын машин', 70: 'Хөргөгч',
  71: 'Ном', 72: 'Цаг', 73: 'Ваар', 74: 'Хайч', 75: 'Баавгай тоглоом',
  76: 'Үсний хатаагч', 77: 'Шүдний сойз',
};

function getCocoNameMn(classId: number): string {
  return COCO_NAMES_MN[classId] ?? `Объект ${classId}`;
}

// ── [5] Тээврийн хэрэгсэл priority ──────────────────────────────────────────

const VEHICLE_CLASSES = new Set([1, 2, 3, 5, 6, 7]); // дугуй, машин, мотоцикл, автобус, галт тэрэг, ачааны
function isVehicle(classId: number): boolean {
  return VEHICLE_CLASSES.has(classId);
}

// ── [7] Замын тэмдэг / гэрлэн дохио ────────────────────────────────────────

const TRAFFIC_CLASSES = new Set([9, 11]); // гэрлэн дохио, зогсоох тэмдэг
function isTrafficSign(classId: number): boolean {
  return TRAFFIC_CLASSES.has(classId);
}

// ── Чиглэл тодорхойлогч ────────────────────────────────────────────────────

function getDirection(cx: number): string {
  if (cx < 0.33) return 'зүүн талд';
  if (cx > 0.67) return 'баруун талд';
  return 'урд';
}

// ── Зай тооцоолол ───────────────────────────────────────────────────────────

type ProximityLevel = 'near' | 'medium' | 'far';

function getProximity(area: number): { level: ProximityLevel; text: string } {
  if (area >= 0.12) return { level: 'near', text: 'маш ойр' };
  if (area >= 0.06) return { level: 'medium', text: 'ойр' };
  return { level: 'far', text: 'холхон' };
}

// ── Haptic ялгаа ────────────────────────────────────────────────────────────

function vibrateByProximity(level: ProximityLevel) {
  Vibration.cancel();
  switch (level) {
    case 'near':
      Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      break;
    case 'medium':
      Vibration.vibrate([0, 400, 200, 400]);
      break;
    case 'far':
      Vibration.vibrate(300);
      break;
  }
}

// ── [3] Олон объект нэгтгэж хэлэх ─────────────────────────────────────────

const SPEAK_COOLDOWN_MS = 3000;
let lastSpeakTime = 0;
let lastSpeakText = '';

function speakDangers(dangers: BBox[], approachingIds: Set<number>) {
  const now = Date.now();

  // Объектуудыг бүлэглэх: classId+direction → count
  const groups = new Map<string, { name: string; direction: string; count: number; isApproaching: boolean }>();

  for (const b of dangers) {
    const name = getCocoNameMn(b.classId);
    const direction = getDirection(b.cx);
    const key = `${b.classId}_${direction}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
      if (approachingIds.has(b.classId)) existing.isApproaching = true;
    } else {
      groups.set(key, { name, direction, count: 1, isApproaching: approachingIds.has(b.classId) });
    }
  }

  // Хамгийн ойр байгаагийн proximity
  const closest = dangers.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
  const proximity = getProximity(closest.w * closest.h);

  // Мессеж бүтээх
  const parts: string[] = [];
  for (const g of groups.values()) {
    let part = g.count > 1 ? `${g.count} ${g.name}` : g.name;
    part += ` ${g.direction}`;
    if (g.isApproaching) part += ', ойртож байна';
    parts.push(part);
  }

  // [7] Гэрлэн дохио/зогсоох тэмдэг тусгай мессеж
  const trafficDanger = dangers.find(b => isTrafficSign(b.classId));
  if (trafficDanger) {
    const tName = getCocoNameMn(trafficDanger.classId);
    parts.unshift(`Анхаар! ${tName}`);
  }

  let text = parts.join(', ') + `, ${proximity.text}`;

  if (text === lastSpeakText && now - lastSpeakTime < SPEAK_COOLDOWN_MS) return;
  lastSpeakTime = now;
  lastSpeakText = text;
  Speech.stop();
  Speech.speak(text, { language: 'mn-MN', rate: 1.2 });
}

// ── Төрлүүд ───────────────────────────────────────────────────────────────────

interface BBox {
  cx: number;
  cy: number;
  w:  number;
  h:  number;
  score:   number;
  classId: number;
}

// ── [1] Зурагны дундаж гэрэлтүүлэг тооцоолох ──────────────────────────────

function computeBrightness(tensor: Float32Array, pixelCount: number): number {
  // Sample every 50th pixel for speed
  let sum = 0;
  let count = 0;
  for (let i = 0; i < pixelCount; i += 50) {
    const r = tensor[i * 3];
    const g = tensor[i * 3 + 1];
    const b = tensor[i * 3 + 2];
    sum += (r + g + b) / 3;
    count++;
  }
  return (sum / count) * 255; // back to 0-255 range
}

// ── Зураг → тензор ────────────────────────────────────────────────────────────

async function imageUriToTensor(uri: string): Promise<Float32Array> {
  const { base64 } = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MODEL_INPUT, height: MODEL_INPUT } }],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 1.0 },
  );

  if (!base64) throw new Error('ImageManipulator: base64 хоосон');

  const compressed = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const { data }   = jpeg.decode(compressed, { useTArray: true });

  const n      = MODEL_INPUT * MODEL_INPUT;
  const tensor = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    tensor[i * 3]     = data[i * 4]     / 255;
    tensor[i * 3 + 1] = data[i * 4 + 1] / 255;
    tensor[i * 3 + 2] = data[i * 4 + 2] / 255;
  }
  return tensor;
}

// ── YOLOv8n гаралт задлах ─────────────────────────────────────────────────────

function parseDetections(output: Float32Array): BBox[] {
  const raw: BBox[] = [];

  for (let a = 0; a < NUM_ANCHORS; a++) {
    let bestScore = 0, bestClass = 0;
    for (let c = 0; c < NUM_CLASSES; c++) {
      const s = output[(4 + c) * NUM_ANCHORS + a];
      if (s > bestScore) { bestScore = s; bestClass = c; }
    }
    if (bestScore < CONF_THRESHOLD) continue;

    raw.push({
      cx:      output[0 * NUM_ANCHORS + a],
      cy:      output[1 * NUM_ANCHORS + a],
      w:       output[2 * NUM_ANCHORS + a],
      h:       output[3 * NUM_ANCHORS + a],
      score:   bestScore,
      classId: bestClass,
    });
  }

  return nms(raw);
}

function iou(a: BBox, b: BBox): number {
  const ax1 = a.cx - a.w / 2, ay1 = a.cy - a.h / 2;
  const ax2 = a.cx + a.w / 2, ay2 = a.cy + a.h / 2;
  const bx1 = b.cx - b.w / 2, by1 = b.cy - b.h / 2;
  const bx2 = b.cx + b.w / 2, by2 = b.cy + b.h / 2;
  const iw  = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const ih  = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

function nms(boxes: BBox[]): BBox[] {
  boxes.sort((a, b) => b.score - a.score);
  const kept = [] as BBox[];
  const skip = new Uint8Array(boxes.length);
  for (let i = 0; i < boxes.length; i++) {
    if (skip[i]) continue;
    kept.push(boxes[i]);
    for (let j = i + 1; j < boxes.length; j++) {
      if (!skip[j] && iou(boxes[i], boxes[j]) > IOU_THRESHOLD) skip[j] = 1;
    }
  }
  return kept;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ObstacleDetector() {
  const [permission, requestPermission] = useCameraPermissions();
  const [dangerBoxes, setDangerBoxes]   = useState<BBox[]>([]);
  const [modelReady, setModelReady]     = useState(false);
  const [modelError, setModelError]     = useState<string | null>(null);
  const [branchCount, setBranchCount]   = useState(0);
  const [torchOn, setTorchOn]           = useState(false);       // [1] Шөнийн горим
  const [approachingText, setApproachingText] = useState('');    // [2] Ойртож буй

  const { detectorSensitivity } = useSettings();
  const minBboxArea = SENSITIVITY_MAP[detectorSensitivity];

  const cameraRef      = useRef<CameraView>(null);
  const modelRef       = useRef<any | null>(null);
  const soundRef       = useRef<Audio.Sound | null>(null);
  const busyRef        = useRef(false);
  const lastAlertRef   = useRef(0);
  const timerRef       = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const activeRef      = useRef(true);
  const cameraReadyRef = useRef(false);
  const branchBusyRef  = useRef(false);
  const branchTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const cameraBusyRef  = useRef(false);
  const router         = useRouter();

  // [2] Өмнөх фрэймийн bbox area хадгалах (approaching detection)
  const prevAreasRef = useRef<Map<number, number>>(new Map());

  // [6] Паркинг сенсор beep interval ref
  const beepIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // isDangerous with configurable sensitivity
  const isDangerous = useCallback((b: BBox): boolean => {
    const area = b.w * b.h;
    // [7] Гэрлэн дохио/зогсоох тэмдэг — area шалгахгүй, бүсэд байвал болно
    const areaOk = isTrafficSign(b.classId) ? area >= 0.01 : area >= minBboxArea;
    return (
      areaOk &&
      b.cx >= DANGER.xMin && b.cx <= DANGER.xMax &&
      b.cy >= DANGER.yMin && b.cy <= DANGER.yMax
    );
  }, [minBboxArea]);

  // YOLOv8n загвар ачаалах
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { loadTensorflowModel } = require('react-native-fast-tflite');
        const m = await loadTensorflowModel(
          require('../assets/models/yolov8n.tflite'),
          [],
        );
        if (alive) { modelRef.current = m; setModelReady(true); setModelError(null); }
        console.log('[ObstacleDetector] загвар бэлэн');
      } catch (err) {
        if (alive) {
          modelRef.current = null;
          setModelReady(false);
          setModelError('Саад мэдрэгчийн native model одоогоор бэлэн биш');
        }
        console.warn('[ObstacleDetector] загвар/Nitro ачаалж чадсангүй:', err);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Дуу ачаалах
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/beep.wav'),
          { volume: 1.0 },
        );
        if (alive) soundRef.current = sound;
      } catch {
        console.warn('[ObstacleDetector] beep.wav олдсонгүй — vibration л хийнэ');
      }
    })();
    return () => { alive = false; soundRef.current?.unloadAsync(); };
  }, []);

  // Апп background болоход зогсооно
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      activeRef.current = s === 'active';
    });
    return () => sub.remove();
  }, []);

  // [6] Паркинг сенсор beep — proximity level-д тулгуурлан давтамж өөрчлөх
  const startParkingBeep = useCallback((level: ProximityLevel) => {
    if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    const intervalMs = level === 'near' ? 300 : level === 'medium' ? 700 : 1200;
    beepIntervalRef.current = setInterval(() => {
      soundRef.current?.replayAsync();
    }, intervalMs);
  }, []);

  const stopParkingBeep = useCallback(() => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = undefined;
    }
  }, []);

  // Cleanup beep on unmount
  useEffect(() => {
    return () => stopParkingBeep();
  }, [stopParkingBeep]);

  const triggerAlert = useCallback(async (dangers: BBox[]) => {
    const now = Date.now();

    // [5] Тээврийн хэрэгсэл байвал cooldown богиносно
    const hasVehicle = dangers.some(b => isVehicle(b.classId));
    const cooldown = hasVehicle ? VEHICLE_COOLDOWN_MS : ALERT_COOLDOWN_MS;
    if (now - lastAlertRef.current < cooldown) return;
    lastAlertRef.current = now;

    const closest = dangers.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
    const area = closest.w * closest.h;
    const proximity = getProximity(area);

    // [2] Ойртож буй объект мэдрэх
    const approachingIds = new Set<number>();
    for (const b of dangers) {
      const currentArea = b.w * b.h;
      const prevArea = prevAreasRef.current.get(b.classId);
      if (prevArea && currentArea > prevArea * 1.3) {
        approachingIds.add(b.classId);
      }
      prevAreasRef.current.set(b.classId, currentArea);
    }

    if (approachingIds.size > 0) {
      setApproachingText('Ойртож байна!');
      setTimeout(() => setApproachingText(''), 2000);
    }

    // Haptic
    vibrateByProximity(proximity.level);

    // [3] Олон объект нэгтгэж хэлэх
    speakDangers(dangers, approachingIds);

    // [6] Паркинг сенсор beep
    startParkingBeep(proximity.level);

    // Beep нэг удаа
    await soundRef.current?.replayAsync();
  }, [startParkingBeep]);

  // Мөчир таних (Roboflow API)
  const detectBranches = useCallback(async () => {
    if (branchBusyRef.current || cameraBusyRef.current || !activeRef.current || !cameraReadyRef.current) return;
    if (!cameraRef.current || !ROBOFLOW_API_KEY) return;

    branchBusyRef.current = true;
    cameraBusyRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.4, base64: true, shutterSound: false });
      cameraBusyRef.current = false;
      if (!photo?.base64) return;

      const response = await fetch(
        `https://serverless.roboflow.com/${BRANCH_MODEL_ID}?api_key=${ROBOFLOW_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: photo.base64,
        },
      );
      const data = await response.json();
      const branches = data.predictions ?? [];
      setBranchCount(branches.length);

      if (branches.length > 0) {
        console.log(`[ObstacleDetector] ${branches.length} мөчир илэрлээ`);
        Speech.stop();
        Speech.speak(`Мөчир ${branches.length} ширхэг, толгойгоо нугал`, { language: 'mn-MN', rate: 1.2 });
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      }
    } catch (err) {
      console.warn('[ObstacleDetector] branch detect алдаа:', err);
    } finally {
      branchBusyRef.current = false;
      cameraBusyRef.current = false;
    }
  }, []);

  const detect = useCallback(async () => {
    if (busyRef.current || cameraBusyRef.current || !activeRef.current || !cameraReadyRef.current) return;
    if (!cameraRef.current || !modelRef.current) return;

    busyRef.current = true;
    cameraBusyRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, shutterSound: false });
      cameraBusyRef.current = false;
      if (!photo) return;

      const tensor = await imageUriToTensor(photo.uri);

      // [1] Шөнийн горим — гэрэлтүүлэг шалгах
      const brightness = computeBrightness(tensor, MODEL_INPUT * MODEL_INPUT);
      setTorchOn(brightness < DARK_BRIGHTNESS_THRESHOLD);

      const inputBuf = tensor.buffer as unknown as ArrayBuffer;
      const outputs  = await modelRef.current.run([inputBuf]);

      const boxes = parseDetections(new Float32Array(outputs[0] as ArrayBuffer));
      const dangers = boxes.filter(isDangerous);

      setDangerBoxes(dangers);

      if (dangers.length > 0) {
        const closest = dangers.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
        console.log(`[ObstacleDetector] ${dangers.length} саад, ${getCocoNameMn(closest.classId)}, score: ${closest.score.toFixed(2)}`);
        await triggerAlert(dangers);
      } else {
        // Саад алга болсон — beep зогсоох, prev areas цэвэрлэх
        stopParkingBeep();
        prevAreasRef.current.clear();
      }
    } catch (err) {
      console.error('[ObstacleDetector] detect алдаа:', err);
    } finally {
      busyRef.current = false;
      cameraBusyRef.current = false;
    }
  }, [triggerAlert, isDangerous, stopParkingBeep]);

  useEffect(() => {
    if (!permission?.granted) return;
    timerRef.current = setInterval(detect, DETECT_INTERVAL_MS);
    branchTimerRef.current = setInterval(detectBranches, BRANCH_CHECK_INTERVAL);
    return () => {
      clearInterval(timerRef.current);
      clearInterval(branchTimerRef.current);
    };
  }, [permission?.granted, detect, detectBranches]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!permission) return <View style={s.root} />;

  if (!permission.granted) {
    return (
      <View style={s.root}>
        <Text style={s.msg}>Камерын зөвшөөрөл шаардлагатай</Text>
        <TouchableOpacity onPress={requestPermission} style={s.btn}>
          <Text style={s.btnText}>Зөвшөөрөх</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDanger = dangerBoxes.length > 0;

  return (
    <View style={s.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        onCameraReady={() => { cameraReadyRef.current = true; }}
      />

      {/* Хяналтын бүс */}
      <View style={s.overlay} pointerEvents="none">
        <View style={[s.zone, isDanger && s.zoneDanger]} />
      </View>

      {/* [1] Шөнийн горим indicator */}
      {torchOn && (
        <View style={s.torchBadge}>
          <Text style={s.torchText}>Шөнийн горим</Text>
        </View>
      )}

      {/* [2] Ойртож буй анхааруулга */}
      {approachingText !== '' && (
        <View style={s.approachBanner}>
          <Text style={s.approachText}>{approachingText}</Text>
        </View>
      )}

      {/* Илэрсэн саадуудын мэдээлэл */}
      {isDanger && (() => {
        const closest = dangerBoxes.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
        const name = getCocoNameMn(closest.classId);
        const direction = getDirection(closest.cx);
        const proximity = getProximity(closest.w * closest.h);
        const vehicleTag = isVehicle(closest.classId) ? ' [ТЭЭВЭР]' : '';
        const trafficTag = isTrafficSign(closest.classId) ? ' [ТЭМДЭГ]' : '';
        return (
          <View style={[
            s.banner,
            proximity.level === 'near' && s.bannerNear,
            isVehicle(closest.classId) && s.bannerVehicle,
          ]}>
            <Text style={s.bannerText}>{name}{vehicleTag}{trafficTag} — {proximity.text}</Text>
            <Text style={s.bannerSub}>
              {direction} · {dangerBoxes.length} объект
            </Text>
          </View>
        );
      })()}

      {/* Мөчир илэрсэн */}
      {branchCount > 0 && (
        <View style={s.branchBanner}>
          <Text style={s.bannerText}>МӨЧИР ИЛЭРЛЭЭ</Text>
          <Text style={s.bannerSub}>{branchCount} мөчир — толгойгоо нугал</Text>
        </View>
      )}

      {!modelReady && (
        <View style={s.loadingBadge}>
          <Text style={s.loadingText}>{modelError ?? 'Загвар ачаалж байна...'}</Text>
        </View>
      )}

      <TouchableOpacity style={s.backBtn} onPress={() => { stopParkingBeep(); router.back(); }}>
        <Text style={s.backBtnText}>Буцах</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  msg:     { color: '#fff', fontSize: 18, textAlign: 'center', marginHorizontal: 24, marginTop: 80 },
  btn:     { marginTop: 16, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#4A90E2', borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 16 },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  zone: {
    width: '50%', height: '67%', marginTop: '5%',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 10,
  },
  zoneDanger: {
    borderColor: '#FF3B30', borderWidth: 3,
    backgroundColor: 'rgba(255,59,48,0.12)',
  },

  banner: {
    position: 'absolute', bottom: 80, alignSelf: 'center',
    backgroundColor: 'rgba(255,59,48,0.92)',
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center',
  },
  bannerNear: {
    backgroundColor: 'rgba(255,0,0,0.95)',
  },
  bannerVehicle: {
    backgroundColor: 'rgba(255,140,0,0.95)',
    borderWidth: 2,
    borderColor: '#fff',
  },
  bannerText: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 1.5 },
  bannerSub:  { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },

  branchBanner: {
    position: 'absolute', bottom: 160, alignSelf: 'center',
    backgroundColor: 'rgba(34,139,34,0.92)',
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center',
  },

  torchBadge: {
    position: 'absolute', top: 20, right: 20,
    backgroundColor: 'rgba(255,200,0,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  torchText: { color: '#000', fontSize: 12, fontWeight: '700' },

  approachBanner: {
    position: 'absolute', top: 100, alignSelf: 'center',
    backgroundColor: 'rgba(255,0,0,0.9)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  approachText: { color: '#fff', fontSize: 20, fontWeight: '800' },

  loadingBadge: {
    position: 'absolute', top: 20, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  loadingText: { color: '#fff', fontSize: 13 },

  backBtn: {
    position: 'absolute', top: 50, left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
