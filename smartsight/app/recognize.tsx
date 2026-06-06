import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useVoice, Strings } from '@/src/voice';

type RecognizedItem = { label: string; where: string };

const DEMO: RecognizedItem[] = [
  { label: '11-р тоот хаалга', where: 'зүүн байна' },
  { label: 'Шат', where: 'урд байна' },
  { label: 'Гарц', where: 'баруун байна' },
  { label: 'Хүн', where: 'ойр байна' },
];

export default function RecognizeScreen() {
  const { speak, vibrate } = useVoice();
  const [item, setItem] = useState<RecognizedItem | null>(null);
  const prevKey = useRef('');

  useEffect(() => {
    if (!item) return;
    const key = `${item.label}|${item.where}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    speak(Strings.recognize(item.label, item.where));
    vibrate.success();
  }, [item, speak, vibrate]);

  const clear = () => {
    setItem(null);
    prevKey.current = '';
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Таних систем' }} />
      <View style={s.root}>
        {item ? (
          <View style={s.card}>
            <Text style={s.label}>{item.label}</Text>
            <Text style={s.where}>{item.where}</Text>
          </View>
        ) : (
          <Text style={s.idle}>Объект илрүүлэгдээгүй</Text>
        )}

        <View style={s.btns}>
          {DEMO.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={s.btn}
              onPress={() => setItem(d)}
              accessibilityLabel={`${d.label}, ${d.where}`}
            >
              <Text style={s.btnTxt}>{d.label} — {d.where}</Text>
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
  card: { marginVertical: 32 },
  label: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  where: { fontSize: 20, color: '#aaa' },
  idle: { fontSize: 20, color: '#555', textAlign: 'center', marginVertical: 40 },
  btns: { marginTop: 16 },
  btn: { backgroundColor: '#1c1c1e', borderRadius: 12, padding: 18, marginBottom: 12 },
  clearBtn: { backgroundColor: '#002a00' },
  btnTxt: { color: '#fff', fontSize: 17 },
});
