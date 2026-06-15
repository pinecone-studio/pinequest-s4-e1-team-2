import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BackButton } from '@/components/ui-generated/_comps';
import { CameraView, useCameraPermissions } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { speech } from '@/src/voice';

const SCAN_INTERVAL = 1500;

// Автобусны дугаар pattern: "Ч:32", "М:1Б", "Ү:23", "Д:2", "ШҮ:1" гэх мэт
const BUS_NUMBER_REGEX = /[ЧМҮДШШҮ]{1,2}[:\s]?\d{1,3}[А-ЯA-ZА-Я]?/i;

export default function BusScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ targetBus: string }>();
  const targetBus = params.targetBus ?? '';

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const [detectedBus, setDetectedBus] = useState<string | null>(null);
  const [isTarget, setIsTarget] = useState(false);
  const [scanning, setScanning] = useState(true);
  const lastAnnouncedRef = useRef('');

  useEffect(() => {
    setTimeout(() => {
      if (targetBus) {
        speech.speak(`${targetBus} автобусыг хайж байна. Камерыг автобус руу чиглүүлнэ үү`);
      } else {
        speech.speak('Автобусны дугаар таних. Камерыг автобус руу чиглүүлнэ үү');
      }
    }, 500);
  }, [targetBus]);

  const scan = useCallback(async () => {
    if (busyRef.current || !cameraRef.current) return;
    busyRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, shutterSound: false });
      if (!photo?.uri) return;

      const result = await TextRecognition.recognize(photo.uri);
      const allText = result.blocks.map(b => b.text).join(' ');

      // Автобусны дугаар хайх
      const match = allText.match(BUS_NUMBER_REGEX);
      if (match) {
        const busNo = match[0].replace(/\s/g, '');
        setDetectedBus(busNo);

        // Normalize for comparison: remove spaces, colons
        const normalize = (s: string) => s.replace(/[\s:]/g, '').toUpperCase();
        const isMatch = targetBus && normalize(busNo).includes(normalize(targetBus));
        setIsTarget(!!isMatch);

        if (busNo !== lastAnnouncedRef.current) {
          lastAnnouncedRef.current = busNo;
          if (isMatch) {
            Vibration.vibrate([0, 500, 200, 500, 200, 500]);
            speech.stop();
            speech.speak(`${busNo} ирлээ! Энэ таны автобус! Суугаарай!`);
            // 2 удаа хэлэх
            setTimeout(() => speech.speak(`${busNo} суугаарай!`), 2500);
          } else {
            Vibration.vibrate(100);
            speech.stop();
            speech.speak(`${busNo} автобус${targetBus ? '. Таных биш' : ''}`);
          }
        }
      }
    } catch { /* ignore */ }
    finally { busyRef.current = false; }
  }, [targetBus]);

  // Scan interval
  useEffect(() => {
    if (!permission?.granted || !scanning) return;
    const id = setInterval(scan, SCAN_INTERVAL);
    return () => clearInterval(id);
  }, [permission?.granted, scanning, scan]);

  if (!permission?.granted) {
    return (
      <View style={s.center}>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permText}>КАМЕР ЗӨВШӨӨРӨХ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <CameraView ref={cameraRef} style={s.camera} autofocus="on" />

      <BackButton onBack={() => router.back()} style={s.backBtn} />

      {/* Target info */}
      {targetBus ? (
        <View style={s.targetBadge}>
          <Text style={s.targetLabel}>Хайж буй:</Text>
          <Text style={s.targetNo}>{targetBus}</Text>
        </View>
      ) : null}

      {/* Detection result */}
      {detectedBus && (
        <View style={[s.resultCard, isTarget ? s.matchCard : s.noMatchCard]}>
          <Text style={s.resultNo}>{detectedBus}</Text>
          <Text style={s.resultLabel}>
            {isTarget ? 'ТАНЫ АВТОБУС! СУУГААРАЙ!' : targetBus ? 'Таных биш' : 'Автобус илэрлээ'}
          </Text>
        </View>
      )}

      {!detectedBus && (
        <View style={s.scanBadge}>
          <Text style={s.scanText}>Автобусны дугаар хайж байна...</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  backBtn: {
    position: 'absolute', top: 50, left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  targetBadge: {
    position: 'absolute', top: 50, right: 20,
    backgroundColor: 'rgba(30,136,229,0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  targetLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  targetNo: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resultCard: {
    position: 'absolute', bottom: 100, left: 20, right: 20,
    padding: 20, borderRadius: 16, alignItems: 'center',
  },
  matchCard: { backgroundColor: 'rgba(76,175,80,0.95)', borderWidth: 2, borderColor: '#fff' },
  noMatchCard: { backgroundColor: 'rgba(0,0,0,0.85)' },
  resultNo: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  resultLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 6, fontWeight: '600' },
  scanBadge: {
    position: 'absolute', bottom: 120, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  scanText: { color: '#fff', fontSize: 14 },
  permBtn: {
    backgroundColor: '#1a1a1a', padding: 32, borderRadius: 16,
  },
  permText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
