"use client"

import { useMemo, useState } from "react"
import type { User, UserStatus, Device, VisionType } from "@/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { StatusBadge, VisionBadge, DeviceBadge } from "@/components/dashboard/badges"
import { UserDetailSheet } from "@/components/dashboard/user-detail-sheet"
import { formatNumber, relativeTime } from "@/lib/format"
import { toast } from "sonner"
import {
  SearchIcon,
  DownloadIcon,
  ArrowUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"

type SortKey = "name" | "totalSessions" | "lastActive"

const PAGE_SIZE = 8

export function UsersTable({ users }: { users: User[] }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<UserStatus | "all">("all")
  const [vision, setVision] = useState<VisionType | "all">("all")
  const [device, setDevice] = useState<Device | "all">("all")
  const [sortKey, setSortKey] = useState<SortKey>("totalSessions")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<User | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const filtered = useMemo(() => {
    const result = users.filter((u) => {
      const matchesQuery =
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = status === "all" || u.status === status
      const matchesVision = vision === "all" || u.visionType === vision
      const matchesDevice = device === "all" || u.device === device
      return matchesQuery && matchesStatus && matchesVision && matchesDevice
    })

    result.sort((a, b) => {
      let cmp = 0
      if (sortKey === "name") cmp = a.name.localeCompare(b.name)
      else if (sortKey === "lastActive")
        cmp = new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime()
      else cmp = a.totalSessions - b.totalSessions
      return sortDir === "asc" ? cmp : -cmp
    })
    return result
  }, [users, query, status, vision, device, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  function exportCsv() {
    const headers = ["Name", "Email", "VisionType", "Device", "Status", "City", "Sessions", "LastActive"]
    const rows = filtered.map((u) => [
      u.name,
      u.email,
      u.visionType,
      u.device,
      u.status,
      u.city,
      u.totalSessions,
      u.lastActive,
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "smartsight-users.csv"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("CSV экспорт амжилттай", { description: `${filtered.length} хэрэглэгч татагдлаа.` })
  }

  function openUser(user: User) {
    setSelected(user)
    setSheetOpen(true)
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center xl:justify-between">
        <InputGroup className="xl:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Нэр, имэйлээр хайх..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </InputGroup>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as UserStatus | "all")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[120px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Бүх төлөв</SelectItem>
                <SelectItem value="Active">Идэвхтэй</SelectItem>
                <SelectItem value="Inactive">Идэвхгүй</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={vision}
            onValueChange={(v) => {
              setVision(v as VisionType | "all")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[120px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Бүх хараа</SelectItem>
                <SelectItem value="БҮРЭН">БҮРЭН</SelectItem>
                <SelectItem value="ХАГАС">ХАГАС</SelectItem>
                <SelectItem value="БУСАД">БУСАД</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={device}
            onValueChange={(v) => {
              setDevice(v as Device | "all")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[120px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Бүх төхөөрөмж</SelectItem>
                <SelectItem value="iOS">iOS</SelectItem>
                <SelectItem value="Android">Android</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={exportCsv}>
            <DownloadIcon data-icon="inline-start" />
            CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("name")}
                >
                  Хэрэглэгч <ArrowUpDownIcon className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="hidden md:table-cell">Хараа</TableHead>
              <TableHead className="hidden lg:table-cell">Төхөөрөмж</TableHead>
              <TableHead>Төлөв</TableHead>
              <TableHead className="text-right">
                <button
                  className="ml-auto flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("totalSessions")}
                >
                  Сесс <ArrowUpDownIcon className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="text-right">Сүүлд идэвхтэй</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((user) => (
              <TableRow
                key={user.id}
                className="cursor-pointer"
                onClick={() => openUser(user)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.name} src={user.avatar} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <VisionBadge type={user.visionType} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <DeviceBadge device={user.device} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.status} />
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {formatNumber(user.totalSessions)}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {relativeTime(user.lastActive)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontalIcon />
                          <span className="sr-only">Үйлдэл</span>
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => openUser(user)}>
                          <EyeIcon data-icon="inline-start" />
                          Дэлгэрэнгүй
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast("Засварлах горим удахгүй нэмэгдэнэ")}
                        >
                          <PencilIcon data-icon="inline-start" />
                          Засах
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            toast.error("Хэрэглэгч устгах", {
                              description: `${user.name} устгахаар сонгогдлоо (demo).`,
                            })
                          }
                        >
                          <Trash2Icon data-icon="inline-start" />
                          Устгах
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {paged.length === 0 && (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>Хэрэглэгч олдсонгүй</EmptyTitle>
              <EmptyDescription>Хайлт эсвэл шүүлтүүрээ өөрчилнө үү.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t p-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          {filtered.length}-ээс {paged.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
          {(currentPage - 1) * PAGE_SIZE + paged.length} харуулж байна
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeftIcon data-icon="inline-start" />
                Өмнөх
              </Button>
            </PaginationItem>
            <span className="px-2 text-sm text-muted-foreground tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Дараах
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <UserDetailSheet user={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </Card>
  )
}
