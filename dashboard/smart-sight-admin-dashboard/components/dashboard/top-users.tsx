import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { DeviceBadge } from "@/components/dashboard/badges"
import { formatNumber } from "@/lib/format"
import { topUsers } from "@/mock/data"

export function TopUsers() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Хамгийн идэвхтэй</CardTitle>
        <CardDescription>Шилдэг 5 хэрэглэгч</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {topUsers.map((u, i) => (
          <div
            key={u.id}
            className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
          >
            <span className="w-4 text-center font-mono text-xs text-muted-foreground">
              {i + 1}
            </span>
            <UserAvatar name={u.name} size="sm" />
            <div className="grid flex-1 leading-tight">
              <span className="truncate text-sm font-medium">{u.name}</span>
              <span className="truncate text-xs text-muted-foreground">{u.city}</span>
            </div>
            <DeviceBadge device={u.device} />
            <span className="w-12 text-right font-mono text-sm font-medium tabular-nums">
              {formatNumber(u.totalSessions)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
