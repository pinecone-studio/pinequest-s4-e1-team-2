// Монгол текстийн бүх утга нэг дор — дизайны контентоос тасдалсан

export const onboarding = {
  chooseVision: 'Харааны тадвараа сонгоно уу.',
  fullBlind: 'Бүрэн харааны. Огт харагддаггүй бол энэ товчийг дарна уу.',
  lowVision: 'Хагас харааны. Бага зүйлс харагддаг бол энэ товчийг дарна уу.',
  other: 'Бусад.',
  login: 'Smart Sight. Нэвтрэн орно уу.',
};

export const home = {
  prompt: 'Юу хийх вэ?',
  obstacle: 'Саад мүдрүгч.',
  recognize: 'Таних систем.',
  ocr: 'Текст уншиx.',
  location: 'Байршил.',
};

export function permission(title: string, desc: string) {
  return `${title}. ${desc}`;
}

// 5 · Саад мүдрүгч — дизайны near≤1.5, urgent≤0.9
export function obstacle(dir: string, dist: number) {
  if (dist <= 0.9) return `Зогс! ${dir}, ${dist} метр.`;
  if (dist <= 1.5) return `Болгоомжтой. ${dir}, ${dist} метр.`;
  return `${dir}, ${dist} метр.`;
}

// 6 · Таних систем
export function recognize(label: string, where: string) {
  return `${label}, ${where}.`;
}

// 7 · Текст уншиx
export const ocr = {
  reading: 'Уншиж байна.',
  noText: 'Текст олдоогүй. Уурааа ойртуулж үзгэлнэ үү.',
  result: (text: string) => `Уншсан текст. ${text}`,
};

// 8 · Байршил
export function location(name: string, sub: string) {
  return `Та одоо энд байна. ${name}. ${sub}.`;
}

export const ui = {
  started: 'Эхэллээ.',
  stopped: 'Зогсоллоо.',
  muted: 'Дуу тасагдлаа.',
};

export const screens = {
  location: 'Байршил. Байршлаа сонгоно уу.',
  settings: 'Дуу хоолойн тохиргоо.',
};

export const settings = {
  opened: 'Дуу хоолойн тохиргоо.',
  genderMale: 'Эрэгтэй хоолой.',
  genderFemale: 'Эмэгтэй хоолой.',
  rateChanged: (r: number) => `Хурд ${r.toFixed(1)}.`,
  voiceOn: 'Дуу асаалаа.',
  voiceOff: 'Дуу унтраалаа.',
};
