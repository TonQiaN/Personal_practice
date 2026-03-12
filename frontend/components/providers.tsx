"use client";

import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useMemo } from "react";

function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === "dark" ? "#60a5fa" : "#0f766e",
          },
          secondary: {
            main: mode === "dark" ? "#5eead4" : "#1d4ed8",
          },
          background: {
            default: mode === "dark" ? "#07111f" : "#eef6ff",
            paper: mode === "dark" ? "#0e1b2d" : "#f8fbff",
          },
        },
        shape: {
          borderRadius: 20,
        },
        typography: {
          fontFamily: "var(--font-heading), sans-serif",
          h1: {
            fontWeight: 700,
            letterSpacing: "-0.04em",
          },
          h2: {
            fontWeight: 700,
            letterSpacing: "-0.03em",
          },
          h3: {
            fontWeight: 700,
          },
          button: {
            textTransform: "none",
            fontWeight: 600,
          },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 999,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                boxShadow: "none",
              },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <MuiThemeProvider>{children}</MuiThemeProvider>
      </NextThemesProvider>
    </AppRouterCacheProvider>
  );
}
