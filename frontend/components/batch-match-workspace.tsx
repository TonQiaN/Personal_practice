"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { BriefcaseBusiness, ChevronDown, ChevronUp, Files, Radar, Search, UsersRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";

import { DimensionScoreList } from "@/components/dimension-score-list";
import { fetchJobsFromApi, readCachedJobs } from "@/lib/job-cache";
import type { BatchMatchResponse, MatchResult, PersistedJD } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export function BatchMatchWorkspace() {
  const [jobs, setJobs] = useState<PersistedJD[]>([]);
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [task, setTask] = useState<BatchMatchResponse | null>(null);
  const [error, setError] = useState("");
  const [matchScope, setMatchScope] = useState<"all" | "manual">("all");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "preset" | "jd_pdf" | "manual">("all");
  const [viewMode, setViewMode] = useState<"resume" | "job">("resume");
  const [matchMode, setMatchMode] = useState<"fast" | "full">("fast");
  const [expandedResumeIds, setExpandedResumeIds] = useState<string[]>([]);
  const [detailTarget, setDetailTarget] = useState<{ resumeId: string; jobId: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const cached = readCachedJobs();
    if (cached.length) {
      setJobs(cached);
    }

    void fetchJobsFromApi()
      .then((data) => setJobs(data))
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
    if (!task || !["queued", "processing"].includes(task.status)) {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await fetch(`${API_BASE}/api/batch-match/${task.task_id}`);
      if (!response.ok) {
        setError("批量任务状态查询失败。");
        window.clearInterval(timer);
        return;
      }
      const payload = (await response.json()) as BatchMatchResponse;
      setTask(payload);
      if (!["queued", "processing"].includes(payload.status)) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [task]);

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

  const activeJobIds =
    matchScope === "all" ? jobs.map((item) => item.job.id) : selectedJobIds;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resumeFiles.length) {
      setError("请至少上传一份简历 PDF。");
      return;
    }
    if (!activeJobIds.length) {
      setError("请至少选择一个岗位。");
      return;
    }

    setError("");
    setTask(null);
    startTransition(async () => {
      const formData = new FormData();
      resumeFiles.forEach((file) => formData.append("resumes", file));
      formData.append("job_ids", JSON.stringify(activeJobIds));
      formData.append("match_mode", matchMode);

      const response = await fetch(`${API_BASE}/api/batch-match`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        setError(payload.detail ?? "批量匹配启动失败。");
        return;
      }

      const payload = (await response.json()) as BatchMatchResponse;
      setTask(payload);
    });
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds((current) =>
      current.includes(jobId)
        ? current.filter((item) => item !== jobId)
        : [...current, jobId],
    );
  };

  const progressValue = task?.total_resumes
    ? (task.completed_resumes / task.total_resumes) * 100
    : 0;

  const detailContext = useMemo(() => {
    if (!task || !detailTarget) {
      return null;
    }
    const resumeResult = task.resume_results.find((item) => item.resume_id === detailTarget.resumeId);
    const match = resumeResult?.full_result?.ranked_results.find((item) => item.job_id === detailTarget.jobId);
    if (!resumeResult || !match) {
      return null;
    }
    return {
      filename: resumeResult.filename,
      match,
    };
  }, [detailTarget, task]);

  const toggleResumeExpanded = (resumeId: string) => {
    setExpandedResumeIds((current) =>
      current.includes(resumeId)
        ? current.filter((item) => item !== resumeId)
        : [...current, resumeId],
    );
  };

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
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Stack spacing={2}>
            <Chip label="Batch match" size="small" sx={{ width: "fit-content", bgcolor: "var(--accent-soft-2)", color: "var(--accent)" }} />
            <Typography variant="h2" sx={{ maxWidth: "16ch" }}>
              一次上传多份简历，再从两个视角看匹配结果。
            </Typography>
            <Typography variant="body1" sx={{ color: "var(--muted)", lineHeight: 1.9, maxWidth: "62ch" }}>
              这个页面适合做批量筛选。你可以直接看“每份简历的 Top 3 岗位”，也可以切到“每个岗位的 Top 3 候选人”视角。
            </Typography>
          </Stack>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            {[
              ["简历数量", `${resumeFiles.length} 份`],
              ["岗位范围", matchScope === "all" ? `全部 ${jobs.length} 条` : `已选 ${selectedJobIds.length} 条`],
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
              <Files size={18} />
              <Typography variant="h5">批量匹配输入</Typography>
            </Stack>

            <Button component="label" variant="outlined" sx={{ justifyContent: "flex-start", px: 2.2, py: 1.8 }}>
              {resumeFiles.length ? `已选择 ${resumeFiles.length} 份简历` : "选择多份简历 PDF"}
              <input
                hidden
                accept="application/pdf"
                multiple
                type="file"
                onChange={(event) => setResumeFiles(Array.from(event.target.files ?? []))}
              />
            </Button>

            {resumeFiles.length ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {resumeFiles.map((file) => (
                  <Chip key={`${file.name}-${file.size}`} label={file.name} size="small" />
                ))}
              </Stack>
            ) : null}

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
                  快速匹配只为每份简历的 Top 3 岗位生成详细 explanation。全面匹配会对所有岗位都生成完整 explanation，更适合深度复盘。
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
                    <Typography variant="subtitle1">匹配岗位范围</Typography>
                    <Typography variant="body2" sx={{ color: "var(--muted)", mt: 0.75, lineHeight: 1.8 }}>
                      默认匹配当前岗位库全部岗位。切到手动模式后，可以按来源和关键词筛选一部分岗位。
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

                {matchScope === "manual" ? (
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

                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={`已选 ${selectedJobIds.length} 条`} size="small" color="primary" />
                        <Chip label={`筛选结果 ${filteredJobs.length} 条`} size="small" variant="outlined" />
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSelectedJobIds((current) =>
                              Array.from(
                                new Set([...current, ...filteredJobs.map((item) => item.job.id)]),
                              ),
                            );
                          }}
                        >
                          全选当前筛选结果
                        </Button>
                        <Button variant="text" size="small" onClick={() => setSelectedJobIds([])}>
                          清空选择
                        </Button>
                      </Stack>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selectedJobs.map((item) => (
                        <Chip
                          key={`batch-selected-${item.job.id}`}
                          label={item.job.title}
                          color="primary"
                          onDelete={() => toggleJobSelection(item.job.id)}
                        />
                      ))}
                    </Stack>

                    <div className="grid gap-3 md:grid-cols-2">
                      {filteredJobs.map((item) => {
                        const selected = selectedJobIds.includes(item.job.id);
                        return (
                          <Paper
                            key={`batch-job-${item.job.id}`}
                            elevation={0}
                            onClick={() => toggleJobSelection(item.job.id)}
                            sx={{
                              cursor: "pointer",
                              borderRadius: "20px",
                              border: "1px solid",
                              borderColor: selected ? "var(--accent-border)" : "var(--line)",
                              bgcolor: selected ? "var(--surface-overlay-strong)" : "var(--surface)",
                              p: 2,
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
                              <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                                {item.job.summary}
                              </Typography>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </div>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`默认会匹配全部 ${jobs.length} 条岗位`} size="small" color="primary" />
                    {jobs.slice(0, 6).map((item) => (
                      <Chip key={`batch-chip-${item.job.id}`} label={item.job.title} size="small" variant="outlined" />
                    ))}
                    {jobs.length > 6 ? <Chip label={`+${jobs.length - 6} 条`} size="small" /> : null}
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
              {isPending ? "批量任务创建中..." : "启动批量匹配"}
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
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={1.5}
            >
              <Typography variant="h5">批量结果</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                {viewMode === "resume" && task?.resume_results.length ? (
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        setExpandedResumeIds(
                          task.resume_results
                            .filter((item) => item.status === "completed")
                            .map((item) => item.resume_id),
                        )
                      }
                    >
                      展开全部
                    </Button>
                    <Button variant="text" size="small" onClick={() => setExpandedResumeIds([])}>
                      收起全部
                    </Button>
                  </Stack>
                ) : null}
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={viewMode}
                  onChange={(_, value: "resume" | "job" | null) => {
                    if (value) {
                      setViewMode(value);
                    }
                  }}
                >
                  <ToggleButton value="resume">简历视角</ToggleButton>
                  <ToggleButton value="job">岗位视角</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>

            {task ? (
              <Stack spacing={2.5}>
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
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <UsersRound size={18} />
                        <Typography variant="subtitle1">任务进度</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Chip label={task.match_mode === "fast" ? "快速匹配" : "全面匹配"} size="small" color="primary" />
                        <Chip label={`${task.status} / ${task.task_id.slice(0, 8)}`} size="small" />
                      </Stack>
                    </Stack>
                    <LinearProgress variant="determinate" value={progressValue} />
                    <Typography variant="body2" sx={{ color: "var(--muted)" }}>
                      已完成 {task.completed_resumes} / {task.total_resumes} 份简历，当前匹配 {task.selected_job_ids.length} 条岗位。
                    </Typography>
                    {task.errors.length ? <Alert severity="warning">{task.errors.join("；")}</Alert> : null}
                  </Stack>
                </Paper>

                {viewMode === "resume" ? (
                  <div className="grid gap-4">
                    {task.resume_results.map((item) => (
                      <Paper
                        elevation={0}
                        key={item.resume_id}
                        sx={{
                          borderRadius: "24px",
                          border: "1px solid var(--line)",
                          bgcolor: "var(--surface-strong)",
                          p: 2.5,
                        }}
                      >
                        <Stack spacing={1.8}>
                          <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                            <Box>
                              <Typography variant="h6">{item.filename}</Typography>
                              <Typography variant="body2" sx={{ color: "var(--muted)" }}>
                                {item.status === "completed"
                                  ? `已生成完整岗位排序，当前展示前 ${item.top_matches.length} 项摘要`
                                  : item.error ?? "处理失败"}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                label={item.status === "completed" ? "已完成" : "失败"}
                                color={item.status === "completed" ? "primary" : "default"}
                                size="small"
                              />
                              {item.status === "completed" && item.full_result ? (
                                <Button
                                  variant="text"
                                  size="small"
                                  endIcon={
                                    expandedResumeIds.includes(item.resume_id) ? (
                                      <ChevronUp size={14} />
                                    ) : (
                                      <ChevronDown size={14} />
                                    )
                                  }
                                  onClick={() => toggleResumeExpanded(item.resume_id)}
                                >
                                  {expandedResumeIds.includes(item.resume_id) ? "收起完整排序" : "展开完整排序"}
                                </Button>
                              ) : null}
                            </Stack>
                          </Stack>
                          {item.top_matches.length ? (
                            <div className="grid gap-3 md:grid-cols-3">
                              {item.top_matches.map((match) => (
                                <Paper
                                  elevation={0}
                                  key={`${item.resume_id}-${match.job_id}`}
                                  sx={{
                                    borderRadius: "20px",
                                    border: "1px solid var(--line)",
                                    bgcolor: "var(--surface)",
                                    p: 2,
                                  }}
                                >
                                  <Stack spacing={1}>
                                    <Typography variant="subtitle2">{match.job_title}</Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                      <Chip label={`${match.total_score} 分`} size="small" color="primary" />
                                      <Chip label={match.recommendation} size="small" variant="outlined" />
                                    </Stack>
                                    <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.7 }}>
                                      {match.summary}
                                    </Typography>
                                    <Button
                                      variant="text"
                                      size="small"
                                      sx={{ alignSelf: "flex-start", px: 0 }}
                                      onClick={() =>
                                        setDetailTarget({ resumeId: item.resume_id, jobId: match.job_id })
                                      }
                                    >
                                      查看完整理由
                                    </Button>
                                  </Stack>
                                </Paper>
                              ))}
                            </div>
                          ) : null}
                          {item.status === "completed" &&
                          item.full_result &&
                          expandedResumeIds.includes(item.resume_id) ? (
                            <Stack spacing={1.5}>
                              <Typography variant="subtitle2">完整岗位排序</Typography>
                              <div className="grid gap-3">
                                {item.full_result.ranked_results.map((match, index) => (
                                  <Paper
                                    elevation={0}
                                    key={`full-${item.resume_id}-${match.job_id}`}
                                    sx={{
                                      borderRadius: "18px",
                                      border: "1px solid var(--line)",
                                      bgcolor: "var(--surface)",
                                      p: 2,
                                    }}
                                  >
                                    <Stack
                                      direction={{ xs: "column", md: "row" }}
                                      justifyContent="space-between"
                                      spacing={1.5}
                                    >
                                      <Box>
                                        <Typography variant="subtitle2">
                                          {index + 1}. {match.job_title}
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{ color: "var(--muted)", lineHeight: 1.7, mt: 0.75 }}
                                        >
                                          {match.summary}
                                        </Typography>
                                      </Box>
                                      <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={1}>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                          <Chip label={`${match.total_score} 分`} size="small" color="primary" />
                                          <Chip label={match.recommendation} size="small" variant="outlined" />
                                        </Stack>
                                        <Button
                                          variant="text"
                                          size="small"
                                          sx={{ px: 0 }}
                                          onClick={() =>
                                            setDetailTarget({ resumeId: item.resume_id, jobId: match.job_id })
                                          }
                                        >
                                          查看完整理由
                                        </Button>
                                      </Stack>
                                    </Stack>
                                  </Paper>
                                ))}
                              </div>
                            </Stack>
                          ) : null}
                        </Stack>
                      </Paper>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {task.job_rankings.map((item) => (
                      <Paper
                        elevation={0}
                        key={item.job_id}
                        sx={{
                          borderRadius: "24px",
                          border: "1px solid var(--line)",
                          bgcolor: "var(--surface-strong)",
                          p: 2.5,
                        }}
                      >
                        <Stack spacing={1.8}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <BriefcaseBusiness size={18} />
                            <Typography variant="h6">{item.job_title}</Typography>
                          </Stack>
                          <div className="grid gap-3 md:grid-cols-3">
                            {item.top_candidates.map((candidate) => (
                              <Paper
                                elevation={0}
                                key={`${item.job_id}-${candidate.resume_id}`}
                                sx={{
                                  borderRadius: "20px",
                                  border: "1px solid var(--line)",
                                  bgcolor: "var(--surface)",
                                  p: 2,
                                }}
                              >
                                <Stack spacing={1}>
                                  <Typography variant="subtitle2">{candidate.filename}</Typography>
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Chip label={`${candidate.total_score} 分`} size="small" color="primary" />
                                    <Chip label={candidate.recommendation} size="small" variant="outlined" />
                                  </Stack>
                                  <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.7 }}>
                                    {candidate.summary}
                                  </Typography>
                                  <Button
                                    variant="text"
                                    size="small"
                                    sx={{ alignSelf: "flex-start", px: 0 }}
                                    onClick={() =>
                                      setDetailTarget({ resumeId: candidate.resume_id, jobId: item.job_id })
                                    }
                                  >
                                    查看完整理由
                                  </Button>
                                </Stack>
                              </Paper>
                            ))}
                          </div>
                        </Stack>
                      </Paper>
                    ))}
                  </div>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                任务启动后，这里会显示任务进度、每份简历的 Top 3 岗位、每个岗位的 Top 3 候选人，以及可展开查看的完整理由。
              </Typography>
            )}
          </Stack>
        </Paper>
      </form>

      <BatchMatchDetailDialog
        context={detailContext}
        onClose={() => setDetailTarget(null)}
      />
    </main>
  );
}

function BatchMatchDetailDialog({
  context,
  onClose,
}: {
  context: { filename: string; match: MatchResult } | null;
  onClose: () => void;
}) {
  const match = context?.match;
  const hasDetailedExplanation = Boolean(
    match?.explanation_details.summary ||
      match?.explanation_details.fit_reasons.length ||
      match?.explanation_details.risk_reasons.length ||
      match?.explanation_details.follow_up_questions.length,
  );

  return (
    <Dialog open={Boolean(context && match)} onClose={onClose} fullWidth maxWidth="md">
      {match ? (
        <>
          <DialogTitle>
            <Stack spacing={0.75}>
              <Typography variant="h6">{match.job_title}</Typography>
              <Typography variant="body2" sx={{ color: "var(--muted)" }}>
                {context?.filename} · {match.total_score} 分 · {match.recommendation}
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pb: 1 }}>
              <Paper elevation={0} sx={{ borderRadius: "20px", border: "1px solid var(--line)", p: 2 }}>
                <Stack spacing={1.25}>
                  <Typography variant="subtitle2">总体判断</Typography>
                  <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                    {match.explanation_details.summary || match.summary}
                  </Typography>
                </Stack>
              </Paper>

              {!hasDetailedExplanation ? (
                <Alert severity="info">
                  这条结果当前只有快速摘要。切换到“全面匹配”后，系统会为所有岗位生成完整 explanation。
                </Alert>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <Paper elevation={0} sx={{ borderRadius: "20px", border: "1px solid var(--line)", p: 2 }}>
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2">合适的原因</Typography>
                    {match.explanation_details.fit_reasons.map((item, index) => (
                      <Typography key={`fit-${index}`} variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                        {item}
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
                <Paper elevation={0} sx={{ borderRadius: "20px", border: "1px solid var(--line)", p: 2 }}>
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2">风险和不合适的原因</Typography>
                    {match.explanation_details.risk_reasons.map((item, index) => (
                      <Typography key={`risk-${index}`} variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                        {item}
                      </Typography>
                    ))}
                    {match.hard_requirement_warnings.map((item, index) => (
                      <Chip key={`warn-${index}`} label={item} size="small" color="warning" variant="outlined" />
                    ))}
                  </Stack>
                </Paper>
              </div>

              {hasDetailedExplanation ? (
                <Paper elevation={0} sx={{ borderRadius: "20px", border: "1px solid var(--line)", p: 2 }}>
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2">建议追问</Typography>
                    {match.explanation_details.follow_up_questions.map((item, index) => (
                      <Typography key={`follow-${index}`} variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                        {item}
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              ) : null}

              <Paper elevation={0} sx={{ borderRadius: "20px", border: "1px solid var(--line)", p: 2 }}>
                <Stack spacing={1.25}>
                  <Typography variant="subtitle2">建议下一步动作</Typography>
                  <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                    {match.explanation_details.action_recommendation || "建议结合总分和主要风险，再决定是否推进面试。"}
                  </Typography>
                </Stack>
              </Paper>

              <Paper elevation={0} sx={{ borderRadius: "20px", border: "1px solid var(--line)", p: 2 }}>
                <Stack spacing={1.25}>
                  <Typography variant="subtitle2">维度分数</Typography>
                  <DimensionScoreList scores={match.dimension_scores} compact />
                </Stack>
              </Paper>
            </Stack>
          </DialogContent>
        </>
      ) : null}
    </Dialog>
  );
}
