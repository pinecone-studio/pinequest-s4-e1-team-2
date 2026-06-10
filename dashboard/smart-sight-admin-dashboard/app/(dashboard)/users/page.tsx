import { StatsCard } from "@/components/dashboard/stats-card"
import { UsersTable } from "@/components/dashboard/users-table"
import { users } from "@/mock/data"
import { formatNumber } from "@/lib/format"
import { Users, UserCheck, Eye, Smartphone } from "lucide-react"

export default function UsersPage() {
  const active = users.filter((u) => u.status === "Active").length
  const fullyBlind = users.filter((u) => u.visionType === "БҮРЭН").length
  const android = users.filter((u) => u.device === "Android").length

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Нийт хэрэглэгч" value={formatNumber(users.length)} icon={Users} />
        <StatsCard label="Идэвхтэй" value={formatNumber(active)} icon={UserCheck} />
        <StatsCard label="Бүрэн хараагүй" value={formatNumber(fullyBlind)} icon={Eye} />
        <StatsCard label="Android хэрэглэгч" value={formatNumber(android)} icon={Smartphone} />
      </div>

      <UsersTable users={users} />
    </div>
  )
}
