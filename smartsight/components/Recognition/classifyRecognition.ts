interface TextBlockLike {
  text: string;
  frame?: { width: number; height: number };
}

const PROMINENCE_RATIO = 0.02;
const COLOR_MATCH_THRESHOLD = 60;

// Зөвхөн rough filter — бодит дэвсгэртийн зургаас хэмжсэн өнгөөр нарийвчлал сайжруулж болно
const BANKNOTE_COLORS: Record<number, string | string[]> = {
  10: "#7FA86B",
  20: "#8B4A6B",
  50: "#8A6A3F",
  100: "#6F5A9B",
  500: "#4F8B5F",
  1000: "#4E7FAE",
  5000: "#B35B9E",
  10000: "#C6A247",
  20000: ["#A7B957", "#72539B"],
};

function blockArea(block: TextBlockLike): number {
  if (!block.frame) return 0;
  return block.frame.width * block.frame.height;
}

export function selectPrimaryBlock(blocks: TextBlockLike[]): TextBlockLike | null {
  if (blocks.length === 0) return null;
  return blocks.reduce((a, b) => (blockArea(b) > blockArea(a) ? b : a));
}

function isProminent(block: TextBlockLike, photoArea: number): boolean {
  return photoArea > 0 && blockArea(block) / photoArea >= PROMINENCE_RATIO;
}

function extractNumber(text: string): string | null {
  const match = text.replace(/\s/g, "").match(/\d+/);
  return match ? match[0] : null;
}

function isPlausibleLength(num: string, maxDigits: number): boolean {
  return num.length > 0 && num.length <= maxDigits;
}

export function detectDoorNumber(block: TextBlockLike | null, photoArea: number): string | null {
  if (!block || !isProminent(block, photoArea)) return null;
  const num = extractNumber(block.text);
  return num && isPlausibleLength(num, 4) ? `${num} дугаар тоот` : null;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export function classifyByColor(hex: string): number | null {
  let best: { value: number; distance: number } | null = null;

  for (const [key, refs] of Object.entries(BANKNOTE_COLORS)) {
    const refColors = Array.isArray(refs) ? refs : [refs];
    const distance = Math.min(...refColors.map((ref) => colorDistance(hex, ref)));
    if (!best || distance < best.distance) {
      best = { value: Number(key), distance };
    }
  }

  return best && best.distance <= COLOR_MATCH_THRESHOLD ? best.value : null;
}

export function formatMoney(value: number): string {
  return `${value.toLocaleString()} төгрөг`;
}
