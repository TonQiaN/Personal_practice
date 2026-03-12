"use client";

import { Box } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartDatum = {
  name: string;
  score: number;
  recommendation: "推荐" | "可考虑" | "不推荐";
};

export function MatchSummaryChart({ data }: { data: ChartDatum[] }) {
  return (
    <Box sx={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
          <XAxis type="number" tickLine={false} axisLine={false} domain={[0, 100]} />
          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} interval={0} />
          <RechartsTooltip />
          <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={22}>
            {data.map((entry) => (
              <Cell
                key={`${entry.name}-${entry.score}`}
                fill={
                  entry.recommendation === "推荐"
                    ? "var(--chart-primary)"
                    : entry.recommendation === "可考虑"
                      ? "var(--chart-secondary)"
                      : "var(--chart-muted)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
