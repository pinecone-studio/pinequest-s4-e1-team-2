"use client"

import { useMemo, useState } from "react"
import type { Alert, AlertSeverity } from "@/types"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { AlertBadge } from "@/components/dashboard/badges"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { formatTime, relativeTime } from "@/lib/format"
import { SearchIcon, MapPinIcon } from "lucide-react"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"

export function AlertsFeed({ alerts }: { alerts: Alert[] }) {
  const [query, setQuery] = useState("")
  const [severity, setSeverity] = useState<AlertSeverity | "all">("all")
  const [range, setRange] = useState("all")

  const filtered = useMemo(() => {
    const now = new Date("2026-06-09T14:30:00").getTime()
    return alerts.filter((a) => {
      const matchesQuery =
        a.userName.toLowerCase().includes(query.toLowerCase()) ||
        a.object.toLowerCase().includes(query.toLowerCase()) ||
        a.location.toLowerCase().includes(query.toLowerCase())
      const matchesSeverity = severity === "all" || a.severity === severity
      let matchesRange = true
      if (range !== "all") {
        const hours = Number(range)
        matchesRange = now - new Date(a.timestamp).getTime() <= hours * 3_600_000
      }
      return matchesQuery && matchesSeverity && matchesRange
    })
  }, [alerts, query, severity, range])

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center xl:justify-between">
        <InputGroup className="xl:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Хэрэглэгч, объект, байршил..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            value={[severity]}
            onValueChange={(v) => setSeverity(((v[0] as AlertSeverity) ?? "all") as AlertSeverity | "all")}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="all">Бүгд</ToggleGroupItem>
            <ToggleGroupItem value="ЯАРАЛТАЙ">Яаралтай</ToggleGroupItem>
            <ToggleGroupItem value="АНХААРУУЛГА">Анхааруулга</ToggleGroupItem>
            <ToggleGroupItem value="МЭДЭЭЛЭЛ">Мэдээлэл</ToggleGroupItem>
          </ToggleGroup>

          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[130px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Бүх хугацаа</SelectItem>
                <SelectItem value="1">Сүүлийн 1 цаг</SelectItem>
                <SelectItem value="6">Сүүлийн 6 цаг</SelectItem>
                <SelectItem value="24">Сүүлийн 24 цаг</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Хугацаа</TableHead>
              <TableHead>Хэрэглэгч</TableHead>
              <TableHead>Зэрэглэл</TableHead>
              <TableHead>Объект</TableHead>
              <TableHead className="text-right">Зай</TableHead>
              <TableHead className="hidden lg:table-cell">Байршил</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">{formatTime(a.timestamp)}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(a.timestamp)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={a.userName} size="sm" />
                    <span className="truncate text-sm font-medium">{a.userName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <AlertBadge severity={a.severity} />
                </TableCell>
                <TableCell className="text-sm font-medium">{a.object}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {a.distance}м
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  <span className="flex items-center gap-1.5">
                    <MapPinIcon className="size-3.5 shrink-0" />
                    {a.location}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filtered.length === 0 && (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>Сэрэмжлүүлэг олдсонгүй</EmptyTitle>
              <EmptyDescription>Шүүлтүүрээ өөрчилж үзнэ үү.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </Card>
  )
}
