interface TextBlockLike {
  text: string;
  frame?: { width: number; height: number; top?: number; left?: number };
}

const PROMINENCE_RATIO = 0.005;

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

export function detectDoorNumber(block: TextBlockLike | null, photoArea: number): string | null {
  if (!block || !isProminent(block, photoArea)) return null;
  const num = extractNumber(block.text);
  return num && num.length <= 4 ? `${num} дугаар тоот` : null;
}

export function formatMoney(value: number): string {
  return `${value.toLocaleString()} төгрөг`;
}
