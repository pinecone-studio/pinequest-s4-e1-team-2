"use client"

import type { User } from "@/types"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { StatusBadge, VisionBadge, DeviceBadge } from "@/components/dashboard/badges"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { formatDateTime, formatNumber, relativeTime } from "@/lib/format"
import { alerts as allAlerts } from "@/mock/data"
import { AlertBadge } from "@/components/dashboard/badges"
import { MapPinIcon, ActivityIcon, PencilIcon } from "lucide-react"

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  )
}

export function UserDetailSheet({
  user,
  open,
  onOpenChange,
}: {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const recent = user ? allAlerts.filter((a) => a.userId === user.id).slice(0, 4) : []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {user && (
          <>
            <SheetHeader className="border-b p-5">
              <div className="flex items-center gap-3">
                <UserAvatar name={user.name} src={user.avatar} size="lg" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <SheetTitle className="truncate text-base">{user.name}</SheetTitle>
                  <SheetDescription className="truncate font-mono text-xs">
                    {user.email}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge status={user.status} />
                <VisionBadge type={user.visionType} />
                <DeviceBadge device={user.device} />
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-0 p-5">
              <DetailRow label="Хэрэглэгчийн ID" value={<span className="font-mono text-xs">{user.id}</span>} />
              <Separator />
              <DetailRow
                label="Хот"
                value={
                  <span className="flex items-center gap-1.5">
                    <MapPinIcon className="size-3.5 text-muted-foreground" />
                    {user.city}
                  </span>
                }
              />
              <Separator />
              <DetailRow
                label="Нийт сесс"
                value={<span className="font-mono">{formatNumber(user.totalSessions)}</span>}
              />
              <Separator />
              <DetailRow label="Бүртгүүлсэн" value={formatDateTime(user.joinedAt)} />
              <Separator />
              <DetailRow label="Сүүлд идэвхтэй" value={relativeTime(user.lastActive)} />
            </div>

            <div className="border-t px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <ActivityIcon className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Сүүлийн сэрэмжлүүлэг</h3>
              </div>
              <div className="flex flex-col gap-2">
                {recent.length === 0 && (
                  <p className="text-sm text-muted-foreground">Сэрэмжлүүлэг байхгүй.</p>
                )}
                {recent.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{a.object}</span>
                      <span className="truncate text-xs text-muted-foreground">{a.location}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <AlertBadge severity={a.severity} />
                      <span className="font-mono text-xs text-muted-foreground">
                        {relativeTime(a.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto flex gap-2 border-t p-5">
              <Button variant="outline" className="flex-1">
                <PencilIcon data-icon="inline-start" />
                Засах
              </Button>
              <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                Сесс үзэх
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
