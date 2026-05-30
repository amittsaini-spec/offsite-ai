"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { STATUS_LABEL, type BookingStatus } from "@/lib/data";

type Counts = Record<BookingStatus, number>;

// Colors per status, drawn from our palette.
const COLORS: Record<BookingStatus, string> = {
  REQUESTED: "#c08a2e", // gold
  CONFIRMED: "#0f3d30", // emerald
  DEPOSIT_HELD: "#856306", // dark gold
  COMPLETED: "#1a5642", // emerald-2
  DECLINED: "#df5b3b", // coral
  CANCELLED: "#8e887c", // muted
};

export default function StatusBreakdown({ counts }: { counts: Counts }) {
  const data = (Object.keys(counts) as BookingStatus[])
    .map((s) => ({ name: STATUS_LABEL[s], status: s, value: counts[s] }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: "60px 0",
          textAlign: "center",
          color: "var(--muted)",
          fontSize: 13.5,
        }}
      >
        No bookings yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={84}
          paddingAngle={2}
          stroke="#fff"
        >
          {data.map((entry) => (
            <Cell key={entry.status} fill={COLORS[entry.status]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [String(value ?? 0), String(name ?? "")]}
          contentStyle={{ border: "1px solid #e7ddca", borderRadius: 10, fontSize: 13 }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value: string) => (
            <span style={{ color: "var(--ink-2)", fontSize: 12.5 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
