import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  label: string
  value: string
  change?: number
  icon: LucideIcon
  children?: React.ReactNode
  hint?: string
}

export function StatsCard({ label, value, change, icon: Icon, children, hint }: StatsCardProps) {
  const positive = (change ?? 0) >= 0
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </span>
            {change !== undefined ? (
              <span className="flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium tabular-nums",
                    positive ? "text-success" : "text-destructive",
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {Math.abs(change)}%
                </span>
                <span className="text-muted-foreground">{hint ?? "өмнөх 7 хоног"}</span>
              </span>
            ) : null}
          </div>
          {children ? <div className="h-12 w-24 shrink-0">{children}</div> : null}
        </div>
      </CardContent>
    </Card>
  )
}
