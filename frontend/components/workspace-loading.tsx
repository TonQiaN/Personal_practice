"use client";

import { Box, Paper, Skeleton, Stack } from "@mui/material";

export function WorkspaceLoading() {
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
          <Skeleton variant="rounded" width={140} height={28} />
          <Skeleton variant="text" width="62%" height={72} />
          <Skeleton variant="text" width="85%" height={28} />
        </Stack>
      </Paper>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
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
            <Skeleton variant="text" width={180} height={40} />
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={120} />
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
            <Skeleton variant="text" width={160} height={40} />
            <Skeleton variant="rounded" height={180} />
            <Box className="grid gap-3">
              <Skeleton variant="rounded" height={88} />
              <Skeleton variant="rounded" height={88} />
              <Skeleton variant="rounded" height={88} />
            </Box>
          </Stack>
        </Paper>
      </div>
    </main>
  );
}
