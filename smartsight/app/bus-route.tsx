import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Keyboard,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui-generated/_comps';
import { AccessibleElement } from '@/components/AccessibleElement';
import { useAccessibility } from '@/providers/AccesibilityProvider';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { speech } from '@/src/voice';
import {
  searchStations, findDirectRoutesToDestination,
  type BusStop, type NearbyDirectRoute,
} from '@/services/busApi';
import {
  getSavedRoutes, saveRoute,
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

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} км` : `${Math.round(meters)} м`;
}

export default function BusRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prefillTo?: string; voiceTo?: string; voiceAt?: string }>();

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

  // Results — надтай ойр буудлуудаас очих газар руу ШУУД явах автобусууд
  const [directOptions, setDirectOptions] = useState<NearbyDirectRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Saved routes
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);

  // Double tap for popular stops
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Explore-by-touch + 2 хурууны scroll (Ойр буудал/Өрөө хайхтай ижил загвар)
  const { setScroller, remeasureAll } = useAccessibility();
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const uid = React.useId().replace(/:/g, '-');
  const fromInputRef = useRef<TextInput>(null);
  const toInputRef = useRef<TextInput>(null);
  const lastVoiceToRef = useRef<string | null>(null);

  useEffect(() => {
    setScroller((dy) => {
      const next = Math.max(0, offsetRef.current + dy);
      offsetRef.current = next;
      scrollRef.current?.scrollTo({ y: next, animated: false });
    });
    return () => setScroller(null);
  }, [setScroller]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = e.nativeEvent.contentOffset.y;
    remeasureAll();
  };

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

  const applyDestinationText = useCallback(async (rawText: string, source: 'prefill' | 'voice') => {
    const text = rawText.trim();
    if (text.length < 2) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearched(false);
    setToStop(null);
    setToText(text);
    setActiveField('to');

    try {
      const stops = await searchStations(text);
      const matches = stops ?? [];
      setSuggestions(matches);

      if (matches.length > 0) {
        const best = matches[0];
        selectStop(best, 'to');
        if (source === 'voice') {
          speech.speak(`${best.busStopName} сонгогдлоо. Чиглэл хайх товчийг дарна уу`);
        }
      } else if (source === 'voice') {
        speech.speak(`${text} гэсэн буудал олдсонгүй. Дахин тод хэлнэ үү`);
      }
    } catch {
      setSuggestions([]);
      if (source === 'voice') speech.speak('Буудал хайхад алдаа гарлаа');
    }
  }, [selectStop]);

  useEffect(() => {
    if (params.prefillTo) {
      void applyDestinationText(params.prefillTo, 'prefill');
    }
  }, [params.prefillTo, applyDestinationText]);

  useEffect(() => {
    const voiceTo = params.voiceTo?.trim();
    const voiceKey = `${voiceTo ?? ''}:${params.voiceAt ?? ''}`;
    if (!voiceTo || voiceKey === lastVoiceToRef.current) return;
    lastVoiceToRef.current = voiceKey;
    void applyDestinationText(voiceTo, 'voice');
  }, [params.voiceTo, params.voiceAt, applyDestinationText]);

  // Чиглэл хайх — надтай ойр буудлуудаас очих газар руу ШУУД явах автобусыг олно
  const doSearch = useCallback(async () => {
    // Эхлэх цэгийн координат (GPS эсвэл гараар сонгосон буудал)
    const fromCoords =
      useGps && myLat != null && myLon != null
        ? { lat: myLat, lon: myLon }
        : fromStop
          ? { lat: parseFloat(fromStop.gpxY), lon: parseFloat(fromStop.gpxX) }
          : null;
    if (!fromCoords || !toStop) {
      speech.speak('Очих буудлаа сонгоно уу');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setSearched(true);
    try {
      // GPS бол ойр 3 буудал, гараар бол тэр буудлаас (1)
      // Надтай хамгийн ойр 5 буудлаас очих газар руу шууд явдгийг харуулна
      const opts = await findDirectRoutesToDestination(
        fromCoords.lat, fromCoords.lon, toStop, 5,
      );
      setDirectOptions(opts);

      if (opts.length > 0) {
        const first = opts[0];
        const routeNo = first.routes[0].busRouteNo;
        speech.speak(
          `Ойр буудал ${first.boardStop.busStopName}, ${Math.round(first.walkMeters)} метр. ` +
          `${routeNo} автобусаар ${toStop.busStopName} хүрнэ`,
        );
      } else {
        speech.speak('Шууд явах автобус олдсонгүй. Дамжих шаардлагатай байж магадгүй');
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'RATE_LIMIT') {
        setSearched(false);
        speech.speak('Сүлжээ ачаалалтай байна. Хэсэг хүлээгээд дахин оролдоно уу');
      } else {
        speech.speak('Алдаа гарлаа');
      }
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

  // Контент/төлөв солигдоход layout шилждэг тул элементүүдийг дахин хэмжинэ
  useEffect(() => {
    offsetRef.current = 0;
    const timers = [setTimeout(remeasureAll, 250), setTimeout(remeasureAll, 600)];
    return () => timers.forEach(clearTimeout);
  }, [searched, toStop, useGps, savedRoutes, directOptions, suggestions, remeasureAll]);

  return (
    <View style={s.root}>
      <Text style={s.title}>Автобус чиглэл</Text>

      {!searched && (
        <ScrollView ref={scrollRef} onScroll={handleScroll} scrollEventThrottle={16} style={s.scroll} contentContainerStyle={{ paddingBottom: 90 }} keyboardShouldPersistTaps="handled">
          {/* Хаанаас */}
          <View style={[s.fromBox, useGps && myLat ? s.fromBoxGps : null]}>
            <Text style={s.fromLabel}>
              {gpsLoading ? 'Байршил хайж байна...' : useGps && myLat ? 'Миний байршлаас' : 'Буудал сонгоно уу'}
            </Text>
            {!useGps && (
              <AccessibleElement
                id={`bus-${uid}-from-input`}
                label="Хаанаас. Буудлын нэр бичих"
                onActivate={() => setTimeout(() => fromInputRef.current?.focus(), 50)}
              >
                <TextInput
                  ref={fromInputRef}
                  style={s.input}
                  placeholder="Буудлын нэр..."
                  placeholderTextColor="#888"
                  value={fromText}
                  onChangeText={(t) => { setFromStop(null); handleSearch(t, 'from'); }}
                  onFocus={() => setActiveField('from')}
                />
              </AccessibleElement>
            )}
            {useGps && myLat && (
              <AccessibleElement
                id={`bus-${uid}-manual`}
                label="Буудал гараар сонгох"
                onActivate={() => { setUseGps(false); speech.speak('Буудлаа бичнэ үү'); }}
              >
                <TouchableOpacity onPress={() => { setUseGps(false); speech.speak('Буудлаа бичнэ үү'); }}>
                  <Text style={s.switchText}>Буудал гараар сонгох</Text>
                </TouchableOpacity>
              </AccessibleElement>
            )}
            {!useGps && (
              <AccessibleElement
                id={`bus-${uid}-gps`}
                label="Миний байршлаас"
                onActivate={() => {
                  if (myLat) { setUseGps(true); speech.speak('Миний байршлаас'); }
                  else speech.speak('Байршил тодорхойлогдоогүй');
                }}
              >
                <TouchableOpacity onPress={() => {
                  if (myLat) { setUseGps(true); speech.speak('Миний байршлаас'); }
                  else speech.speak('Байршил тодорхойлогдоогүй');
                }}>
                  <Text style={s.switchText}>Миний байршлаас</Text>
                </TouchableOpacity>
              </AccessibleElement>
            )}
          </View>

          {/* Хааш */}
          <Text style={s.sectionLabel}>Хааш явах вэ?</Text>

          {/* Очих буудал сонгогдсон */}
          {toStop && (
            <View style={s.selectedTo}>
              <Text style={s.selectedToText}>{toStop.busStopName}</Text>
              <AccessibleElement
                id={`bus-${uid}-clear`}
                label={`Очих буудал ${toStop.busStopName}. Солих`}
                onActivate={() => { setToStop(null); setToText(''); speech.speak('Очих буудал цуцлагдлаа'); }}
              >
                <TouchableOpacity onPress={() => { setToStop(null); setToText(''); speech.speak('Очих буудал цуцлагдлаа'); }}>
                  <Text style={s.clearText}>Солих</Text>
                </TouchableOpacity>
              </AccessibleElement>
            </View>
          )}

          {/* TextInput + suggestions (хагас харагддаг хүнд) */}
          {!toStop && (
            <>
              <AccessibleElement
                id={`bus-${uid}-to-input`}
                label="Хааш явах. Буудлын нэр бичих"
                onActivate={() => toInputRef.current?.focus()}
              >
                <TextInput
                  ref={toInputRef}
                  style={s.input}
                  placeholder="Буудлын нэр бичих..."
                  placeholderTextColor="#888"
                  value={toText}
                  onChangeText={(t) => { setToStop(null); handleSearch(t, 'to'); }}
                  onFocus={() => setActiveField('to')}
                />
              </AccessibleElement>
              {suggestions.length > 0 && activeField && (
                <View style={s.suggestBox}>
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item) => item.busStopId}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <AccessibleElement
                        id={`bus-${uid}-sug-${item.busStopId}`}
                        label={item.busStopName}
                        onActivate={() => selectStop(item, activeField)}
                      >
                        <TouchableOpacity style={s.suggestItem} onPress={() => selectStop(item, activeField)}>
                          <Text style={s.suggestText}>{item.busStopName}</Text>
                        </TouchableOpacity>
                      </AccessibleElement>
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
                <AccessibleElement
                  key={sr.id}
                  id={`bus-${uid}-saved-${sr.id}`}
                  label={sr.name}
                  onActivate={() => {
                    if (sr.from.busStopId === 'gps') setUseGps(true);
                    else { setFromStop(sr.from); setFromText(sr.from.busStopName); setUseGps(false); }
                    setToStop(sr.to);
                    setToText(sr.to.busStopName);
                    speech.speak(`${sr.name} сонгогдлоо`);
                  }}
                >
                  <TouchableOpacity style={s.quickBtn} onPress={() => handleSavedTap(sr)}>
                    <Text style={s.quickText}>{sr.name}</Text>
                  </TouchableOpacity>
                </AccessibleElement>
              ))}
            </>
          )}

          {/* Түгээмэл буудлууд */}
          {!toStop && (
            <>
              <Text style={s.sectionLabel}>Түгээмэл буудал</Text>
              <View style={s.popularGrid}>
                {POPULAR_STOPS.map(stop => (
                  <AccessibleElement
                    key={stop.busStopId}
                    id={`bus-${uid}-pop-${stop.busStopId}`}
                    label={stop.busStopName}
                    style={[s.popularBtn, { width: '48%' }]}
                    onActivate={() => {
                      setToStop(stop);
                      setToText(stop.busStopName);
                      speech.speak(`${stop.busStopName} сонгогдлоо`);
                    }}
                  >
                    <Text style={s.popularText}>{stop.busStopName}</Text>
                  </AccessibleElement>
                ))}
              </View>
            </>
          )}

          {/* ХАЙХ товч */}
          <AccessibleElement
            id={`bus-${uid}-search`}
            label="Чиглэл хайх"
            onActivate={doSearch}
          >
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
          </AccessibleElement>

          {canSearch && (
            <AccessibleElement
              id={`bus-${uid}-save`}
              label="Хадгалах"
              onActivate={handleSaveRoute}
            >
              <TouchableOpacity style={s.saveBtn} onPress={handleSaveRoute}>
                <Text style={s.saveBtnText}>ХАДГАЛАХ</Text>
              </TouchableOpacity>
            </AccessibleElement>
          )}
        </ScrollView>
      )}

      {/* Results */}
      {searched && !loading && (
        <ScrollView ref={scrollRef} onScroll={handleScroll} scrollEventThrottle={16} style={s.resultList} contentContainerStyle={{ paddingBottom: 90 }}>
          <AccessibleElement
            id={`bus-${uid}-research`}
            label="Дахин хайх"
            onActivate={() => { setSearched(false); speech.speak('Дахин хайх'); }}
          >
            <TouchableOpacity style={s.backToSearch} onPress={() => { setSearched(false); speech.speak('Дахин хайх'); }}>
              <Text style={s.backToSearchText}>Дахин хайх</Text>
            </TouchableOpacity>
          </AccessibleElement>
          {directOptions.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>Шууд явах автобус олдсонгүй</Text>
              <Text style={s.emptyHint}>Очих буудлыг ойрхон сонгож үзнэ үү</Text>
            </View>
          ) : (
            directOptions.map((opt, idx) => {
              const primary = opt.routes[0];
              const altNos = opt.routes.slice(1).map((r) => r.busRouteNo);
              const routeNos = opt.routes.map((r) => r.busRouteNo).join(', ');
              const walk = formatDistance(opt.walkMeters);
              const summary =
                `Ойр буудал ${opt.boardStop.busStopName}, ${walk} алхана. ` +
                `${routeNos} автобусаар ${toStop?.busStopName ?? ''} хүрнэ`;
              const startJourney = () => {
                router.push({
                  pathname: '/bus-journey',
                  params: {
                    routeId: primary.busRouteId,
                    routeName: primary.busRouteNo,
                    destStopId: toStop?.busStopId ?? '',
                  },
                } as any);
              };
              return (
                <View key={opt.boardStop.busStopId + idx} style={[s.resultCard, s.busCard]}>
                  <View style={s.resultCardRow}>
                    <View style={s.routeInfo}>
                      {/* Хуруу хүрэхэд тоймыг уншина */}
                      <AccessibleElement id={`bus-${uid}-opt-${idx}`} label={summary}>
                        <View>
                          <View style={s.routeHeader}>
                            <Text style={s.routeTitle} numberOfLines={1}>{primary.busRouteNo}</Text>
                            <Text style={s.transferBadge} numberOfLines={1}>Шууд</Text>
                          </View>
                          <View style={s.factList}>
                            <View style={s.factRow}>
                              <Text style={s.factLabel}>Суух</Text>
                              <Text style={s.factValue} numberOfLines={1}>{opt.boardStop.busStopName}</Text>
                            </View>
                            <View style={s.factRow}>
                              <Text style={s.factLabel}>Алхах</Text>
                              <Text style={s.factValue} numberOfLines={1}>{walk}</Text>
                            </View>
                            <View style={s.factRow}>
                              <Text style={s.factLabel}>Буух</Text>
                              <Text style={s.factValue} numberOfLines={1}>{toStop?.busStopName ?? ''}</Text>
                            </View>
                            {altNos.length > 0 && (
                              <View style={s.factRow}>
                                <Text style={s.factLabel}>Эсвэл</Text>
                                <Text style={s.factValue} numberOfLines={1}>{altNos.join(', ')}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </AccessibleElement>
                    </View>

                    <AccessibleElement
                      id={`bus-${uid}-board-${idx}`}
                      label={`${primary.busRouteNo} автобусанд суулаа`}
                      onActivate={startJourney}
                      style={s.boardAction}
                    >
                      <TouchableOpacity style={s.boardBtn} onPress={startJourney}>
                        <Text style={s.boardBtnText}>Суулаа</Text>
                      </TouchableOpacity>
                    </AccessibleElement>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Буцах товч доод талд — бусад дэлгэцтэй адил */}
      <View style={{ paddingTop: 8, paddingBottom: 24 }}>
        <Button
          label="Буцах"
          height={88}
          audioSource={require('@/assets/haptics/backbtn.mp3')}
          onPress={() => router.back()}
        />
      </View>
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
  fromBoxGps: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' },
  fromLabel: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  switchText: { color: '#fff', fontSize: 14, marginTop: 8 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 18,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },

  sectionLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 10 },

  selectedTo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#fff',
  },
  selectedToText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  clearText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  suggestBox: {
    backgroundColor: 'rgba(30,30,30,0.98)', borderRadius: 12, maxHeight: 200,
    marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  suggestItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  suggestText: { color: '#fff', fontSize: 16 },

  // Quick buttons
  quickBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 16, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  quickText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Popular stops
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  popularItem: { width: '48%' }, // grid-ийн өргөн AccessibleElement дээр
  popularBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    width: '100%',
  },
  popularText: { color: '#fff', fontSize: 16, textAlign: 'center' },

  searchBtn: {
    backgroundColor: '#fff', paddingVertical: 18, borderRadius: 14,
    alignItems: 'center', marginTop: 24,
  },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: '#000', fontSize: 20, fontWeight: 'bold' },

  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 10, marginBottom: 30,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Results
  resultList: { flex: 1, marginTop: 8 },
  backToSearch: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', marginBottom: 12,
  },
  backToSearchText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultCard: { height: 190, borderRadius: 12, padding: 14, marginBottom: 10, overflow: 'hidden' },
  resultCardExpanded: { height: 330 },
  busCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  walkCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  resultCardRow: { height: 162, flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  routeInfo: { flex: 1, minWidth: 0 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  routeTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', flex: 1 },
  transferBadge: { color: '#fff', fontSize: 13, fontWeight: '700', flexShrink: 0, maxWidth: 92, textAlign: 'right' },
  factList: { gap: 5 },
  factRow: { minHeight: 22, flexDirection: 'row', alignItems: 'center', gap: 8 },
  factLabel: { width: 52, color: 'rgba(255,255,255,0.48)', fontSize: 12, fontWeight: '700' },
  factValue: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  detailsToggle: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  detailsToggleText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  detailsBox: {
    marginTop: 12,
    maxHeight: 126,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    paddingTop: 8,
  },
  detailStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 9 },
  detailStepNo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.16)',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  detailStepBody: { flex: 1, minWidth: 0 },
  detailBusName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  detailText: { color: 'rgba(255,255,255,0.68)', fontSize: 13, marginTop: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  timeBlock: { flex: 1, minWidth: 0 },
  cardDuration: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  timeRange: { color: 'rgba(255,255,255,0.58)', fontSize: 13, marginTop: 2 },
  legsPreview: { height: 102, overflow: 'hidden' },
  legRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 7 },
  legDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 10 },
  busDot: { backgroundColor: '#fff' },
  walkDot: { backgroundColor: '#9E9E9E' },
  legInfo: { flex: 1 },
  busName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  legDetail: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  walkText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  moreLegsText: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 6, marginLeft: 22 },
  boardAction: { width: 112, alignSelf: 'stretch' },
  boardBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  boardBtnText: { color: '#000', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptyHint: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 },
});
