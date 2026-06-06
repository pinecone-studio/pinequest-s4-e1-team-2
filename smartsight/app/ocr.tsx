import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useVoice, Strings } from '@/src/voice';

type OcrState = 'idle' | 'reading' | 'done';

export default function OcrScreen() {
  const { speak, vibrate } = useVoice();
  const [ocrState, setOcrState] = useState<OcrState>('idle');
  const [result, setResult] = useState('');
  const prevResult = useRef('');

  const startScan = () => {
    setOcrState('reading');
    vibrate.tap();
    speak(Strings.ocr.reading);
    // Камерын OCR дуусмагц дуудах — одоогоор симуляц
    setTimeout(() => {
      const text = 'Та 3-р давхарт байна. Зүүн гарт хаалга.';
      setOcrState('done');
      setResult(text);
    }, 2000);
  };

  useEffect(() => {
    if (ocrState !== 'done' || !result) return;
    if (result === prevResult.current) return;
    prevResult.current = result;
    speak(Strings.ocr.result(result));
  }, [ocrState, result, speak]);

  const reset = () => {
    setOcrState('idle');
    setResult('');
    prevResult.current = '';
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Текст уншиx' }} />
      <View style={s.root}>
        <View style={s.content}>
          {ocrState === 'idle' && (
            <Text style={s.idle}>Текст уншихад камераа чиглүүлнэ үү</Text>
          )}
          {ocrState === 'reading' && (
            <Text style={s.reading}>Уншиж байна...</Text>
          )}
          {ocrState === 'done' && (
            <View style={s.card}>
              <Text style={s.resultLabel}>Уншсан текст:</Text>
              <Text style={s.result}>{result}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[s.btn, ocrState === 'reading' && s.btnDisabled]}
          onPress={ocrState === 'reading' ? undefined : ocrState === 'done' ? reset : startScan}
          disabled={ocrState === 'reading'}
          accessibilityLabel={ocrState === 'done' ? 'Дахин уншиx' : 'Уншиж эхлэх'}
        >
          <Text style={s.btnTxt}>
            {ocrState === 'done' ? 'Дахин уншиx' : 'Уншиж эхлэх'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a', padding: 24, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center' },
  idle: { fontSize: 20, color: '#555', textAlign: 'center' },
  reading: { fontSize: 24, color: '#2196f3', textAlign: 'center' },
  card: { marginTop: 8 },
  resultLabel: { fontSize: 14, color: '#888', marginBottom: 8 },
  result: { fontSize: 20, color: '#fff', lineHeight: 30 },
  btn: { backgroundColor: '#1565c0', borderRadius: 14, padding: 20, marginBottom: 8 },
  btnDisabled: { backgroundColor: '#333' },
  btnTxt: { color: '#fff', fontSize: 18, textAlign: 'center', fontWeight: '600' },
});
