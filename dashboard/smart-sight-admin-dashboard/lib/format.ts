export function relativeTime(iso: string): string {
  const now = new Date("2026-06-09T14:30:00").getTime()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return "дөнгөж сая"
  if (min < 60) return `${min} мин`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} цаг`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} өдөр`
  const mo = Math.floor(day / 30)
  return `${mo} сар`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString("en-CA")} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
