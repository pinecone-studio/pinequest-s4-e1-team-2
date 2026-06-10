import { cn } from "@/lib/utils"
import type { AlertSeverity, Device, UserStatus, VisionType } from "@/types"

const severityStyles: Record<AlertSeverity, { dot: string; text: string; bg: string }> = {
  ЯАРАЛТАЙ: { dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive/10" },
  АНХААРУУЛГА: { dot: "bg-warning", text: "text-warning", bg: "bg-warning/10" },
  МЭДЭЭЛЭЛ: { dot: "bg-success", text: "text-success", bg: "bg-success/10" },
}

export function AlertBadge({ severity }: { severity: AlertSeverity }) {
  const s = severityStyles[severity]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        s.bg,
        s.text,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {severity}
    </span>
  )
}

const visionStyles: Record<VisionType, string> = {
  БҮРЭН: "bg-destructive/10 text-destructive",
  ХАГАС: "bg-warning/10 text-warning",
  БУСАД: "bg-muted text-muted-foreground",
}

export function VisionBadge({ type }: { type: VisionType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        visionStyles[type],
      )}
    >
      {type}
    </span>
  )
}

export function DeviceBadge({ device }: { device: Device }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground">
      <span
        className={cn(
          "size-1.5 rounded-full",
          device === "iOS" ? "bg-foreground" : "bg-success",
        )}
        aria-hidden
      />
      {device}
    </span>
  )
}

export function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        status === "Active"
          ? "bg-success/10 text-success"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "Active" ? "bg-success" : "bg-muted-foreground/50",
        )}
        aria-hidden
      />
      {status === "Active" ? "Идэвхтэй" : "Идэвхгүй"}
    </span>
  )
}
