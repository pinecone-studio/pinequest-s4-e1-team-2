import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Vibration } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BackButton } from '@/components/ui-generated/_comps';
import * as Location from 'expo-location';
import { speech } from '@/src/voice';
import { getStopsByRoute, type StopOnRoute } from '@/services/busApi';

const STOP_RADIUS_M = 150; // буудалд ойртсон гэж тооцох зай (метр)

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function BusJourneyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ routeId: string; routeName: string; destStopId: string }>();
  const [stops, setStops] = useState<(StopOnRoute & { lat: number; lon: number })[]>([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [destIdx, setDestIdx] = useState(-1);
  const [arrived, setArrived] = useState(false);
  const passedRef = useRef(new Set<number>());
  const listRef = useRef<FlatList>(null);

  // Буудлууд ачаалах
  useEffect(() => {
    if (!params.routeId) return;
    getStopsByRoute(params.routeId).then(data => {
      const list = (data.reverseRotStopList ?? []).map(s => ({
        ...s,
        lat: parseFloat(s.gpxY ?? '0'),
        lon: parseFloat(s.gpxX ?? '0'),
      }));
      setStops(list);
      const di = list.findIndex(s => s.busStopId === params.destStopId);
      setDestIdx(di >= 0 ? di : list.length - 1);
      speech.speak(`${params.routeName} чиглэлд суулаа. ${list.length} буудал. Замдаа сайхан яваарай`);
    }).catch(() => {
      speech.speak('Буудлын мэдээлэл ачаалж чадсангүй');
    });
  }, [params.routeId]);

  // GPS tracking
  useEffect(() => {
    if (stops.length === 0) return;
    let sub: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        speech.speak('Байршлын зөвшөөрөл шаардлагатай');
        return;
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 20, timeInterval: 3000 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          // Хамгийн ойр буудлыг олох
          let minDist = Infinity;
          let minIdx = -1;
          stops.forEach((s, i) => {
            const d = haversineM(latitude, longitude, s.lat, s.lon);
            if (d < minDist) { minDist = d; minIdx = i; }
          });

          if (minDist < STOP_RADIUS_M && minIdx >= 0 && !passedRef.current.has(minIdx)) {
            passedRef.current.add(minIdx);
            setCurrentIdx(minIdx);

            const remaining = destIdx - minIdx;
            const stopName = stops[minIdx].busStopName;

            if (minIdx === destIdx) {
              setArrived(true);
              Vibration.vibrate([0, 500, 200, 500, 200, 500]);
              speech.speak(`${stopName}! Буугаарай! Энэ таны буудал!`);
              // Repeat alert after delays
              setTimeout(() => {
                Vibration.vibrate([0, 500, 200, 500]);
                speech.speak(`Буугаарай! ${stopName}!`);
              }, 3000);
              setTimeout(() => {
                Vibration.vibrate([0, 500, 200, 500]);
                speech.speak(`Буудалдаа ирлээ! Буугаарай!`);
              }, 7000);
            } else if (remaining === 1) {
              Vibration.vibrate([0, 300, 100, 300, 100, 300]);
              speech.speak(`${stopName}. Дараагийн буудалд буугаарай! Бэлдээрэй!`);
              setTimeout(() => {
                Vibration.vibrate([0, 300, 100, 300]);
                speech.speak(`Нэг буудал үлдлээ! Бэлдээрэй!`);
              }, 4000);
            } else if (remaining === 2) {
              Vibration.vibrate([0, 200, 100, 200]);
              speech.speak(`${stopName}. 2 буудал үлдлээ`);
            } else if (remaining > 2) {
              Vibration.vibrate(150);
              speech.speak(`${stopName}. ${remaining} буудал үлдлээ`);
            } else {
              Vibration.vibrate(100);
              speech.speak(`${stopName}`);
            }

            // Scroll to current
            listRef.current?.scrollToIndex({ index: minIdx, animated: true });
          }
        },
      );
    })();

    return () => { sub?.remove(); };
  }, [stops, destIdx]);

  return (
    <View style={s.root}>
      <BackButton onBack={() => router.back()} style={s.backBtn} />

      <Text style={s.title}>{params.routeName ?? 'Чиглэл'}</Text>
      <Text style={s.subtitle}>
        {arrived ? 'Буудалдаа ирлээ!' : currentIdx >= 0 ? `${destIdx - currentIdx} буудал үлдлээ` : 'GPS хянаж байна...'}
      </Text>

      {arrived && (
        <View style={s.arrivedBanner}>
          <Text style={s.arrivedText}>БУУГААРАЙ!</Text>
        </View>
      )}

      {/* Repeat info button */}
      {!arrived && currentIdx >= 0 && (
        <TouchableOpacity
          style={s.repeatBtn}
          onPress={() => {
            const remaining = destIdx - currentIdx;
            const current = stops[currentIdx]?.busStopName ?? '';
            const dest = stops[destIdx]?.busStopName ?? '';
            speech.speak(`Одоо ${current}. ${remaining} буудал үлдлээ. Очих буудал ${dest}`);
          }}
        >
          <Text style={s.repeatText}>Хаана байна?</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={listRef}
        data={stops}
        keyExtractor={item => item.busStopId}
        style={s.list}
        renderItem={({ item, index }) => {
          const isPassed = passedRef.current.has(index);
          const isCurrent = index === currentIdx;
          const isDest = index === destIdx;
          return (
            <View style={[
              s.stopRow,
              isCurrent && s.currentStop,
              isDest && s.destStop,
              isPassed && !isCurrent && s.passedStop,
            ]}>
              <View style={[s.dot, isCurrent ? s.dotCurrent : isDest ? s.dotDest : isPassed ? s.dotPassed : s.dotNormal]} />
              <View style={s.stopInfo}>
                <Text style={[s.stopName, isPassed && s.passedText]}>
                  {item.busStopName}
                </Text>
                {isDest && <Text style={s.destLabel}>Буух буудал</Text>}
                {isCurrent && <Text style={s.currentLabel}>Одоо энд</Text>}
              </View>
              <Text style={s.seq}>#{item.busStopSeq}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', paddingTop: 60, paddingHorizontal: 16 },
  backBtn: {
    position: 'absolute', top: 50, left: 20, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 30 },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textAlign: 'center', marginTop: 6, marginBottom: 16 },
  arrivedBanner: {
    backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginBottom: 12,
  },
  arrivedText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  repeatBtn: {
    backgroundColor: 'rgba(30,136,229,0.3)', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#1E88E5',
  },
  repeatText: { color: '#1E88E5', fontSize: 18, fontWeight: 'bold' },
  list: { flex: 1 },
  stopRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 10, marginBottom: 4,
  },
  currentStop: { backgroundColor: 'rgba(30,136,229,0.3)', borderWidth: 1, borderColor: '#1E88E5' },
  destStop: { backgroundColor: 'rgba(76,175,80,0.2)', borderWidth: 1, borderColor: '#4CAF50' },
  passedStop: { opacity: 0.5 },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  dotNormal: { backgroundColor: 'rgba(255,255,255,0.3)' },
  dotCurrent: { backgroundColor: '#1E88E5' },
  dotDest: { backgroundColor: '#4CAF50' },
  dotPassed: { backgroundColor: 'rgba(255,255,255,0.2)' },
  stopInfo: { flex: 1 },
  stopName: { color: '#fff', fontSize: 16 },
  passedText: { color: 'rgba(255,255,255,0.5)' },
  destLabel: { color: '#4CAF50', fontSize: 12, fontWeight: '600', marginTop: 2 },
  currentLabel: { color: '#1E88E5', fontSize: 12, fontWeight: '600', marginTop: 2 },
  seq: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
});
