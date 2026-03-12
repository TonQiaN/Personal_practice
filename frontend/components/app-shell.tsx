"use client";

import {
  Box,
  Chip,
  Drawer,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { BarChart3, BriefcaseBusiness, LayoutDashboard, MoonStar, Sparkles, SunMedium } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme as useNextTheme } from "next-themes";

const navItems = [
  { href: "/jds", label: "JD 管理", icon: BriefcaseBusiness },
  { href: "/match", label: "匹配工作台", icon: BarChart3 },
  { href: "/agents", label: "Agents", icon: Sparkles },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useNextTheme();
  const dark = resolvedTheme === "dark";

  return (
    <Tooltip title={dark ? "切换浅色模式" : "切换深色模式"}>
      <IconButton
        onClick={() => setTheme(dark ? "light" : "dark")}
        sx={{
          border: "1px solid var(--line)",
          bgcolor: "var(--surface)",
          backdropFilter: "blur(20px)",
        }}
      >
        {dark ? <SunMedium size={18} /> : <MoonStar size={18} />}
      </IconButton>
    </Tooltip>
  );
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <Stack className="h-full justify-between p-4">
      <Stack spacing={3}>
        <Link href="/" className="block">
          <Stack
            spacing={1.25}
            sx={{
              border: "1px solid var(--line)",
              bgcolor: "var(--surface)",
              boxShadow: "var(--shadow-soft)",
              backdropFilter: "blur(24px)",
              borderRadius: "28px",
              p: 2.5,
            }}
          >
            <Chip
              label="Product Home"
              size="small"
              sx={{ width: "fit-content", bgcolor: "var(--accent-soft)", color: "var(--accent-2)" }}
            />
            <Typography variant="subtitle2" sx={{ color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Resume Match Lab
            </Typography>
            <Typography variant="h6">Multi-Agent Hiring Demo</Typography>
            <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.7 }}>
              用更接近真实产品的后台工作台，处理岗位 intake、匹配执行和 Agent 解释。
            </Typography>
          </Stack>
        </Link>

        <Stack spacing={1}>
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link href={item.href} key={item.href}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: "18px",
                    border: "1px solid",
                    borderColor: active ? "var(--accent-border)" : "transparent",
                    bgcolor: active ? "var(--surface-overlay-strong)" : "transparent",
                    color: active ? "var(--ink)" : "var(--muted)",
                    boxShadow: active ? "var(--shadow-soft)" : "none",
                    transition: "all 160ms ease",
                    "&:hover": {
                      bgcolor: "var(--surface-overlay)",
                      color: "var(--ink)",
                    },
                  }}
                >
                  <Icon size={18} />
                  <Typography fontWeight={active ? 700 : 500}>{item.label}</Typography>
                </Stack>
              </Link>
            );
          })}
        </Stack>
      </Stack>

      <Stack
        spacing={1}
        sx={{
          border: "1px solid var(--line)",
          bgcolor: "var(--surface)",
          borderRadius: "24px",
          p: 2,
        }}
      >
        <Typography variant="overline" sx={{ color: "var(--muted)" }}>
          Demo Focus
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.7 }}>
          冷色双主题、产品展示首页、后台式内部页，Tailwind 负责布局，MUI 负责重组件。
        </Typography>
      </Stack>
    </Stack>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const isHome = pathname === "/";

  if (isHome) {
    return (
      <Box className="relative min-h-screen overflow-hidden">
        <Box className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.2),transparent_60%)]" />
        <Box className="absolute right-0 top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18),transparent_62%)] blur-3xl" />
        <Box className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 pb-10 pt-6 sm:px-8">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
            <Link href="/">
              <Stack spacing={0.5}>
                <Typography variant="overline" sx={{ color: "var(--muted)", letterSpacing: "0.16em" }}>
                  Resume Match Lab
                </Typography>
                <Typography variant="h6">Multi-Agent Hiring Demo</Typography>
              </Stack>
            </Link>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Chip label="Cold-tone product UI" size="small" sx={{ bgcolor: "var(--accent-soft)", color: "var(--accent-2)" }} />
              <ThemeToggle />
            </Stack>
          </Stack>
          <Box className="flex-1">{children}</Box>
        </Box>
      </Box>
    );
  }

  const drawerWidth = 296;

  return (
    <Box className="min-h-screen">
      <Box className="mx-auto flex min-h-screen max-w-[1600px] gap-5 px-4 py-4 sm:px-6">
        {desktop ? (
          <Drawer
            open
            variant="permanent"
            PaperProps={{
              sx: {
                position: "static",
                width: drawerWidth,
                border: "1px solid var(--line)",
                bgcolor: "transparent",
                backgroundImage: "none",
                boxShadow: "none",
              },
            }}
          >
            <SidebarContent pathname={pathname} />
          </Drawer>
        ) : null}

        <Box className="flex min-w-0 flex-1 flex-col">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              mb: 3,
              border: "1px solid var(--line)",
              bgcolor: "var(--surface)",
              boxShadow: "var(--shadow-soft)",
              backdropFilter: "blur(24px)",
              borderRadius: "28px",
              px: 3,
              py: 2,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              {!desktop ? <LayoutDashboard size={20} /> : null}
              <Box>
                <Typography variant="overline" sx={{ color: "var(--muted)", letterSpacing: "0.16em" }}>
                  Workspace
                </Typography>
                <Typography variant="h6">
                  {pathname === "/jds" ? "JD 管理" : pathname === "/match" ? "匹配工作台" : "Agents"}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Chip label="Tailwind + MUI" size="small" sx={{ bgcolor: "var(--accent-soft-2)", color: "var(--accent)" }} />
              <ThemeToggle />
            </Stack>
          </Stack>
          <Box className="min-w-0 flex-1">{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
