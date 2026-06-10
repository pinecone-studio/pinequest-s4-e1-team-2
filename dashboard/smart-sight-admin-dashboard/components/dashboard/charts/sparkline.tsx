"use client"

import { Area, AreaChart } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { activeTodaySparkline } from "@/mock/data"

const config = {
  v: { label: "Идэвхтэй", color: "var(--chart-1)" },
} satisfies ChartConfig

export function Sparkline() {
  return (
    <ChartContainer config={config} className="h-12 w-full">
      <AreaChart data={activeTodaySparkline} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <defs>
          <linearGradient id="fillSpark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-v)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--color-v)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          dataKey="v"
          type="monotone"
          stroke="var(--color-v)"
          strokeWidth={1.75}
          fill="url(#fillSpark)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
