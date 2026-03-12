import { ArrowRight, BriefcaseBusiness, Database, Radar } from "lucide-react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";

const cards = [
  {
    title: "岗位内容管理",
    copy: "先把 JD PDF 变成可确认、可存档、可复用的岗位资产，再进入匹配流程。",
    href: "/jds",
    icon: BriefcaseBusiness,
  },
  {
    title: "匹配工作台",
    copy: "选择多个岗位，上传一份简历，直接比较总分、推荐结论和核心风险。",
    href: "/match",
    icon: Radar,
  },
  {
    title: "Agent 架构",
    copy: "把简历解析、JD intake、匹配和解释拆开，前端也能更清楚地展示各阶段能力。",
    href: "/agents",
    icon: Database,
  },
];

export default function Home() {
  return (
    <main className="flex flex-col gap-6">
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "36px",
          border: "1px solid var(--line)",
          bgcolor: "var(--surface)",
          boxShadow: "var(--shadow-strong)",
          px: { xs: 3, md: 5 },
          py: { xs: 4, md: 5 },
        }}
      >
        <Box className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_50%)] lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <Stack spacing={2.5}>
            <Chip
              label="Modern product homepage"
              size="small"
              sx={{ width: "fit-content", bgcolor: "var(--accent-soft)", color: "var(--accent-2)" }}
            />
            <Typography variant="h1" sx={{ fontSize: { xs: "3rem", md: "5.4rem" }, lineHeight: 0.92, maxWidth: "11ch" }}>
              把招聘匹配 Demo 做成真正像产品的前端。
            </Typography>
            <Typography variant="body1" sx={{ color: "var(--muted)", lineHeight: 1.9, maxWidth: "58ch" }}>
              这套界面不再只是开发表单，而是清楚地区分岗位内容管理、匹配执行和 Agent 架构说明。首页负责建立产品感，内部页负责承载工作台。
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button component={Link} href="/match" variant="contained" endIcon={<ArrowRight size={16} />} sx={{ px: 3, py: 1.4 }}>
                打开匹配工作台
              </Button>
              <Button component={Link} href="/jds" variant="outlined" sx={{ px: 3, py: 1.4 }}>
                先准备岗位
              </Button>
            </Stack>
          </Stack>

          <div className="grid gap-4">
            {[
              ["体验结构", "产品介绍首页 + 左侧导航工作台"],
              ["主题系统", "冷色双模式 + 品牌化字体"],
              ["信息重点", "排名、总分、推荐结论、轻量图表"],
            ].map(([label, value]) => (
              <Paper
                elevation={0}
                key={label}
                sx={{
                  borderRadius: "28px",
                  border: "1px solid var(--line)",
                  bgcolor: "var(--surface-strong)",
                  p: 3,
                  boxShadow: "var(--shadow-soft)",
                }}
              >
                <Typography variant="overline" sx={{ color: "var(--muted)", letterSpacing: "0.14em" }}>
                  {label}
                </Typography>
                <Typography variant="h6" sx={{ mt: 1, maxWidth: "16ch" }}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </div>
        </div>
      </Paper>

      <div className="grid gap-5 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Paper
              elevation={0}
              key={card.title}
              sx={{
                borderRadius: "30px",
                border: "1px solid var(--line)",
                bgcolor: "var(--surface)",
                boxShadow: "var(--shadow-soft)",
                p: 3.5,
              }}
            >
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "18px",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "var(--accent-soft)",
                    color: "var(--accent-2)",
                  }}
                >
                  <Icon size={22} />
                </Box>
                <Typography variant="h5">{card.title}</Typography>
                <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.85 }}>
                  {card.copy}
                </Typography>
                <Button component={Link} href={card.href} variant="text" sx={{ width: "fit-content", px: 0 }}>
                  进入页面
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </div>
    </main>
  );
}
