/**
 * ObstacleDetector.tsx — production (expo run:android / expo run:ios)
 *
 * Expo Go дэмждэггүй — react-native-fast-tflite native module шаарддаг.
 * Ажиллуулах: npx expo run:android
 *
 * Pipeline:
 *   CameraView → takePictureAsync → resize 640×640 → NHWC float32 tensor
 *   → YOLOv8n.tflite inference → NMS → danger zone + proximity filter
 *   → Vibration + beep alert
 *
 * Зай тааруулах:
 *   MIN_BBOX_AREA утгыг өөрчилнө (доорх тайлбарыг үзнэ үү)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';

// ── Model ─────────────────────────────────────────────────────────────────────

const MODEL_INPUT   = 640;   // YOLOv8n input: 640×640
const NUM_ANCHORS   = 8400;  // 80²+40²+20² grid points
const NUM_CLASSES   = 80;    // COCO
const CONF_THRESHOLD = 0.45;
const IOU_THRESHOLD  = 0.45;

// ── Зай тааруулах ─────────────────────────────────────────────────────────────
//
//  bbox талбай (w×h, 0–1) нь ойролцоо зайг илэрхийлнэ:
//
//    0.12  →  ~1.5м  (хүн)
//    0.06  →  ~2м
//    0.04  →  ~3м
//    0.02  →  ~5м
//
//  Жижиг объект (тэмдэг, тулга) ижил зайд бага талбай эзэлнэ.
//  Тиймээс утасны камераар алхаад энэ утгыг тохируулна.
//
const MIN_BBOX_AREA = 0.06; // ~2м хүртэлх саадыг анхааруулна

// ── Дунд бүс ─────────────────────────────────────────────────────────────────
//
//  Цээжинд барьсан утсан дээр камерт харагдах "blind zone" бүс:
//
//       0.25     0.75
//  0.18  ┌───────────┐
//        │  DANGER   │
//  0.85  └───────────┘
//
const DANGER = { xMin: 0.25, xMax: 0.75, yMin: 0.18, yMax: 0.85 } as const;

// ── Хугацаа ───────────────────────────────────────────────────────────────────

const DETECT_INTERVAL_MS = 500;
const ALERT_COOLDOWN_MS  = 1500;

// ── Roboflow мөчир таних ────────────────────────────────────────────────────
const ROBOFLOW_API_KEY = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;
const BRANCH_MODEL_ID = 'tree-branch-detection-jemc7/1';
const BRANCH_CHECK_INTERVAL = 3000; // 3 секунд тутам шалгана

// ── Төрлүүд ───────────────────────────────────────────────────────────────────

interface BBox {
  cx: number;
  cy: number;
  w:  number;
  h:  number;
  score:   number;
  classId: number;
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
  const { data }   = jpeg.decode(compressed, { useTArray: true }); // RGBA

  // RGBA interleaved → NHWC planar: [R,G,B, R,G,B, …]
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
//
//  Гаралтын хэлбэр: [1, 84, 8400]  (batch=1 орхино)
//  r=0  cx, r=1  cy, r=2  w, r=3  h  — normalized (0–1)
//  r=4..83  class probability
//
//  Индекс: output[r * NUM_ANCHORS + a]
//

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

// Дунд бүс + ойролцоо зайн шүүлт
function isDangerous(b: BBox): boolean {
  const area = b.w * b.h;
  return (
    area >= MIN_BBOX_AREA &&
    b.cx >= DANGER.xMin && b.cx <= DANGER.xMax &&
    b.cy >= DANGER.yMin && b.cy <= DANGER.yMax
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ObstacleDetector() {
  const [permission, requestPermission] = useCameraPermissions();
  const [dangerBoxes, setDangerBoxes]   = useState<BBox[]>([]);
  const [modelReady, setModelReady]     = useState(false);
  const [branchCount, setBranchCount]   = useState(0);

  const cameraRef      = useRef<CameraView>(null);
  const modelRef       = useRef<TensorflowModel | null>(null);
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

  // YOLOv8n загвар ачаалах
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await loadTensorflowModel(
          require('../assets/models/yolov8n.tflite'),
          [], // [] = CPU delegate (default). Android GPU: ['android-gpu'], iOS: ['metal']
        );
        if (alive) { modelRef.current = m; setModelReady(true); }
        console.log('[ObstacleDetector] загвар бэлэн');
      } catch (err) {
        console.error('[ObstacleDetector] загвар ачаалж чадсангүй:', err);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Дуу ачаалах (байхгүй бол vibration л хийнэ)
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
        console.warn('[ObstacleDetector] beep.mp3 олдсонгүй — vibration л хийнэ');
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

  const triggerAlert = useCallback(async () => {
    const now = Date.now();
    if (now - lastAlertRef.current < ALERT_COOLDOWN_MS) return;
    lastAlertRef.current = now;
    Vibration.cancel();
    Vibration.vibrate(600);
    await soundRef.current?.replayAsync();
  }, []);

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
        await triggerAlert();
      }
    } catch (err) {
      console.warn('[ObstacleDetector] branch detect алдаа:', err);
    } finally {
      branchBusyRef.current = false;
      cameraBusyRef.current = false;
    }
  }, [triggerAlert]);

  const detect = useCallback(async () => {
    if (busyRef.current || cameraBusyRef.current || !activeRef.current || !cameraReadyRef.current) return;
    if (!cameraRef.current || !modelRef.current) return;

    busyRef.current = true;
    cameraBusyRef.current = true;
    try {
      // 1. Frame авах
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, shutterSound: false });
      cameraBusyRef.current = false;
      if (!photo) return;

      // 2. 640×640 тензор болгох
      const tensor = await imageUriToTensor(photo.uri);

      // 3. YOLOv8n inference — input/output нь ArrayBuffer
      // tensor.buffer нь ArrayBufferLike тул ArrayBuffer болгон cast хийнэ
      const inputBuf = tensor.buffer as unknown as ArrayBuffer;
      const outputs  = await modelRef.current.run([inputBuf]);

      // 4. Bbox задлах — output ArrayBuffer-г Float32Array болгоно
      const boxes = parseDetections(new Float32Array(outputs[0] as ArrayBuffer));
      const dangers = boxes.filter(isDangerous);

      setDangerBoxes(dangers);

      if (dangers.length > 0) {
        console.log(`[ObstacleDetector] ${dangers.length} саад, score: ${dangers[0].score.toFixed(2)}`);
        await triggerAlert();
      }
    } catch (err) {
      console.error('[ObstacleDetector] detect алдаа:', err);
    } finally {
      busyRef.current = false;
      cameraBusyRef.current = false;
    }
  }, [triggerAlert]);

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
        onCameraReady={() => { cameraReadyRef.current = true; }}
      />

      {/* Хяналтын бүс */}
      <View style={s.overlay} pointerEvents="none">
        <View style={[s.zone, isDanger && s.zoneDanger]} />
      </View>

      {/* Илэрсэн саадуудын тоо */}
      {isDanger && (
        <View style={s.banner}>
          <Text style={s.bannerText}>⚠ СААД ИЛЭРЛЭЭ</Text>
          <Text style={s.bannerSub}>
            {dangerBoxes.length} объект · score {(dangerBoxes[0].score * 100).toFixed(0)}%
          </Text>
        </View>
      )}

      {/* Мөчир илэрсэн */}
      {branchCount > 0 && (
        <View style={s.branchBanner}>
          <Text style={s.bannerText}>🌿 МӨЧИР ИЛЭРЛЭЭ</Text>
          <Text style={s.bannerSub}>{branchCount} мөчир</Text>
        </View>
      )}

      {!modelReady && (
        <View style={s.loadingBadge}>
          <Text style={s.loadingText}>Загвар ачаалж байна…</Text>
        </View>
      )}

      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backBtnText}>← Буцах</Text>
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
  bannerText: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 1.5 },
  bannerSub:  { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },

  branchBanner: {
    position: 'absolute', bottom: 160, alignSelf: 'center',
    backgroundColor: 'rgba(34,139,34,0.92)',
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center',
  },

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
