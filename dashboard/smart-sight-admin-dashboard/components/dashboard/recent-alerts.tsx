import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertBadge } from "@/components/dashboard/badges"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { relativeTime } from "@/lib/format"
import { alerts } from "@/mock/data"

export function RecentAlerts() {
  const recent = alerts.slice(0, 8)
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Сүүлийн сэрэмжлүүлэг</CardTitle>
        <CardDescription>Бодит цагийн илрүүлэлтийн урсгал</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Хэрэглэгч</TableHead>
              <TableHead>Зэрэглэл</TableHead>
              <TableHead>Объект</TableHead>
              <TableHead className="text-right">Зай</TableHead>
              <TableHead className="pr-6 text-right">Хугацаа</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="pl-6">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={a.userName} size="sm" />
                    <span className="truncate text-sm font-medium">{a.userName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <AlertBadge severity={a.severity} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.object}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {a.distance}м
                </TableCell>
                <TableCell className="pr-6 text-right font-mono text-xs text-muted-foreground">
                  {relativeTime(a.timestamp)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
