import { StatsCard } from "@/components/dashboard/stats-card"
import { AlertsFeed } from "@/components/dashboard/alerts-feed"
import { alerts } from "@/mock/data"
import { formatNumber } from "@/lib/format"
import { TriangleAlert, ShieldAlert, Activity, Gauge } from "lucide-react"

export default function AlertsPage() {
  const now = new Date("2026-06-09T14:30:00").getTime()
  const today = alerts.filter((a) => now - new Date(a.timestamp).getTime() <= 24 * 3_600_000)
  const critical = alerts.filter((a) => a.severity === "ЯАРАЛТАЙ").length
  const avgPerSession = (alerts.length / 24).toFixed(1)
  const avgDistance =
    (alerts.reduce((s, a) => s + a.distance, 0) / alerts.length).toFixed(1)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Өнөөдрийн нийт" value={formatNumber(today.length)} icon={Activity} />
        <StatsCard label="Яаралтай" value={formatNumber(critical)} icon={ShieldAlert} />
        <StatsCard label="Сесс тутамд дундаж" value={avgPerSession} icon={TriangleAlert} />
        <StatsCard label="Дундаж зай" value={`${avgDistance}м`} icon={Gauge} />
      </div>

      <AlertsFeed alerts={alerts} />
    </div>
  )
}
