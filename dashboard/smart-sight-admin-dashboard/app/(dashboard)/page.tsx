import { Users, Activity, TriangleAlert, Clock } from "lucide-react"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Sparkline } from "@/components/dashboard/charts/sparkline"
import { WeeklyActiveChart } from "@/components/dashboard/charts/weekly-active-chart"
import { DeviceSplitChart } from "@/components/dashboard/charts/device-split-chart"
import { RecentAlerts } from "@/components/dashboard/recent-alerts"
import { TopUsers } from "@/components/dashboard/top-users"
import { formatNumber } from "@/lib/format"
import { kpis } from "@/mock/data"

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Нийт хэрэглэгч"
          value={formatNumber(kpis.totalUsers)}
          change={kpis.totalUsersChange}
          icon={Users}
        />
        <StatsCard
          label="Өнөөдөр идэвхтэй"
          value={formatNumber(kpis.activeToday)}
          change={kpis.activeTodayChange}
          icon={Activity}
        >
          <Sparkline />
        </StatsCard>
        <StatsCard
          label="Илрүүлсэн сэрэмжлүүлэг"
          value={formatNumber(kpis.totalAlerts)}
          change={kpis.totalAlertsChange}
          icon={TriangleAlert}
        />
        <StatsCard
          label="Дундаж сессийн хугацаа"
          value={`${kpis.avgSessionMin} мин`}
          change={kpis.avgSessionChange}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WeeklyActiveChart />
        <DeviceSplitChart />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentAlerts />
        <TopUsers />
      </div>
    </div>
  )
}
