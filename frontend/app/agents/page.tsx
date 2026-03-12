import { Cpu, FileSearch, ListOrdered, Sparkles, UserRoundSearch } from "lucide-react";
import { Chip, Paper, Stack, Typography } from "@mui/material";

const agents = [
  {
    name: "Resume Parser Agent",
    summary: "负责把简历 PDF 变成结构化候选人画像，供后续打分使用。",
    icon: UserRoundSearch,
  },
  {
    name: "JD PDF Agent",
    summary: "负责把用户上传的岗位 PDF 提取为可确认、可持久化的 JD 草稿。",
    icon: FileSearch,
  },
  {
    name: "Matching Agent",
    summary: "负责按维度并行比较简历和岗位，输出分数与硬门槛风险。",
    icon: Cpu,
  },
  {
    name: "Ranking Agent",
    summary: "负责多岗位排序、推荐结论与 Top 3 高亮。",
    icon: ListOrdered,
  },
  {
    name: "Explanation Agent",
    summary: "负责把结构化结果翻译成 HR 易读的中文说明。",
    icon: Sparkles,
  },
];

export default function AgentsPage() {
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
          <Chip label="Agents overview" size="small" sx={{ width: "fit-content", bgcolor: "var(--accent-soft-2)", color: "var(--accent)" }} />
          <Typography variant="h2" sx={{ maxWidth: "15ch" }}>
            这不是一个大模型黑盒，而是一条可拆解、可审查的多 Agent 链路。
          </Typography>
          <Typography variant="body1" sx={{ color: "var(--muted)", lineHeight: 1.9, maxWidth: "66ch" }}>
            前端现在把 Agent 结构单独放到一个页面里，让演示对象能快速理解：哪些步骤是解析，哪些是匹配，哪些是解释，而不是只看到一个输入框和一个分数。
          </Typography>
        </Stack>
      </Paper>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const Icon = agent.icon;

          return (
            <Paper
              elevation={0}
              key={agent.name}
              sx={{
                borderRadius: "28px",
                border: "1px solid var(--line)",
                bgcolor: "var(--surface)",
                boxShadow: "var(--shadow-soft)",
                p: 3,
              }}
            >
              <Stack spacing={2.5}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{
                    width: "fit-content",
                    borderRadius: "18px",
                    bgcolor: "var(--accent-soft)",
                    color: "var(--accent-2)",
                    px: 1.5,
                    py: 1.2,
                  }}
                >
                  <Icon size={18} />
                  <Typography variant="body2" fontWeight={700}>
                    Agent
                  </Typography>
                </Stack>
                <Typography variant="h5">{agent.name}</Typography>
                <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.85 }}>
                  {agent.summary}
                </Typography>
              </Stack>
            </Paper>
          );
        })}
      </div>
    </main>
  );
}
