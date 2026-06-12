"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  TriangleAlert,
  Activity,
  Settings,
  Eye,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { UserAvatar } from "@/components/dashboard/user-avatar"

const navMain = [
  { title: "Тойм", titleEn: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Хэрэглэгчид", titleEn: "Users", url: "/users", icon: Users },
  { title: "Сэрэмжлүүлэг", titleEn: "Alerts", url: "/alerts", icon: TriangleAlert },
  { title: "Сессүүд", titleEn: "Sessions", url: "/sessions", icon: Activity },
  { title: "Тохиргоо", titleEn: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="flex aspect-square size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Eye className="size-5" />
          </div>
          <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-heading text-sm font-semibold tracking-tight">
              SmartSight
            </span>
            <span className="text-xs text-muted-foreground">Удирдлагын самбар</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Цэс</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => {
                const active =
                  item.url === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      render={
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <UserAvatar name="Админ Энхээ" size="sm" />
          <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">Админ Энхээ</span>
            <span className="truncate text-xs text-muted-foreground">
              admin@smartsight.mn
            </span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
