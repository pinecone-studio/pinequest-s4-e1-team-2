const DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 1000, 500, 100, 50, 20, 10];
const BUS_LABELS = ["bus", "vehicle", "transport", "minibus", "motor vehicle"];
const MONEY_LABELS = ["banknote", "money", "currency", "cash", "paper"];

function extractNumber(text: string): string | null {
  const match = text.replace(/\s/g, "").match(/\d+/);
  return match ? match[0] : null;
}

function extractDenomination(text: string): string | null {
  const cleaned = text.replace(/[,.\s]/g, "");
  const found = DENOMINATIONS.find((d) => cleaned.includes(String(d)));
  return found ? found.toLocaleString() : null;
}

function isBusContext(labels: string[]): boolean {
  return labels.some((l) => BUS_LABELS.includes(l.toLowerCase()));
}

function isMoneyContext(labels: string[]): boolean {
  return labels.some((l) => MONEY_LABELS.includes(l.toLowerCase()));
}

export function classifyFromContext(labels: string[], text: string): string {
  if (isBusContext(labels)) {
    const num = extractNumber(text);
    if (num) return `${num}-ын автобус`;
  }

  if (isMoneyContext(labels)) {
    const denom = extractDenomination(text);
    if (denom) return `${denom} төгрөг`;
  }

  const num = extractNumber(text);
  if (num) return `${num} дугаар тоот`;

  if (text.trim().length > 0) return text.trim();

  return "Танихгүй байна";
}
