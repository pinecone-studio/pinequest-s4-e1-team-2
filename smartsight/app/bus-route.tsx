import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { speech } from '@/src/voice';
import {
  searchStations, planRoute, planRouteBetweenStops,
  type BusStop, type Itinerary,
} from '@/services/busApi';
import {
  getSavedRoutes, saveRoute, deleteSavedRoute,
  type SavedRoute,
} from '@/services/busStorage';

// Түгээмэл буудлуудын жагсаалт (бичихгүйгээр сонгох)
const POPULAR_STOPS: BusStop[] = [
  { busStopId: '10553', busStopName: 'Драма театр', gpxX: '106.9186', gpxY: '47.9187' },
  { busStopId: '10070', busStopName: 'Их дэлгүүр', gpxX: '106.9133', gpxY: '47.9147' },
  { busStopId: '10170', busStopName: 'Нарантуул', gpxX: '106.9534', gpxY: '47.9032' },
  { busStopId: '10210', busStopName: 'Хурд', gpxX: '106.8853', gpxY: '47.9218' },
  { busStopId: '10055', busStopName: 'Баруун 4 зам', gpxX: '106.8724', gpxY: '47.9200' },
  { busStopId: '10300', busStopName: 'Зүүн 4 зам', gpxX: '106.9375', gpxY: '47.9145' },
  { busStopId: '10400', busStopName: 'Санзай', gpxX: '106.9048', gpxY: '47.9286' },
  { busStopId: '10500', busStopName: '13-р хороолол', gpxX: '106.8488', gpxY: '47.9169' },
];

type Field = 'from' | 'to';
const DOUBLE_TAP_MS = 400;

function formatDuration(secs: number) {
  const m = Math.round(secs / 60);
  return m < 60 ? `${m} мин` : `${Math.floor(m / 60)} цаг ${m % 60} мин`;
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} км` : `${Math.round(meters)} м`;
}

export default function BusRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prefillTo?: string }>();

  // GPS location
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLon, setMyLon] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [useGps, setUseGps] = useState(true);

  // Manual input
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [suggestions, setSuggestions] = useState<BusStop[]>([]);
  const [activeField, setActiveField] = useState<Field | null>(null);
  const [fromStop, setFromStop] = useState<BusStop | null>(null);
  const [toStop, setToStop] = useState<BusStop | null>(null);

  // Results
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Saved routes
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);

  // Double tap for popular stops
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // GPS авах
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setMyLat(loc.coords.latitude);
          setMyLon(loc.coords.longitude);
          speech.speak('Байршил тогтоогдлоо. Очих буудлаа сонгоно уу');
        } else {
          speech.speak('Байршлын зөвшөөрөл өгнө үү. Эсвэл буудлаа гараар сонгоно уу');
          setUseGps(false);
        }
      } catch {
        speech.speak('Байршил тодорхойлж чадсангүй');
        setUseGps(false);
      } finally {
        setGpsLoading(false);
      }
    })();
  }, []);

  // Saved routes ачаалах
  useEffect(() => {
    getSavedRoutes().then(setSavedRoutes);
  }, []);

  useEffect(() => {
    if (params.prefillTo) {
      setToText(params.prefillTo);
      handleSearch(params.prefillTo, 'to');
    }
  }, [params.prefillTo]);

  const handleSearch = useCallback(async (text: string, field: Field) => {
    if (field === 'from') setFromText(text);
    else setToText(text);
    setActiveField(field);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const stops = await searchStations(text);
        setSuggestions(stops ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 400);
  }, []);

  const selectStop = useCallback((stop: BusStop, field: Field) => {
    if (field === 'from') {
      setFromStop(stop);
      setFromText(stop.busStopName);
      setUseGps(false);
    } else {
      setToStop(stop);
      setToText(stop.busStopName);
    }
    setSuggestions([]);
    setActiveField(null);
    Keyboard.dismiss();
  }, []);

  // Түгээмэл буудал дарах (double tap)
  const handlePopularTap = useCallback((stop: BusStop) => {
    const now = Date.now();
    const last = lastTapRef.current;

    if (last?.id === stop.busStopId && now - last.time <= DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setToStop(stop);
      setToText(stop.busStopName);
      speech.speak(`${stop.busStopName} сонгогдлоо`);
    } else {
      lastTapRef.current = { id: stop.busStopId, time: now };
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      speech.speak(stop.busStopName);
    }
  }, []);

  // Маршрут хайх
  const doSearch = useCallback(async () => {
    const hasFrom = useGps ? (myLat != null && myLon != null) : fromStop != null;
    if (!hasFrom || !toStop) {
      speech.speak('Очих буудлаа сонгоно уу');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setSearched(true);
    try {
      let results: Itinerary[];
      if (useGps && myLat != null && myLon != null) {
        results = await planRoute(myLat, myLon, parseFloat(toStop.gpxY), parseFloat(toStop.gpxX));
      } else {
        results = await planRouteBetweenStops(fromStop!, toStop);
      }
      const busResults = results.filter(it => it.legs.some((l: any) => l.mode === 'BUS'));
      const walkOnly = results.filter(it => !it.legs.some((l: any) => l.mode === 'BUS'));
      const sorted = [...busResults, ...walkOnly];
      setItineraries(sorted);

      if (busResults.length > 0) {
        const firstBus = busResults[0].legs.find((l: any) => l.mode === 'BUS');
        const name = firstBus?.routeShortName ?? 'автобус';
        speech.speak(`${busResults.length} маршрут олдлоо. ${name} автобусанд суугаарай`);
      } else if (walkOnly.length > 0) {
        speech.speak('Автобусгүй, явганаар хүрнэ');
      } else {
        speech.speak('Маршрут олдсонгүй');
      }
    } catch {
      speech.speak('Алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [useGps, myLat, myLon, fromStop, toStop]);

  // Хадгалах
  const handleSaveRoute = useCallback(async () => {
    if (!toStop) return;
    const fromName = useGps ? 'Миний байршил' : (fromStop?.busStopName ?? '');
    const id = `${useGps ? 'gps' : fromStop?.busStopId}_${toStop.busStopId}`;
    const name = `${fromName} → ${toStop.busStopName}`;
    const from = fromStop ?? { busStopId: 'gps', busStopName: 'Миний байршил', gpxX: String(myLon ?? 0), gpxY: String(myLat ?? 0) };
    await saveRoute({ id, name, from, to: toStop, createdAt: Date.now() });
    const updated = await getSavedRoutes();
    setSavedRoutes(updated);
    speech.speak('Маршрут хадгалагдлаа');
  }, [useGps, fromStop, toStop, myLat, myLon]);

  // Хадгалсан маршрут ашиглах (double tap)
  const handleSavedTap = useCallback((saved: SavedRoute) => {
    const now = Date.now();
    const last = lastTapRef.current;

    if (last?.id === saved.id && now - last.time <= DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (saved.from.busStopId === 'gps') {
        setUseGps(true);
      } else {
        setFromStop(saved.from);
        setFromText(saved.from.busStopName);
        setUseGps(false);
      }
      setToStop(saved.to);
      setToText(saved.to.busStopName);
      speech.speak(`${saved.name} сонгогдлоо`);
    } else {
      lastTapRef.current = { id: saved.id, time: now };
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      speech.speak(saved.name);
    }
  }, []);

  const hasFrom = useGps ? (myLat != null) : fromStop != null;
  const canSearch = hasFrom && toStop != null;

  return (
    <View style={s.root}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>Буцах</Text>
      </TouchableOpacity>

      <Text style={s.title}>Автобус чиглэл</Text>

      {!searched && (
        <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Хаанаас */}
          <View style={[s.fromBox, useGps && myLat ? s.fromBoxGps : null]}>
            <Text style={s.fromLabel}>
              {gpsLoading ? 'Байршил хайж байна...' : useGps && myLat ? 'Миний байршлаас' : 'Буудал сонгоно уу'}
            </Text>
            {!useGps && (
              <TextInput
                style={s.input}
                placeholder="Буудлын нэр..."
                placeholderTextColor="#888"
                value={fromText}
                onChangeText={(t) => { setFromStop(null); handleSearch(t, 'from'); }}
                onFocus={() => setActiveField('from')}
              />
            )}
            {useGps && myLat && (
              <TouchableOpacity onPress={() => { setUseGps(false); speech.speak('Буудлаа бичнэ үү'); }}>
                <Text style={s.switchText}>Буудал гараар сонгох</Text>
              </TouchableOpacity>
            )}
            {!useGps && (
              <TouchableOpacity onPress={() => {
                if (myLat) { setUseGps(true); speech.speak('Миний байршлаас'); }
                else speech.speak('Байршил тодорхойлогдоогүй');
              }}>
                <Text style={s.switchText}>Миний байршлаас</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Хааш */}
          <Text style={s.sectionLabel}>Хааш явах вэ?</Text>

          {/* Очих буудал сонгогдсон */}
          {toStop && (
            <View style={s.selectedTo}>
              <Text style={s.selectedToText}>{toStop.busStopName}</Text>
              <TouchableOpacity onPress={() => { setToStop(null); setToText(''); speech.speak('Очих буудал цуцлагдлаа'); }}>
                <Text style={s.clearText}>Солих</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TextInput + suggestions (хагас харагддаг хүнд) */}
          {!toStop && (
            <>
              <TextInput
                style={s.input}
                placeholder="Буудлын нэр бичих..."
                placeholderTextColor="#888"
                value={toText}
                onChangeText={(t) => { setToStop(null); handleSearch(t, 'to'); }}
                onFocus={() => setActiveField('to')}
              />
              {suggestions.length > 0 && activeField && (
                <View style={s.suggestBox}>
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item) => item.busStopId}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity style={s.suggestItem} onPress={() => selectStop(item, activeField)}>
                        <Text style={s.suggestText}>{item.busStopName}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </>
          )}

          {/* Хадгалсан маршрутууд */}
          {savedRoutes.length > 0 && !toStop && (
            <>
              <Text style={s.sectionLabel}>Хадгалсан</Text>
              {savedRoutes.map(sr => (
                <TouchableOpacity key={sr.id} style={s.quickBtn} onPress={() => handleSavedTap(sr)}>
                  <Text style={s.quickText}>{sr.name}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Түгээмэл буудлууд */}
          {!toStop && (
            <>
              <Text style={s.sectionLabel}>Түгээмэл буудал</Text>
              <View style={s.popularGrid}>
                {POPULAR_STOPS.map(stop => (
                  <TouchableOpacity key={stop.busStopId} style={s.popularBtn} onPress={() => handlePopularTap(stop)}>
                    <Text style={s.popularText}>{stop.busStopName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ХАЙХ товч */}
          <TouchableOpacity
            style={[s.searchBtn, !canSearch && s.searchBtnDisabled]}
            onPress={doSearch}
            disabled={loading || !canSearch}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.searchBtnText}>ЧИГЛЭЛ ХАЙХ</Text>
            )}
          </TouchableOpacity>

          {canSearch && (
            <TouchableOpacity style={s.saveBtn} onPress={handleSaveRoute}>
              <Text style={s.saveBtnText}>ХАДГАЛАХ</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Results */}
      {searched && !loading && (
        <ScrollView style={s.resultList}>
          <TouchableOpacity style={s.backToSearch} onPress={() => { setSearched(false); speech.speak('Дахин хайх'); }}>
            <Text style={s.backToSearchText}>Дахин хайх</Text>
          </TouchableOpacity>
          {itineraries.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>Маршрут олдсонгүй</Text>
              <Text style={s.emptyHint}>Өөр буудал сонгож үзнэ үү</Text>
            </View>
          ) : (
            itineraries.map((it, idx) => {
              const busLegs = it.legs.filter((l: any) => l.mode === 'BUS');
              const hasBus = busLegs.length > 0;
              return (
                <View key={idx} style={[s.resultCard, hasBus ? s.busCard : s.walkCard]}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardDuration}>{formatDuration(it.duration)}</Text>
                    {it.transfers > 0 && (
                      <Text style={s.transferBadge}>{it.transfers} дамжлага</Text>
                    )}
                  </View>
                  {it.legs.map((leg: any, li: number) => (
                    <View key={li} style={s.legRow}>
                      <View style={[s.legDot, leg.mode === 'BUS' ? s.busDot : s.walkDot]} />
                      <View style={s.legInfo}>
                        {leg.mode === 'BUS' ? (
                          <>
                            <Text style={s.busName}>{leg.routeShortName}</Text>
                            <Text style={s.legDetail}>{leg.from.name} → {leg.to.name}</Text>
                          </>
                        ) : (
                          <Text style={s.walkText}>
                            Явган {formatDistance(leg.distance)} ({formatDuration(leg.duration)})
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {hasBus && (
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => {
                          const firstBus = busLegs[0];
                          const routeId = firstBus.routeId?.replace('1:', '') ?? '';
                          const destStopId = it.legs[it.legs.length - 1].to?.stopId?.replace('1:', '') ?? '';
                          router.push({ pathname: '/bus-journey', params: { routeId, routeName: firstBus.routeShortName, destStopId } } as any);
                        }}
                      >
                        <Text style={s.actionText}>Суулаа</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, s.scanBtn]}
                        onPress={() => {
                          router.push({ pathname: '/bus-scan', params: { targetBus: busLegs[0].routeShortName ?? '' } } as any);
                        }}
                      >
                        <Text style={s.actionText}>Камераар хайх</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', paddingTop: 60, paddingHorizontal: 20 },
  backBtn: {
    position: 'absolute', top: 50, left: 20, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 30, marginBottom: 16 },
  scroll: { flex: 1 },

  // From section
  fromBox: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  fromBoxGps: { borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.1)' },
  fromLabel: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  switchText: { color: '#1E88E5', fontSize: 14, marginTop: 8 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 18,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },

  sectionLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 10 },

  selectedTo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.15)', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#4CAF50',
  },
  selectedToText: { color: '#4CAF50', fontSize: 20, fontWeight: 'bold' },
  clearText: { color: '#FF9800', fontSize: 14, fontWeight: '600' },

  suggestBox: {
    backgroundColor: 'rgba(30,30,30,0.98)', borderRadius: 12, maxHeight: 200,
    marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  suggestItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  suggestText: { color: '#fff', fontSize: 16 },

  // Quick buttons
  quickBtn: {
    backgroundColor: 'rgba(76,175,80,0.15)', paddingVertical: 16, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)',
  },
  quickText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Popular stops
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  popularBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    width: '48%',
  },
  popularText: { color: '#fff', fontSize: 16, textAlign: 'center' },

  searchBtn: {
    backgroundColor: '#1E88E5', paddingVertical: 18, borderRadius: 14,
    alignItems: 'center', marginTop: 24,
  },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  saveBtn: {
    backgroundColor: 'rgba(76,175,80,0.2)', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 10, marginBottom: 30,
    borderWidth: 1, borderColor: 'rgba(76,175,80,0.4)',
  },
  saveBtnText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },

  // Results
  resultList: { flex: 1, marginTop: 8 },
  backToSearch: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', marginBottom: 12,
  },
  backToSearchText: { color: '#1E88E5', fontSize: 16, fontWeight: '600' },
  resultCard: { borderRadius: 12, padding: 16, marginBottom: 10 },
  busCard: { backgroundColor: 'rgba(30,136,229,0.2)', borderWidth: 1, borderColor: 'rgba(30,136,229,0.5)' },
  walkCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardDuration: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  transferBadge: { color: '#FF9800', fontSize: 13, fontWeight: '600' },
  legRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  legDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 10 },
  busDot: { backgroundColor: '#4CAF50' },
  walkDot: { backgroundColor: '#9E9E9E' },
  legInfo: { flex: 1 },
  busName: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold' },
  legDetail: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  walkText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  scanBtn: { backgroundColor: '#1E88E5' },
  actionText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: '#FF9800', fontSize: 18, fontWeight: '600' },
  emptyHint: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 },
});
