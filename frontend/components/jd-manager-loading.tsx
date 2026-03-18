"use client";

import { Box, Paper, Skeleton, Stack } from "@mui/material";

export function JDManagerLoading() {
  return (
    <main className="flex flex-col gap-6">
      <Paper
        elevation={0}
        sx={{
          borderRadius: "32px",
          border: "1px solid var(--line)",
          bgcolor: "var(--surface)",
          boxShadow: "var(--shadow-soft)",
          p: { xs: 3, md: 4 },
        }}
      >
        <Stack spacing={2}>
          <Skeleton variant="rounded" width={180} height={28} />
          <Skeleton variant="text" width="56%" height={70} />
          <Skeleton variant="text" width="80%" height={26} />
        </Stack>
      </Paper>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Paper
          elevation={0}
          sx={{
            borderRadius: "30px",
            border: "1px solid var(--line)",
            bgcolor: "var(--surface)",
            boxShadow: "var(--shadow-soft)",
            p: 3,
          }}
        >
          <Stack spacing={2.5}>
            <Skeleton variant="text" width={160} height={40} />
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={50} />
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: "30px",
            border: "1px solid var(--line)",
            bgcolor: "var(--surface)",
            boxShadow: "var(--shadow-soft)",
            p: 3,
          }}
        >
          <Stack spacing={2.5}>
            <Skeleton variant="text" width={140} height={40} />
            <Skeleton variant="rounded" height={220} />
          </Stack>
        </Paper>
      </div>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "30px",
          border: "1px solid var(--line)",
          bgcolor: "var(--surface)",
          boxShadow: "var(--shadow-soft)",
          p: 3,
        }}
      >
        <Box className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={148} />
          ))}
        </Box>
      </Paper>
    </main>
  );
}
