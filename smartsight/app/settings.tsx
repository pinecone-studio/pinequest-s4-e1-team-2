import React, { useEffect } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { useVoice, Strings } from '@/src/voice';

export default function SettingsScreen() {
  const { settings, setSettings, speak, vibrate } = useVoice();

  useEffect(() => {
    speak(Strings.settings.opened);
  }, [speak]);

  const toggleGender = () => {
    const next = settings.gender === 'male' ? 'female' : 'male';
    setSettings({ gender: next });
    vibrate.tap();
    speak(
      next === 'male' ? Strings.settings.genderMale : Strings.settings.genderFemale,
      'urgent',
    );
  };

  const changeRate = (delta: number) => {
    const next =
      Math.round(Math.min(2.0, Math.max(0.5, settings.rate + delta)) * 10) / 10;
    if (next === settings.rate) return;
    setSettings({ rate: next });
    vibrate.tap();
    speak(Strings.settings.rateChanged(next), 'urgent');
  };

  const toggleEnabled = () => {
    const next = !settings.enabled;
    setSettings({ enabled: next });
    vibrate.tap();
    if (next) setTimeout(() => speak(Strings.settings.voiceOn, 'urgent'), 80);
  };

  return (
    <View style={s.root}>
      {/* Voice on/off */}
      <View
        style={s.row}
        accessible
        accessibilityRole="switch"
        accessibilityLabel={`Дуу хоолой, ${settings.enabled ? 'асаалттай' : 'унтраалттай'}`}
      >
        <Text style={s.rowLabel}>Дуу хоолой</Text>
        <Switch
          value={settings.enabled}
          onValueChange={toggleEnabled}
          thumbColor="#fff"
          trackColor={{ false: '#444', true: '#34C759' }}
        />
      </View>

      <View style={s.divider} />

      {/* Gender */}
      <Text style={s.section}>ХООЛОЙН ХҮЙС</Text>
      <View style={s.segRow}>
        <TouchableOpacity
          style={[s.seg, settings.gender === 'male' && s.segActive]}
          onPress={() => settings.gender !== 'male' && toggleGender()}
          accessibilityRole="radio"
          accessibilityState={{ checked: settings.gender === 'male' }}
          accessibilityLabel="Эрэгтэй хоолой"
        >
          <Text style={[s.segText, settings.gender === 'male' && s.segTextActive]}>
            Эрэгтэй
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.seg, settings.gender === 'female' && s.segActive]}
          onPress={() => settings.gender !== 'female' && toggleGender()}
          accessibilityRole="radio"
          accessibilityState={{ checked: settings.gender === 'female' }}
          accessibilityLabel="Эмэгтэй хоолой"
        >
          <Text style={[s.segText, settings.gender === 'female' && s.segTextActive]}>
            Эмэгтэй
          </Text>
        </TouchableOpacity>
      </View>

      <View style={s.divider} />

      {/* Rate */}
      <Text style={s.section}>ЯРИХ ХУРД</Text>
      <View style={s.rateRow}>
        <TouchableOpacity
          style={s.rateBtn}
          onPress={() => changeRate(-0.1)}
          accessibilityLabel="Хурдыг бага болгох"
        >
          <Text style={s.rateBtnText}>−</Text>
        </TouchableOpacity>

        <View style={s.rateCenter}>
          <Text style={s.rateVal}>{settings.rate.toFixed(1)}</Text>
          <Text style={s.rateUnit}>x</Text>
        </View>

        <TouchableOpacity
          style={s.rateBtn}
          onPress={() => changeRate(0.1)}
          accessibilityLabel="Хурдыг ихэсгэх"
        >
          <Text style={s.rateBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={s.rangeLabelRow}>
        <Text style={s.rangeLabel}>0.5x (удаан)</Text>
        <Text style={s.rangeLabel}>2.0x (хурдан)</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    minHeight: 72,
    backgroundColor: '#1c1c1e',
  },
  rowLabel: { color: '#fff', fontSize: 20, fontWeight: '600' },

  divider: { height: 28 },

  section: {
    color: '#888',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 24,
    marginBottom: 14,
  },

  segRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12 },
  seg: {
    flex: 1,
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segActive: { backgroundColor: '#fff' },
  segText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  segTextActive: { color: '#000' },

  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  rateBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtnText: { color: '#fff', fontSize: 40, fontWeight: '200', lineHeight: 46 },
  rateCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
  },
  rateVal: { color: '#fff', fontSize: 56, fontWeight: '700' },
  rateUnit: { color: '#888', fontSize: 26 },
  rangeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 10,
  },
  rangeLabel: { color: '#555', fontSize: 13 },
});
