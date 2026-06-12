import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

const colorClasses = [
  "bg-accent/15 text-accent",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-destructive/15 text-destructive",
]

function colorFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return colorClasses[h % colorClasses.length]
}

export function UserAvatar({
  name,
  src,
  size = "default",
  className,
}: {
  name: string
  src?: string
  size?: "default" | "sm" | "lg"
  className?: string
}) {
  return (
    <Avatar size={size} className={className}>
      {src ? <AvatarImage src={src || "/placeholder.svg"} alt={name} /> : null}
      <AvatarFallback className={cn("text-xs font-semibold", colorFor(name))}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
