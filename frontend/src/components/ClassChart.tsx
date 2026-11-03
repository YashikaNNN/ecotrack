"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MATERIAL_COLOR } from "@/lib/format";
import type { ClassCount } from "@/lib/types";

export function ClassChart({ rows }: { rows: ClassCount[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[280px] border border-line bg-paper-2" />;
  }

  return (
    <div className="h-[280px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#ddd4c4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#5c6556", fontSize: 12 }}
            axisLine={{ stroke: "#ddd4c4" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#5c6556", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: "#f3efe6" }}
            formatter={(value) => [String(value), "Accepted scans"]}
          />
          <Bar dataKey="count" name="Accepted scans" radius={[2, 2, 0, 0]}>
            {rows.map((row) => (
              <Cell key={row.key} fill={MATERIAL_COLOR[row.key] ?? "#245c40"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
