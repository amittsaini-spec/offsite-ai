"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Point = { label: string; gross: number; take: number };

const EMERALD = "#0f3d30";
const CORAL = "#df5b3b";
const LINE = "#e7ddca";
const MUTED = "#8e887c";

export default function RevenueChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: MUTED, fontSize: 12 }}
          axisLine={{ stroke: LINE }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: MUTED, fontSize: 12 }}
          axisLine={{ stroke: LINE }}
          tickLine={false}
          tickFormatter={(n: number) => (n >= 1000 ? `$${n / 1000}k` : `$${n}`)}
        />
        <Tooltip
          formatter={(value, name) => [
            `$${Number(value ?? 0).toLocaleString()}`,
            name === "gross" ? "Gross volume" : "Offsite take",
          ]}
          contentStyle={{ border: `1px solid ${LINE}`, borderRadius: 10, fontSize: 13 }}
          labelStyle={{ color: MUTED, fontWeight: 600 }}
        />
        <Line
          type="monotone"
          dataKey="gross"
          stroke={EMERALD}
          strokeWidth={2.5}
          dot={{ r: 3, fill: EMERALD }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="take"
          stroke={CORAL}
          strokeWidth={2}
          dot={{ r: 3, fill: CORAL }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
