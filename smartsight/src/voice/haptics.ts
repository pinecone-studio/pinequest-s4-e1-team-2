// Зүүн / баруун / ойр / аюултай — мэдрэгчийн иргэлийн паттернууд

import * as Haptics from 'expo-haptics';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function left() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function right() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export async function tap() {
  await Haptics.selectionAsync();
}

export async function success() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

// Ойр (1.5м доор) — давтасан дунд иргэл
export async function near() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await wait(120);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

// Аюултай (0.9м доор) — гурван удаа анхааруулга
export async function urgent() {
  for (let i = 0; i < 3; i++) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await wait(150);
  }
}

// Зайнаас хамаарсан автомат сонголт
export function byDistance(dist: number) {
  if (dist <= 0.9) return urgent();
  if (dist <= 1.5) return near();
  return tap();
}
