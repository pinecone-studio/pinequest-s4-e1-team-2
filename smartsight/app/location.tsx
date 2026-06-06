import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useVoice, Strings } from '@/src/voice';

type LocationData = { name: string; sub: string };

const DEMO_LOCATIONS: LocationData[] = [
  { name: 'Дорнод худалдааны төв', sub: '2-р давхар, хоолны газрын урд' },
  { name: 'Сүхбаатарын талбай', sub: 'Баруун хойд булан' },
  { name: 'Их сургуулийн номын сан', sub: 'Гол орц' },
];

export default function LocationScreen() {
  const { speak, vibrate } = useVoice();
  const [loc, setLoc] = useState<LocationData | null>(null);
  const prevKey = useRef('');

  useEffect(() => {
    speak(Strings.screens.location);
  }, [speak]);

  useEffect(() => {
    if (!loc) return;
    const key = `${loc.name}|${loc.sub}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    speak(Strings.location(loc.name, loc.sub));
    vibrate.tap();
  }, [loc, speak, vibrate]);

  const clear = () => {
    setLoc(null);
    prevKey.current = '';
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Байршил' }} />
      <View style={s.root}>
        {loc ? (
          <View style={s.card}>
            <Text style={s.name}>{loc.name}</Text>
            <Text style={s.sub}>{loc.sub}</Text>
          </View>
        ) : (
          <Text style={s.idle}>Байршил тодорхойлогдоогүй</Text>
        )}

        <View style={s.btns}>
          {DEMO_LOCATIONS.map((l, i) => (
            <TouchableOpacity
              key={i}
              style={s.btn}
              onPress={() => setLoc(l)}
              accessibilityLabel={`${l.name}, ${l.sub}`}
            >
              <Text style={s.name2}>{l.name}</Text>
              <Text style={s.sub2}>{l.sub}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.btn, s.clearBtn]} onPress={clear} accessibilityLabel="Цэвэрлэх">
            <Text style={s.name2}>Цэвэрлэх</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a', padding: 24 },
  card: { marginVertical: 32 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 18, color: '#888' },
  idle: { fontSize: 20, color: '#555', textAlign: 'center', marginVertical: 40 },
  btns: { marginTop: 16 },
  btn: { backgroundColor: '#1c1c1e', borderRadius: 12, padding: 18, marginBottom: 12 },
  clearBtn: { backgroundColor: '#0a0a20' },
  name2: { color: '#fff', fontSize: 17, fontWeight: '600' },
  sub2: { color: '#888', fontSize: 14, marginTop: 4 },
});
