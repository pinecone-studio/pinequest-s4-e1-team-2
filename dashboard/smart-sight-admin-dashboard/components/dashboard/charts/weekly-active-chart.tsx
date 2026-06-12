"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { weeklyActiveData } from "@/mock/data"

const config = {
  users: { label: "Идэвхтэй хэрэглэгч", color: "var(--chart-1)" },
  alerts: { label: "Сэрэмжлүүлэг", color: "var(--chart-2)" },
} satisfies ChartConfig

export function WeeklyActiveChart() {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Долоо хоногийн идэвх</CardTitle>
        <CardDescription>Идэвхтэй хэрэглэгч ба илрүүлсэн сэрэмжлүүлэг</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[260px] w-full">
          <AreaChart data={weeklyActiveData} margin={{ left: -12, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillAlerts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-alerts)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-alerts)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={44}
              className="font-mono text-xs"
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Area
              dataKey="alerts"
              type="monotone"
              fill="url(#fillAlerts)"
              stroke="var(--color-alerts)"
              strokeWidth={2}
            />
            <Area
              dataKey="users"
              type="monotone"
              fill="url(#fillUsers)"
              stroke="var(--color-users)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
