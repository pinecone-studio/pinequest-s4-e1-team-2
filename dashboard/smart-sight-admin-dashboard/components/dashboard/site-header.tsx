"use client"

import { usePathname } from "next/navigation"
import { Bell, Search } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { AlertBadge } from "@/components/dashboard/badges"

const titles: Record<string, string> = {
  "/": "Тойм",
  "/users": "Хэрэглэгчид",
  "/alerts": "Сэрэмжлүүлэг",
  "/sessions": "Сессүүд",
  "/settings": "Тохиргоо",
}

const notifications = [
  { id: 1, text: "Батбаярын Тэмүүлэн — ойролцоо машин илрүүлэв", sev: "ЯАРАЛТАЙ" as const, time: "2 мин" },
  { id: 2, text: "Шинэ хэрэглэгч бүртгүүлэв: Соёл А.", sev: "МЭДЭЭЛЭЛ" as const, time: "18 мин" },
  { id: 3, text: "Доржийн Сараа — гэрлэн дохио анхааруулга", sev: "АНХААРУУЛГА" as const, time: "44 мин" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const title = titles[pathname] ?? titles[`/${pathname.split("/")[1]}`] ?? "Тойм"

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h1 className="font-heading text-sm font-semibold tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <InputGroup className="hidden w-64 md:flex">
          <InputGroupInput placeholder="Хайх..." aria-label="Хайх" />
          <InputGroupAddon>
            <Search className="size-4 text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Мэдэгдэл" className="relative">
                <Bell />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Мэдэгдэл</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-2">
                  <div className="flex w-full items-center justify-between gap-2">
                    <AlertBadge severity={n.sev} />
                    <span className="font-mono text-xs text-muted-foreground">{n.time}</span>
                  </div>
                  <span className="text-sm text-foreground">{n.text}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Хэрэглэгчийн цэс">
                <UserAvatar name="Админ Энхээ" size="sm" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="grid leading-tight">
                <span className="text-sm font-medium">Админ Энхээ</span>
                <span className="text-xs font-normal text-muted-foreground">admin@smartsight.mn</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>Профайл</DropdownMenuItem>
              <DropdownMenuItem>Тохиргоо</DropdownMenuItem>
              <DropdownMenuItem>Гарах</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
