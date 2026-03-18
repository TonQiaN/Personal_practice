"use client";

import { Box, Chip, LinearProgress, Paper, Stack, Typography } from "@mui/material";

import type { DimensionScore } from "@/lib/types";

export function DimensionScoreList({
  scores,
  compact = false,
}: {
  scores: DimensionScore[];
  compact?: boolean;
}) {
  return (
    <Stack spacing={compact ? 1.5 : 2}>
      {scores.map((item) => (
        <Box key={item.name}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.8 }}>
            <Typography variant="body2" sx={{ color: "var(--muted)" }}>
              {item.name}
            </Typography>
            <Chip label={`${item.score}/${item.max_score}`} size="small" color="primary" />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min((item.score / Math.max(item.max_score, 1)) * 100, 100)}
            sx={{ height: compact ? 7 : 8, borderRadius: 999 }}
          />
          <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.7, mt: 0.9 }}>
            {item.note}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
