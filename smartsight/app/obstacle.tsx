import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useVoice, Strings } from '@/src/voice';

type Obstacle = { dir: string; dist: number };

const DEMO: Obstacle[] = [
  { dir: 'Урд тийш', dist: 2.3 },
  { dir: 'Баруун тийш', dist: 1.4 },
  { dir: 'Урд тийш', dist: 0.8 },
  { dir: 'Зүүн тийш', dist: 0.4 },
];

export default function ObstacleScreen() {
  const { speak, vibrate } = useVoice();
  const [obstacle, setObstacle] = useState<Obstacle | null>(null);
  const prevKey = useRef('');

  useEffect(() => {
    if (!obstacle) return;
    const key = `${obstacle.dir}|${obstacle.dist}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    const priority = obstacle.dist <= 0.9 ? 'urgent' : 'normal';
    speak(Strings.obstacle(obstacle.dir, obstacle.dist), priority);
    vibrate.byDistance(obstacle.dist);
  }, [obstacle, speak, vibrate]);

  const clear = () => {
    setObstacle(null);
    prevKey.current = '';
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Саад мүдрүгч' }} />
      <View style={s.root}>
        {obstacle ? (
          <View style={s.card}>
            <Text style={s.dir}>{obstacle.dir}</Text>
            <Text style={[s.dist, obstacle.dist <= 0.9 && s.danger]}>
              {obstacle.dist} м
            </Text>
          </View>
        ) : (
          <Text style={s.idle}>Саад илрээгүй</Text>
        )}

        <View style={s.btns}>
          {DEMO.map((o, i) => (
            <TouchableOpacity
              key={i}
              style={s.btn}
              onPress={() => setObstacle(o)}
              accessibilityLabel={`${o.dir}, ${o.dist} метр`}
            >
              <Text style={s.btnTxt}>{o.dir} — {o.dist} м</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.btn, s.clearBtn]} onPress={clear} accessibilityLabel="Цэвэрлэх">
            <Text style={s.btnTxt}>Цэвэрлэх</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a', padding: 24 },
  card: { alignItems: 'center', marginVertical: 32 },
  dir: { fontSize: 22, color: '#ccc', marginBottom: 8 },
  dist: { fontSize: 56, fontWeight: 'bold', color: '#4caf50' },
  danger: { color: '#f44336' },
  idle: { fontSize: 20, color: '#555', textAlign: 'center', marginVertical: 40 },
  btns: { marginTop: 16 },
  btn: { backgroundColor: '#1c1c1e', borderRadius: 12, padding: 18, marginBottom: 12 },
  clearBtn: { backgroundColor: '#2a0000' },
  btnTxt: { color: '#fff', fontSize: 17 },
});
