"use client"

import { useState } from "react"
import type { Session } from "@/types"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { DeviceBadge, AlertBadge } from "@/components/dashboard/badges"
import { formatDateTime, relativeTime } from "@/lib/format"
import { ClockIcon, ZapIcon } from "lucide-react"

function severityDot(sev: Session["detections"][number]["severity"]) {
  if (sev === "ЯАРАЛТАЙ") return "bg-destructive"
  if (sev === "АНХААРУУЛГА") return "bg-warning"
  return "bg-success"
}

export function SessionsTable({ sessions }: { sessions: Session[] }) {
  const [selected, setSelected] = useState<Session | null>(null)
  const [open, setOpen] = useState(false)

  function openSession(s: Session) {
    setSelected(s)
    setOpen(true)
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Хэрэглэгч</TableHead>
              <TableHead>Эхэлсэн</TableHead>
              <TableHead className="text-right">Үргэлжилсэн</TableHead>
              <TableHead className="text-right">Сэрэмжлүүлэг</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Төхөөрөмж</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => openSession(s)}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={s.userName} size="sm" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{s.userName}</span>
                      <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {relativeTime(s.startTime)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {s.durationMin} мин
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {s.alertsCount}
                </TableCell>
                <TableCell className="hidden text-right sm:table-cell">
                  <span className="inline-flex">
                    <DeviceBadge device={s.device} />
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="border-b p-5">
                <div className="flex items-center gap-3">
                  <UserAvatar name={selected.userName} size="lg" />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <SheetTitle className="truncate text-base">{selected.userName}</SheetTitle>
                    <SheetDescription className="font-mono text-xs">
                      {selected.id}
                    </SheetDescription>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="rounded-md border bg-muted/40 p-2.5">
                    <p className="text-xs text-muted-foreground">Эхэлсэн</p>
                    <p className="mt-0.5 flex items-center gap-1 text-sm font-medium">
                      <ClockIcon className="size-3.5 text-muted-foreground" />
                      {relativeTime(selected.startTime)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/40 p-2.5">
                    <p className="text-xs text-muted-foreground">Хугацаа</p>
                    <p className="mt-0.5 font-mono text-sm font-medium">{selected.durationMin}м</p>
                  </div>
                  <div className="rounded-md border bg-muted/40 p-2.5">
                    <p className="text-xs text-muted-foreground">Дохио</p>
                    <p className="mt-0.5 flex items-center gap-1 font-mono text-sm font-medium">
                      <ZapIcon className="size-3.5 text-muted-foreground" />
                      {selected.alertsCount}
                    </p>
                  </div>
                </div>
                <p className="pt-1 font-mono text-xs text-muted-foreground">
                  {formatDateTime(selected.startTime)}
                </p>
              </SheetHeader>

              <div className="p-5">
                <h3 className="mb-4 text-sm font-medium">Илрүүлэлтийн дараалал</h3>
                <ol className="relative flex flex-col gap-0 border-l border-border pl-5">
                  {selected.detections.map((d, i) => (
                    <li key={i} className="relative pb-5 last:pb-0">
                      <span
                        className={`absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-background ${severityDot(d.severity)}`}
                        aria-hidden
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{d.time}</span>
                        <AlertBadge severity={d.severity} />
                      </div>
                      <p className="mt-1 text-sm font-medium">{d.object}</p>
                      <p className="font-mono text-xs text-muted-foreground">{d.distance}м зайд</p>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  )
}
