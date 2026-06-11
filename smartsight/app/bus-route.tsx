import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Keyboard, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { speech } from '@/src/voice';
import {
  searchStations, planRouteBetweenStops,
  type BusStop, type Itinerary,
} from '@/services/busApi';
import {
  getSavedRoutes, saveRoute, deleteSavedRoute,
  type SavedRoute,
} from '@/services/busStorage';

type Field = 'from' | 'to';

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
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [suggestions, setSuggestions] = useState<BusStop[]>([]);
  const [activeField, setActiveField] = useState<Field | null>(null);
  const [fromStop, setFromStop] = useState<BusStop | null>(null);
  const [toStop, setToStop] = useState<BusStop | null>(null);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    getSavedRoutes().then(setSavedRoutes);
  }, []);

  useEffect(() => {
    if (params.prefillTo) {
      setToText(params.prefillTo);
      handleSearch(params.prefillTo, 'to');
    }
  }, [params.prefillTo]);

  useEffect(() => {
    setTimeout(() => {
      speech.speak('Хаанаас хааш явахаа оруулна уу');
    }, 500);
  }, []);

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
    } else {
      setToStop(stop);
      setToText(stop.busStopName);
    }
    setSuggestions([]);
    setActiveField(null);
    Keyboard.dismiss();
  }, []);

  const doSearch = useCallback(async () => {
    if (!fromStop || !toStop) {
      speech.speak('Эхлэх болон очих буудлаа сонгоно уу');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setSearched(true);
    setShowSaved(false);
    try {
      const results = await planRouteBetweenStops(fromStop, toStop);
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
  }, [fromStop, toStop]);

  const handleSaveRoute = useCallback(async () => {
    if (!fromStop || !toStop) return;
    const id = `${fromStop.busStopId}_${toStop.busStopId}`;
    const name = `${fromStop.busStopName} → ${toStop.busStopName}`;
    await saveRoute({ id, name, from: fromStop, to: toStop, createdAt: Date.now() });
    const updated = await getSavedRoutes();
    setSavedRoutes(updated);
    speech.speak('Маршрут хадгалагдлаа');
  }, [fromStop, toStop]);

  const handleLoadSaved = useCallback((saved: SavedRoute) => {
    setFromStop(saved.from);
    setToStop(saved.to);
    setFromText(saved.from.busStopName);
    setToText(saved.to.busStopName);
    setShowSaved(false);
    speech.speak(`${saved.name} сонгогдлоо`);
  }, []);

  const handleDeleteSaved = useCallback(async (id: string) => {
    await deleteSavedRoute(id);
    const updated = await getSavedRoutes();
    setSavedRoutes(updated);
    speech.speak('Устгагдлаа');
  }, []);

  return (
    <View style={s.root}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>Буцах</Text>
      </TouchableOpacity>

      <Text style={s.title}>Автобусны чиглэл хайх</Text>

      {/* Saved routes toggle */}
      {savedRoutes.length > 0 && !searched && (
        <TouchableOpacity
          style={s.savedToggle}
          onPress={() => {
            setShowSaved(!showSaved);
            if (!showSaved) speech.speak('Хадгалсан маршрутууд');
          }}
        >
          <Text style={s.savedToggleText}>
            {showSaved ? 'Хаах' : `Хадгалсан маршрут (${savedRoutes.length})`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Saved routes list */}
      {showSaved && (
        <View style={s.savedList}>
          {savedRoutes.map(sr => (
            <View key={sr.id} style={s.savedCard}>
              <TouchableOpacity style={s.savedInfo} onPress={() => handleLoadSaved(sr)}>
                <Text style={s.savedName}>{sr.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.savedDelete}
                onPress={() => handleDeleteSaved(sr.id)}
              >
                <Text style={s.savedDeleteText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!showSaved && (
        <>
          <Text style={s.label}>Хаанаас</Text>
          <TextInput
            style={[s.input, fromStop && s.inputSelected]}
            placeholder="Буудлын нэр бичнэ үү..."
            placeholderTextColor="#888"
            value={fromText}
            onChangeText={(t) => { setFromStop(null); handleSearch(t, 'from'); }}
            onFocus={() => setActiveField('from')}
          />

          <Text style={s.label}>Хааш</Text>
          <TextInput
            style={[s.input, toStop && s.inputSelected]}
            placeholder="Очих буудлын нэр..."
            placeholderTextColor="#888"
            value={toText}
            onChangeText={(t) => { setToStop(null); handleSearch(t, 'to'); }}
            onFocus={() => setActiveField('to')}
          />

          {/* Suggestions */}
          {suggestions.length > 0 && activeField && (
            <View style={s.suggestBox}>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.busStopId}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.suggestItem}
                    onPress={() => selectStop(item, activeField)}
                  >
                    <Text style={s.suggestText}>{item.busStopName}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.searchBtn, (!fromStop || !toStop) && s.searchBtnDisabled]}
              onPress={doSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.searchBtnText}>ХАЙХ</Text>
              )}
            </TouchableOpacity>
            {fromStop && toStop && (
              <TouchableOpacity style={s.saveBtn} onPress={handleSaveRoute}>
                <Text style={s.saveBtnText}>ХАДГАЛАХ</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Nearby stops shortcut */}
          <TouchableOpacity
            style={s.nearbyBtn}
            onPress={() => router.push('/nearby-stops' as any)}
          >
            <Text style={s.nearbyText}>Ойролцоох буудлууд</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Results */}
      {searched && !loading && (
        <ScrollView style={s.resultList}>
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
                            <Text style={s.legDetail}>
                              {leg.from.name} → {leg.to.name}
                            </Text>
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
                          router.push({
                            pathname: '/bus-journey',
                            params: { routeId, routeName: firstBus.routeShortName, destStopId },
                          } as any);
                        }}
                      >
                        <Text style={s.actionText}>Суулаа</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, s.scanBtn]}
                        onPress={() => {
                          router.push({
                            pathname: '/bus-scan',
                            params: { targetBus: busLegs[0].routeShortName ?? '' },
                          } as any);
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
  label: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 18,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  inputSelected: { borderColor: '#4CAF50', borderWidth: 2 },
  suggestBox: {
    backgroundColor: 'rgba(30,30,30,0.98)', borderRadius: 12, maxHeight: 200,
    marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  suggestItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  suggestText: { color: '#fff', fontSize: 16 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  searchBtn: {
    flex: 1, backgroundColor: '#1E88E5', paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  saveBtn: {
    backgroundColor: '#4CAF50', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  nearbyBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  nearbyText: { color: '#1E88E5', fontSize: 16, fontWeight: '600' },
  savedToggle: {
    backgroundColor: 'rgba(76,175,80,0.2)', paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(76,175,80,0.4)',
  },
  savedToggleText: { color: '#4CAF50', fontSize: 16, fontWeight: '600' },
  savedList: { gap: 8, marginBottom: 12 },
  savedCard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  savedInfo: { flex: 1, padding: 14 },
  savedName: { color: '#fff', fontSize: 16 },
  savedDelete: {
    backgroundColor: 'rgba(226,75,74,0.3)', width: 44, alignItems: 'center', justifyContent: 'center',
  },
  savedDeleteText: { color: '#E24B4A', fontSize: 18, fontWeight: 'bold' },
  resultList: { marginTop: 16, flex: 1 },
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
  actionBtn: {
    flex: 1, backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },
  scanBtn: { backgroundColor: '#1E88E5' },
  actionText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: '#FF9800', fontSize: 18, fontWeight: '600' },
  emptyHint: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 },
});
