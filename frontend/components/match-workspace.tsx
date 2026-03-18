"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { ChevronDown, ChevronUp, FileSearch, Radar, Search, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";

import { DimensionScoreList } from "@/components/dimension-score-list";
import { fetchJobsFromApi, readCachedJobs } from "@/lib/job-cache";
import type { MatchResponse, PersistedJD } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const MatchSummaryChart = dynamic(
  () => import("@/components/match-summary-chart").then((mod) => mod.MatchSummaryChart),
  {
    ssr: false,
    loading: () => <Box sx={{ height: 300 }} />,
  },
);
const loadingSteps = [
  "Resume Parser Agent 正在解析简历 PDF",
  "Matching Agent 正在并行计算岗位分数",
  "Explanation Agent 正在生成匹配说明",
];

export function MatchWorkspace() {
  const [jobs, setJobs] = useState<PersistedJD[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState("");
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [expandedJobIds, setExpandedJobIds] = useState<string[]>([]);
  const [matchScope, setMatchScope] = useState<"all" | "manual">("all");
  const [matchMode, setMatchMode] = useState<"fast" | "full">("fast");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "preset" | "jd_pdf" | "manual">("all");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const cached = readCachedJobs();
    if (cached.length) {
      setJobs(cached);
    }

    void fetchJobsFromApi()
      .then((data: PersistedJD[]) => {
        setJobs(data);
      })
      .catch(() => setError("岗位列表加载失败。"));
  }, []);

  useEffect(() => {
    setSelectedJobIds((current) => {
      const availableIds = new Set(jobs.map((item) => item.job.id));
      if (!availableIds.size) {
        return [];
      }

      if (!current.length) {
        return jobs.map((item) => item.job.id);
      }

      const next = current.filter((item) => availableIds.has(item));
      return next.length ? next : jobs.map((item) => item.job.id);
    });
  }, [jobs]);

  useEffect(() => {
    if (!result) {
      setExpandedJobIds([]);
      return;
    }
    setExpandedJobIds(result.ranked_results.slice(0, 3).map((item) => item.job_id));
  }, [result]);

  useEffect(() => {
    if (!isPending) {
      setLoadingStepIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingStepIndex((current) => (current + 1) % loadingSteps.length);
    }, 1100);

    return () => window.clearInterval(timer);
  }, [isPending]);

  const chartData = useMemo(
    () =>
      result?.ranked_results.slice(0, 5).map((item) => ({
        name: item.job_title,
        score: item.total_score,
        recommendation: item.recommendation,
      })) ?? [],
    [result],
  );

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return jobs.filter((item) => {
      const matchesSource = sourceFilter === "all" ? true : item.source_type === sourceFilter;
      const matchesQuery = normalizedQuery
        ? [
            item.job.title,
            item.job.summary,
            ...item.job.must_have,
            ...item.job.nice_to_have,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        : true;
      return matchesSource && matchesQuery;
    });
  }, [jobs, searchQuery, sourceFilter]);

  const selectedJobs = useMemo(
    () => jobs.filter((item) => selectedJobIds.includes(item.job.id)),
    [jobs, selectedJobIds],
  );

  const toggleExpanded = (jobId: string) => {
    setExpandedJobIds((current) =>
      current.includes(jobId) ? current.filter((item) => item !== jobId) : [...current, jobId],
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resumeFile) {
      setError("请先上传一份简历 PDF。");
      return;
    }
    if (!jobs.length) {
      setError("当前没有可匹配的岗位。");
      return;
    }

    const activeJobIds =
      matchScope === "all" ? jobs.map((item) => item.job.id) : selectedJobIds;
    if (!activeJobIds.length) {
      setError("请至少选择一个岗位再开始匹配。");
      return;
    }

    setError("");
    setResult(null);
    setLoadingStepIndex(0);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("job_ids", JSON.stringify(activeJobIds));
      formData.append("match_mode", matchMode);

      const response = await fetch(`${API_BASE}/api/match`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        setError(payload.detail ?? "匹配失败，请稍后重试。");
        return;
      }

      const payload = (await response.json()) as MatchResponse;
      setResult(payload);
    });
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds((current) =>
      current.includes(jobId)
        ? current.filter((item) => item !== jobId)
        : [...current, jobId],
    );
  };

  const selectFilteredJobs = () => {
    const filteredIds = filteredJobs.map((item) => item.job.id);
    setSelectedJobIds((current) => Array.from(new Set([...current, ...filteredIds])));
  };

  const clearSelection = () => {
    setSelectedJobIds([]);
  };

  const rangeSummary =
    matchScope === "all" ? `全部 ${jobs.length} 条` : `手动选择 ${selectedJobIds.length} 条`;

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
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Stack spacing={2}>
            <Chip label="Match workspace" size="small" sx={{ width: "fit-content", bgcolor: "var(--accent-soft-2)", color: "var(--accent)" }} />
            <Typography variant="h2" sx={{ maxWidth: "15ch" }}>
              用更像招聘工作台的方式，比较一份简历和多条岗位。
            </Typography>
            <Typography variant="body1" sx={{ color: "var(--muted)", lineHeight: 1.9, maxWidth: "62ch" }}>
              这一页现在突出排名、总分、推荐结论，并用一个轻量图表先给出整体判断。详细的理由和风险收在可展开卡片里，避免信息一次性砸满屏幕。
            </Typography>
          </Stack>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            {[
              ["当前 JD 库", `${jobs.length} 条`],
              ["匹配方式", matchScope === "all" ? "默认全量匹配" : "手动选择岗位"],
              ["当前范围", rangeSummary],
              ["解释模式", matchMode === "fast" ? "快速匹配" : "全面匹配"],
            ].map(([label, value]) => (
              <Paper
                elevation={0}
                key={label}
                sx={{
                  borderRadius: "24px",
                  border: "1px solid var(--line)",
                  bgcolor: "var(--surface-strong)",
                  p: 2.5,
                }}
              >
                <Typography variant="overline" sx={{ color: "var(--muted)", letterSpacing: "0.14em" }}>
                  {label}
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </div>
        </div>
      </Paper>

      <form className="flex flex-col gap-6" onSubmit={submit}>
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
            <Stack direction="row" spacing={1.25} alignItems="center">
              <FileSearch size={18} />
              <Typography variant="h5">匹配输入</Typography>
            </Stack>

            <Button component="label" variant="outlined" sx={{ justifyContent: "flex-start", px: 2.2, py: 1.8 }}>
              {resumeFile ? resumeFile.name : "选择简历 PDF"}
              <input hidden accept="application/pdf" type="file" onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)} />
            </Button>

            <Paper
              elevation={0}
              sx={{
                borderRadius: "24px",
                border: "1px solid var(--line)",
                bgcolor: "var(--surface-strong)",
                p: 2.5,
              }}
            >
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">匹配速度模式</Typography>
                <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                  快速匹配只对 Top 3 生成详细 explanation，适合先筛一轮。全面匹配会对全部岗位生成完整 explanation，耗时更长但信息更完整。
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={matchMode}
                  onChange={(_, value: "fast" | "full" | null) => {
                    if (value) {
                      setMatchMode(value);
                    }
                  }}
                >
                  <ToggleButton value="fast">快速匹配</ToggleButton>
                  <ToggleButton value="full">全面匹配</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                borderRadius: "24px",
                border: "1px solid var(--line)",
                bgcolor: "var(--surface-strong)",
                p: 2.5,
              }}
            >
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={1.5}
                >
                  <Box>
                    <Typography variant="subtitle1">参与匹配的岗位</Typography>
                    <Typography variant="body2" sx={{ color: "var(--muted)", mt: 0.75, lineHeight: 1.8 }}>
                      默认会匹配当前岗位库中的全部岗位。如果你已经有明确目标，也可以切换到手动模式，只匹配一部分岗位。
                    </Typography>
                  </Box>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={matchScope}
                    onChange={(_, value: "all" | "manual" | null) => {
                      if (value) {
                        setMatchScope(value);
                      }
                    }}
                  >
                    <ToggleButton value="all">全部岗位</ToggleButton>
                    <ToggleButton value="manual">手动选择</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                {matchScope === "all" ? (
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label={`当前会匹配全部 ${jobs.length} 条岗位`} size="small" color="primary" />
                      <Chip label="切换到手动选择可精确筛选" size="small" variant="outlined" />
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {jobs.slice(0, 8).map((item) => (
                        <Chip key={item.job.id} label={item.job.title} size="small" variant="outlined" />
                      ))}
                      {jobs.length > 8 ? <Chip label={`+${jobs.length - 8} 条`} size="small" /> : null}
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                      <TextField
                        fullWidth
                        size="small"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="搜索岗位名称、摘要或技能关键词"
                        InputProps={{
                          startAdornment: <Search size={16} style={{ marginRight: 8 }} />,
                        }}
                      />
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={sourceFilter}
                        onChange={(_, value: "all" | "preset" | "jd_pdf" | "manual" | null) => {
                          if (value) {
                            setSourceFilter(value);
                          }
                        }}
                      >
                        <ToggleButton value="all">全部来源</ToggleButton>
                        <ToggleButton value="preset">预置</ToggleButton>
                        <ToggleButton value="jd_pdf">上传 JD</ToggleButton>
                        <ToggleButton value="manual">手动新增</ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>

                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                      spacing={1.5}
                    >
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={`已选 ${selectedJobIds.length} 条`} size="small" color="primary" />
                        <Chip label={`筛选结果 ${filteredJobs.length} 条`} size="small" variant="outlined" />
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button variant="outlined" size="small" onClick={selectFilteredJobs}>
                          全选当前筛选结果
                        </Button>
                        <Button variant="text" size="small" onClick={clearSelection}>
                          清空选择
                        </Button>
                      </Stack>
                    </Stack>

                    {selectedJobs.length ? (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {selectedJobs.map((item) => (
                          <Chip
                            key={`selected-${item.job.id}`}
                            label={item.job.title}
                            color="primary"
                            onDelete={() => toggleJobSelection(item.job.id)}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" sx={{ color: "var(--muted)" }}>
                        当前还没有选中岗位。你可以先搜索或筛选来源，再从下面的列表里加入。
                      </Typography>
                    )}

                    <div className="grid gap-3 md:grid-cols-2">
                      {filteredJobs.map((item) => {
                        const selected = selectedJobIds.includes(item.job.id);
                        return (
                          <Paper
                            key={item.job.id}
                            elevation={0}
                            onClick={() => toggleJobSelection(item.job.id)}
                            sx={{
                              cursor: "pointer",
                              borderRadius: "20px",
                              border: "1px solid",
                              borderColor: selected ? "var(--accent-border)" : "var(--line)",
                              bgcolor: selected ? "var(--surface-overlay-strong)" : "var(--surface)",
                              p: 2,
                              transition: "all 160ms ease",
                              "&:hover": {
                                borderColor: "var(--accent-border)",
                                transform: "translateY(-1px)",
                              },
                            }}
                          >
                            <Stack spacing={1.2}>
                              <Stack direction="row" justifyContent="space-between" spacing={1}>
                                <Typography variant="subtitle2">{item.job.title}</Typography>
                                <Chip
                                  label={selected ? "已加入" : "点击加入"}
                                  size="small"
                                  color={selected ? "primary" : "default"}
                                  variant={selected ? "filled" : "outlined"}
                                />
                              </Stack>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip
                                  label={
                                    item.source_type === "preset"
                                      ? "预置"
                                      : item.source_type === "jd_pdf"
                                        ? "上传 JD"
                                        : "手动新增"
                                  }
                                  size="small"
                                  variant="outlined"
                                />
                                <Chip label={`经验 ${item.job.min_years} 年`} size="small" variant="outlined" />
                              </Stack>
                              <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                                {item.job.summary}
                              </Typography>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </div>
                  </Stack>
                )}
              </Stack>
            </Paper>

            <Button
              variant="contained"
              type="submit"
              disabled={isPending}
              startIcon={isPending ? <CircularProgress color="inherit" size={16} /> : <Radar size={16} />}
              sx={{ py: 1.4 }}
            >
              {isPending ? "匹配中..." : "开始匹配"}
            </Button>
            {error ? <Alert severity="error">{error}</Alert> : null}
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
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5">结果概览</Typography>
              <Stack direction="row" spacing={1}>
                {result ? <Chip label={result.match_mode === "fast" ? "快速匹配" : "全面匹配"} size="small" color="primary" /> : null}
                {result ? <Chip label={`request_id: ${result.request_id.slice(0, 8)}`} size="small" /> : null}
              </Stack>
            </Stack>

            {isPending ? (
              <Paper
                elevation={0}
                sx={{
                  overflow: "hidden",
                  borderRadius: "28px",
                  border: "1px solid var(--line)",
                  bgcolor: "var(--surface-strong)",
                  p: 3,
                }}
              >
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                      sx={{
                        width: 54,
                        height: 54,
                        borderRadius: "18px",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "var(--accent-soft)",
                      }}
                    >
                      <Sparkles size={20} />
                    </Box>
                    <Box>
                      <Typography variant="overline" sx={{ color: "var(--muted)", letterSpacing: "0.16em" }}>
                        Matching in progress
                      </Typography>
                      <Typography variant="h6">{loadingSteps[loadingStepIndex]}</Typography>
                    </Box>
                  </Stack>
                  <LinearProgress />
                  <Stack spacing={1.2}>
                    {loadingSteps.map((step, index) => (
                      <Paper
                        elevation={0}
                        key={step}
                        sx={{
                          borderRadius: "18px",
                          border: "1px solid",
                          borderColor: index <= loadingStepIndex ? "var(--accent-border)" : "var(--line)",
                          bgcolor: index <= loadingStepIndex ? "var(--surface-overlay-strong)" : "transparent",
                          px: 2,
                          py: 1.6,
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Chip
                            label={`${index + 1}`}
                            size="small"
                            color={index <= loadingStepIndex ? "primary" : "default"}
                          />
                          <Typography variant="body2" sx={{ color: index <= loadingStepIndex ? "var(--ink)" : "var(--muted)" }}>
                            {step}
                          </Typography>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            ) : result ? (
              <>
                <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: "24px",
                      border: "1px solid var(--line)",
                      bgcolor: "var(--surface-strong)",
                      p: 2.5,
                    }}
                  >
                    <Stack spacing={2}>
                      <Typography variant="subtitle1">简历摘要</Typography>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Box>
                          <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                            工作年限
                          </Typography>
                          <Typography variant="h5">{result.resume_summary.years_of_experience} 年</Typography>
                        </Box>
                        <Box>
                          <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                            识别技能
                          </Typography>
                          <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                            {result.resume_summary.skills.slice(0, 6).join(" / ") || "暂无"}
                          </Typography>
                        </Box>
                      </div>
                    </Stack>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: "24px",
                      border: "1px solid var(--line)",
                      bgcolor: "var(--surface-strong)",
                      p: 2,
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                      spacing={1.5}
                      sx={{ mb: 1.5 }}
                    >
                      <Box>
                        <Typography variant="subtitle1">Top 5 总分概览</Typography>
                        <Typography variant="body2" sx={{ color: "var(--muted)" }}>
                          用横向条形图先看前 5 名岗位的分数分布，避免长岗位名被截断。
                        </Typography>
                      </Box>
                      <Chip
                        label={`Top 1：${result.ranked_results[0]?.job_title ?? "-"}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Stack>
                    <MatchSummaryChart data={chartData} />
                  </Paper>
                </div>

                <Stack spacing={2}>
                  {result.ranked_results.map((item, index) => {
                    const expanded = expandedJobIds.includes(item.job_id);

                    return (
                      <Paper
                        elevation={0}
                        key={item.job_id}
                        sx={{
                          borderRadius: "28px",
                          border: "1px solid",
                          borderColor: index < 3 ? "var(--accent-border)" : "var(--line)",
                          bgcolor: "var(--surface-strong)",
                          boxShadow: index < 3 ? "var(--shadow-soft)" : "none",
                          overflow: "hidden",
                        }}
                      >
                        <Stack spacing={0}>
                          <Stack
                            direction={{ xs: "column", md: "row" }}
                            justifyContent="space-between"
                            spacing={2}
                            sx={{ p: 2.5 }}
                          >
                            <Stack spacing={1}>
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Chip label={`#${index + 1}`} size="small" color={index < 3 ? "primary" : "default"} />
                                <Chip label={item.recommendation} size="small" variant="outlined" />
                              </Stack>
                              <Typography variant="h5">{item.job_title}</Typography>
                              <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                                {item.summary}
                              </Typography>
                            </Stack>

                            <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                              <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                                综合得分
                              </Typography>
                              <Typography variant="h2">{item.total_score}</Typography>
                              <Button
                                variant="text"
                                onClick={() => toggleExpanded(item.job_id)}
                                endIcon={expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                sx={{ px: 0 }}
                              >
                                {expanded ? "收起详情" : "展开详情"}
                              </Button>
                            </Stack>
                          </Stack>

                          <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <div className="grid gap-4 border-t border-[color:var(--line)] p-4 lg:grid-cols-[0.92fr_1.08fr]">
                              <Paper
                                elevation={0}
                                sx={{
                                  borderRadius: "22px",
                                  border: "1px solid var(--line)",
                                  bgcolor: "var(--surface-overlay)",
                                  p: 2,
                                }}
                              >
                                <Stack spacing={2}>
                                  <Typography variant="subtitle1">维度分数</Typography>
                                  <DimensionScoreList scores={item.dimension_scores} />
                                </Stack>
                              </Paper>

                              <Paper
                                elevation={0}
                                sx={{
                                  borderRadius: "22px",
                                  border: "1px solid var(--line)",
                                  bgcolor: "var(--surface-overlay)",
                                  p: 2,
                                }}
                              >
                                <Stack spacing={2}>
                                  <Typography variant="subtitle1">解释、风险与建议</Typography>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <Box>
                                      <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                                        合适的原因
                                      </Typography>
                                      <Stack component="ul" spacing={1} sx={{ pl: 2, mt: 1.2, mb: 0 }}>
                                        {item.explanation_details.fit_reasons.length ? (
                                          item.explanation_details.fit_reasons.map((reason, reasonIndex) => (
                                            <Typography
                                              component="li"
                                              key={`${item.job_id}-fit-${reasonIndex}`}
                                              variant="body2"
                                              sx={{ color: "var(--muted)", lineHeight: 1.8 }}
                                            >
                                              {reason}
                                            </Typography>
                                          ))
                                        ) : (
                                          <Typography component="li" variant="body2" sx={{ color: "var(--muted)" }}>
                                            当前没有额外匹配亮点。
                                          </Typography>
                                        )}
                                      </Stack>
                                    </Box>
                                    <Box>
                                      <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                                        风险提示
                                      </Typography>
                                      <Stack component="ul" spacing={1} sx={{ pl: 2, mt: 1.2, mb: 0 }}>
                                        {item.explanation_details.risk_reasons.length ? (
                                          item.explanation_details.risk_reasons.map((reason, reasonIndex) => (
                                            <Typography
                                              component="li"
                                              key={`${item.job_id}-risk-${reasonIndex}`}
                                              variant="body2"
                                              sx={{ color: "var(--muted)", lineHeight: 1.8 }}
                                            >
                                              {reason}
                                            </Typography>
                                          ))
                                        ) : (
                                          <Typography component="li" variant="body2" sx={{ color: "var(--muted)" }}>
                                            当前没有明显硬门槛风险。
                                          </Typography>
                                        )}
                                      </Stack>
                                    </Box>
                                  </div>
                                  <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                                    <Box>
                                      <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                                        建议追问
                                      </Typography>
                                      <Stack component="ul" spacing={1} sx={{ pl: 2, mt: 1.2, mb: 0 }}>
                                        {item.explanation_details.follow_up_questions.length ? (
                                          item.explanation_details.follow_up_questions.map((question, questionIndex) => (
                                            <Typography
                                              component="li"
                                              key={`${item.job_id}-follow-up-${questionIndex}`}
                                              variant="body2"
                                              sx={{ color: "var(--muted)", lineHeight: 1.8 }}
                                            >
                                              {question}
                                            </Typography>
                                          ))
                                        ) : (
                                          <Typography component="li" variant="body2" sx={{ color: "var(--muted)" }}>
                                            当前没有额外建议追问。
                                          </Typography>
                                        )}
                                      </Stack>
                                    </Box>
                                    <Paper
                                      elevation={0}
                                      sx={{
                                        borderRadius: "18px",
                                        border: "1px solid var(--line)",
                                        bgcolor: "var(--accent-tint)",
                                        p: 2,
                                      }}
                                    >
                                      <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                                        建议下一步动作
                                      </Typography>
                                      <Typography variant="body2" sx={{ mt: 1, color: "var(--ink)", lineHeight: 1.8 }}>
                                        {item.explanation_details.action_recommendation || "建议结合总分和关键风险，再决定是否推进面试。"}
                                      </Typography>
                                    </Paper>
                                  </div>
                                </Stack>
                              </Paper>
                            </div>
                          </Collapse>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>

                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "24px",
                    border: "1px solid var(--line)",
                    bgcolor: "var(--surface-strong)",
                    p: 2.5,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                    运行追踪
                  </Typography>
                  <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "var(--font-mono), monospace" }}>
                    request_id: {result.request_id}
                    {"\n"}
                    {JSON.stringify(result.trace, null, 2)}
                  </Typography>
                </Paper>
              </>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  minHeight: 420,
                  borderRadius: "28px",
                  border: "1px dashed var(--line-strong)",
                  bgcolor: "var(--surface-overlay)",
                  display: "grid",
                  placeItems: "center",
                  p: 4,
                }}
              >
                <Typography variant="body1" sx={{ color: "var(--muted)", textAlign: "center", lineHeight: 1.9, maxWidth: "34ch" }}>
                  选择岗位并上传简历后，这里会先给出一个总分概览，再按 Top 3 优先展开详细结论。
                </Typography>
              </Paper>
            )}
          </Stack>
        </Paper>
      </form>
    </main>
  );
}
