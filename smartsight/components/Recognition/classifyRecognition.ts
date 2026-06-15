interface TextBlockLike {
  text: string;
  frame?: { width: number; height: number; top?: number; left?: number };
}

function blockArea(block: TextBlockLike): number {
  if (!block.frame) return 0;
  return block.frame.width * block.frame.height;
}

export function selectPrimaryBlock(blocks: TextBlockLike[]): TextBlockLike | null {
  if (blocks.length === 0) return null;
  return blocks.reduce((a, b) => (blockArea(b) > blockArea(a) ? b : a));
}

interface DoorNum {
  value: string;
  centerX: number;
  area: number;
}

// Бүх блокоос хаалганы дугаар маягийн тоонуудыг (1-4 орон) байрлалтай нь гаргана
function extractDoorNumbers(blocks: TextBlockLike[]): DoorNum[] {
  const found: DoorNum[] = [];
  for (const b of blocks) {
    const tokens = b.text.match(/\d{1,4}/g);
    if (!tokens) continue;
    const left = b.frame?.left ?? 0;
    const width = b.frame?.width ?? 0;
    const centerX = left + width / 2;
    for (const t of tokens) {
      found.push({ value: t, centerX, area: blockArea(b) });
    }
  }
  return found;
}

export function detectDoorNumberValues(blocks: TextBlockLike[]): string[] {
  const byValue = new Map<string, DoorNum>();
  for (const n of extractDoorNumbers(blocks)) {
    const prev = byValue.get(n.value);
    if (!prev || n.area > prev.area) byValue.set(n.value, n);
  }
  return Array.from(byValue.values())
    .sort((a, b) => a.centerX - b.centerX)
    .map((n) => n.value);
}

export function detectDoorNumbers(blocks: TextBlockLike[], photoWidth: number): string | null {
  const nums = extractDoorNumbers(blocks);
  if (nums.length === 0) return null;

  // Давхардсан утгыг нэгтгэж, хамгийн том талбайтайг үлдээнэ
  const byValue = new Map<string, DoorNum>();
  for (const n of nums) {
    const prev = byValue.get(n.value);
    if (!prev || n.area > prev.area) byValue.set(n.value, n);
  }
  const distinct = Array.from(byValue.values());

  // Ганц тоо
  if (distinct.length === 1) {
    return `${distinct[0].value} дугаар тоот`;
  }

  // 2-4 тусдаа тоо → "A болон B тоонууд" (зүүнээс баруун эрэмбээр)
  if (distinct.length <= 4) {
    const sorted = distinct.sort((a, b) => a.centerX - b.centerX);
    return sorted.map((d) => d.value).join(" болон ") + " тоонууд";
  }

  // Хэт олон тоо (шуугиантай) → төвд хамгийн ойр ганц тоог л унш
  const cx = photoWidth / 2;
  const center = distinct.reduce((a, b) =>
    Math.abs(b.centerX - cx) < Math.abs(a.centerX - cx) ? b : a
  );
  return `${center.value} дугаар тоот`;
}

export function formatMoney(value: number): string {
  return `${value.toLocaleString()} төгрөг`;
}
