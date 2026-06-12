"use client"

import { Cell, Label, Pie, PieChart } from "recharts"
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

const data = [
  { name: "Android", value: 62, key: "android" },
  { name: "iOS", value: 38, key: "ios" },
]

const config = {
  value: { label: "Хэрэглэгч" },
  android: { label: "Android", color: "var(--chart-2)" },
  ios: { label: "iOS", color: "var(--chart-1)" },
} satisfies ChartConfig

export function DeviceSplitChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Төхөөрөмжийн хуваарилалт</CardTitle>
        <CardDescription>iOS ба Android</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer config={config} className="mx-auto aspect-square h-[180px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={80}
              strokeWidth={2}
              paddingAngle={2}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={`var(--color-${d.key})`} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground font-mono text-2xl font-semibold"
                        >
                          4,287
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          Нийт
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-6">
          {data.map((d) => (
            <div key={d.key} className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ background: `var(--color-${d.key})` }}
              />
              <span className="text-sm text-muted-foreground">{d.name}</span>
              <span className="font-mono text-sm font-medium tabular-nums">{d.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
