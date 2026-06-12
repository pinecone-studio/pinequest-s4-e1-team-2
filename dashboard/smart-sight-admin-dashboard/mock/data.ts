import type { User, Alert, Session, AlertSeverity } from "@/types"

const now = new Date("2026-06-09T14:30:00")

function isoMinutesAgo(min: number) {
  return new Date(now.getTime() - min * 60_000).toISOString()
}
function isoDaysAgo(days: number) {
  return new Date(now.getTime() - days * 86_400_000).toISOString()
}

export const users: User[] = [
  { id: "u-001", name: "Батбаярын Тэмүүлэн", email: "temuulen.b@smartsight.mn", avatar: "", visionType: "БҮРЭН", device: "Android", lastActive: isoMinutesAgo(4), totalSessions: 312, status: "Active", city: "Улаанбаатар", joinedAt: isoDaysAgo(420) },
  { id: "u-002", name: "Доржийн Сараа", email: "saraa.d@smartsight.mn", avatar: "", visionType: "ХАГАС", device: "iOS", lastActive: isoMinutesAgo(18), totalSessions: 289, status: "Active", city: "Улаанбаатар", joinedAt: isoDaysAgo(390) },
  { id: "u-003", name: "Энхбатын Ганзориг", email: "ganzorig.e@smartsight.mn", avatar: "", visionType: "БҮРЭН", device: "Android", lastActive: isoMinutesAgo(45), totalSessions: 256, status: "Active", city: "Дархан", joinedAt: isoDaysAgo(360) },
  { id: "u-004", name: "Оюунчимэгийн Болор", email: "bolor.o@smartsight.mn", avatar: "", visionType: "БУСАД", device: "iOS", lastActive: isoMinutesAgo(120), totalSessions: 198, status: "Active", city: "Эрдэнэт", joinedAt: isoDaysAgo(340) },
  { id: "u-005", name: "Цэрэндоржийн Алтан", email: "altan.ts@smartsight.mn", avatar: "", visionType: "БҮРЭН", device: "Android", lastActive: isoMinutesAgo(8), totalSessions: 187, status: "Active", city: "Улаанбаатар", joinedAt: isoDaysAgo(300) },
  { id: "u-006", name: "Мөнхбатын Дэлгэр", email: "delger.m@smartsight.mn", avatar: "", visionType: "ХАГАС", device: "iOS", lastActive: isoDaysAgo(2), totalSessions: 176, status: "Inactive", city: "Улаанбаатар", joinedAt: isoDaysAgo(280) },
  { id: "u-007", name: "Ганболдын Нараа", email: "naraa.g@smartsight.mn", avatar: "", visionType: "БҮРЭН", device: "Android", lastActive: isoMinutesAgo(33), totalSessions: 165, status: "Active", city: "Чойбалсан", joinedAt: isoDaysAgo(260) },
  { id: "u-008", name: "Сүхбаатарын Тулга", email: "tulga.s@smartsight.mn", avatar: "", visionType: "БУСАД", device: "iOS", lastActive: isoMinutesAgo(210), totalSessions: 154, status: "Active", city: "Улаанбаатар", joinedAt: isoDaysAgo(240) },
  { id: "u-009", name: "Лхагвасүрэнгийн Ану", email: "anu.l@smartsight.mn", avatar: "", visionType: "ХАГАС", device: "Android", lastActive: isoDaysAgo(5), totalSessions: 142, status: "Inactive", city: "Мөрөн", joinedAt: isoDaysAgo(220) },
  { id: "u-010", name: "Баасанжавын Хүслэн", email: "khuslen.b@smartsight.mn", avatar: "", visionType: "БҮРЭН", device: "Android", lastActive: isoMinutesAgo(67), totalSessions: 138, status: "Active", city: "Улаанбаатар", joinedAt: isoDaysAgo(200) },
  { id: "u-011", name: "Дашдоржийн Энхжин", email: "enkhjin.d@smartsight.mn", avatar: "", visionType: "БУСАД", device: "iOS", lastActive: isoMinutesAgo(15), totalSessions: 121, status: "Active", city: "Улаанбаатар", joinedAt: isoDaysAgo(180) },
  { id: "u-012", name: "Жаргалсайханы Ариунаа", email: "ariunaa.j@smartsight.mn", avatar: "", visionType: "ХАГАС", device: "Android", lastActive: isoDaysAgo(1), totalSessions: 109, status: "Active", city: "Сайншанд", joinedAt: isoDaysAgo(160) },
  { id: "u-013", name: "Нямдоржийн Билгүүн", email: "bilguun.n@smartsight.mn", avatar: "", visionType: "БҮРЭН", device: "iOS", lastActive: isoMinutesAgo(95), totalSessions: 98, status: "Active", city: "Улаанбаатар", joinedAt: isoDaysAgo(140) },
  { id: "u-014", name: "Чулуунбатын Сэлэнгэ", email: "selenge.ch@smartsight.mn", avatar: "", visionType: "БУСАД", device: "Android", lastActive: isoDaysAgo(9), totalSessions: 87, status: "Inactive", city: "Ховд", joinedAt: isoDaysAgo(120) },
  { id: "u-015", name: "Пүрэвдоржийн Мандах", email: "mandakh.p@smartsight.mn", avatar: "", visionType: "ХАГАС", device: "iOS", lastActive: isoMinutesAgo(52), totalSessions: 76, status: "Active", city: "Улаанбаатар", joinedAt: isoDaysAgo(100) },
  { id: "u-016", name: "Цогтбаатарын Уянга", email: "uyanga.ts@smartsight.mn", avatar: "", visionType: "БҮРЭН", device: "Android", lastActive: isoMinutesAgo(140), totalSessions: 64, status: "Active", city: "Багануур", joinedAt: isoDaysAgo(80) },
  { id: "u-017", name: "Эрдэнэбатын Тэнгис", email: "tengis.e@smartsight.mn", avatar: "", visionType: "БУСАД", device: "iOS", lastActive: isoDaysAgo(3), totalSessions: 53, status: "Inactive", city: "Улаанбаатар", joinedAt: isoDaysAgo(60) },
  { id: "u-018", name: "Болдбаатарын Цэцэг", email: "tsetseg.b@smartsight.mn", avatar: "", visionType: "ХАГАС", device: "Android", lastActive: isoMinutesAgo(25), totalSessions: 41, status: "Active", city: "Улаанбаатар", joinedAt: isoDaysAgo(45) },
  { id: "u-019", name: "Гомбосүрэнгийн Учрал", email: "uchral.g@smartsight.mn", avatar: "", visionType: "БҮРЭН", device: "iOS", lastActive: isoMinutesAgo(180), totalSessions: 28, status: "Active", city: "Зуунмод", joinedAt: isoDaysAgo(30) },
  { id: "u-020", name: "Амгаланбатын Соёл", email: "soyol.a@smartsight.mn", avatar: "", visionType: "БУСАД", device: "Android", lastActive: isoDaysAgo(12), totalSessions: 14, status: "Inactive", city: "Улаанбаатар", joinedAt: isoDaysAgo(18) },
]

const objectsBySeverity: Record<AlertSeverity, string[]> = {
  ЯАРАЛТАЙ: ["Машин", "Мотоцикл", "Гүүрэн гарц", "Цахилгаан шат", "Ил худаг", "Хурдтай дугуйчин"],
  АНХААРУУЛГА: ["Шат", "Хашлага", "Гэрлэн дохио", "Бордюр", "Бартаа", "Нойтон шал"],
  МЭДЭЭЛЭЛ: ["Хаалга", "Сандал", "Авлага", "Ширээ", "Хүн", "Зогсоол"],
}

const locations = [
  "Сүхбаатарын талбай",
  "Их дэлгүүр орчим",
  "Энх тайвны өргөн чөлөө",
  "Чингисийн өргөн чөлөө",
  "Драмын театр орчим",
  "Дунд гол гудамж",
  "Зайсангийн товчоо",
  "Баянзүрх дүүрэг 13-р хороо",
  "Хан-Уул дүүрэг",
  "Төв шуудан орчим",
]

const severities: AlertSeverity[] = ["ЯАРАЛТАЙ", "АНХААРУУЛГА", "МЭДЭЭЛЭЛ"]

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

export const alerts: Alert[] = Array.from({ length: 48 }, (_, i) => {
  const user = users[i % users.length]
  const severity = severities[i % 3 === 0 ? 0 : i % 5 === 0 ? 1 : 2]
  const object = pick(objectsBySeverity[severity], i + 1)
  const distance =
    severity === "ЯАРАЛТАЙ"
      ? Math.round((0.5 + (i % 5) * 0.4) * 10) / 10
      : severity === "АНХААРУУЛГА"
        ? Math.round((2 + (i % 6) * 0.7) * 10) / 10
        : Math.round((5 + (i % 8) * 1.1) * 10) / 10
  return {
    id: `a-${String(i + 1).padStart(3, "0")}`,
    timestamp: isoMinutesAgo(i * 23 + 2),
    userId: user.id,
    userName: user.name,
    severity,
    object,
    distance,
    location: pick(locations, i),
    sessionId: `s-${String((i % 24) + 1).padStart(3, "0")}`,
  }
})

export const sessions: Session[] = Array.from({ length: 24 }, (_, i) => {
  const user = users[i % users.length]
  const durationMin = 8 + ((i * 7) % 52)
  const detectionsCount = 3 + (i % 6)
  const detections: Session["detections"] = Array.from({ length: detectionsCount }, (_, d) => {
    const severity = severities[(i + d) % 3]
    return {
      time: `${String(Math.floor((d * durationMin) / detectionsCount)).padStart(2, "0")}:${String((d * 17) % 60).padStart(2, "0")}`,
      object: pick(objectsBySeverity[severity], i + d),
      severity,
      distance:
        severity === "ЯАРАЛТАЙ"
          ? Math.round((0.6 + d * 0.3) * 10) / 10
          : Math.round((3 + d * 0.8) * 10) / 10,
    }
  })
  return {
    id: `s-${String(i + 1).padStart(3, "0")}`,
    userId: user.id,
    userName: user.name,
    startTime: isoMinutesAgo(i * 71 + 5),
    durationMin,
    alertsCount: detectionsCount,
    device: user.device,
    detections,
  }
})

// Chart data
export const weeklyActiveData = [
  { day: "Дав", users: 842, alerts: 1240 },
  { day: "Мяг", users: 901, alerts: 1389 },
  { day: "Лха", users: 878, alerts: 1302 },
  { day: "Пүр", users: 1043, alerts: 1567 },
  { day: "Баа", users: 1187, alerts: 1834 },
  { day: "Бям", users: 1356, alerts: 2103 },
  { day: "Ням", users: 1289, alerts: 1976 },
]

export const activeTodaySparkline = [
  { h: "06", v: 120 },
  { h: "08", v: 340 },
  { h: "10", v: 610 },
  { h: "12", v: 780 },
  { h: "14", v: 1043 },
  { h: "16", v: 920 },
  { h: "18", v: 1180 },
  { h: "20", v: 640 },
]

export const deviceSplit = [
  { name: "Android", value: 62, fill: "var(--color-android)" },
  { name: "iOS", value: 38, fill: "var(--color-ios)" },
]

export const kpis = {
  totalUsers: 4287,
  totalUsersChange: 12.4,
  activeToday: 1043,
  activeTodayChange: 8.1,
  totalAlerts: 38291,
  totalAlertsChange: 5.7,
  avgSessionMin: 24.6,
  avgSessionChange: -2.3,
}

export const topUsers = [...users]
  .sort((a, b) => b.totalSessions - a.totalSessions)
  .slice(0, 5)
