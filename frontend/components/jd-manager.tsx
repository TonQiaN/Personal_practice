"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FileUp, Layers3, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import type { JDParseResponse, JobDescriptionInput, PersistedJD } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const splitList = (value: string) =>
  value
    .split(/[，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const emptyManualDraft = (): JobDescriptionInput => ({
  id: "",
  title: "",
  summary: "",
  must_have: [],
  nice_to_have: [],
  min_years: 0,
  industry_keywords: [],
  education_keywords: [],
  project_keywords: [],
});

export function JDManager() {
  const [jobs, setJobs] = useState<PersistedJD[]>([]);
  const [jdPdfFile, setJdPdfFile] = useState<File | null>(null);
  const [jdDraft, setJdDraft] = useState<JobDescriptionInput | null>(null);
  const [jdDraftPersisted, setJdDraftPersisted] = useState<PersistedJD | null>(null);
  const [jdWarnings, setJdWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [manualDraft, setManualDraft] = useState<JobDescriptionInput>(emptyManualDraft());
  const [isPending, startTransition] = useTransition();

  const loadJobs = async () => {
    const response = await fetch(`${API_BASE}/api/presets`, { cache: "no-store" });
    const data = (await response.json()) as PersistedJD[];
    setJobs(data);
  };

  useEffect(() => {
    void loadJobs().catch(() => setError("JD 列表加载失败。"));
  }, []);

  const uploadJdPdf = () => {
    if (!jdPdfFile) {
      setError("请先选择 JD PDF。");
      return;
    }

    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.append("jd_pdf", jdPdfFile);

      const response = await fetch(`${API_BASE}/api/jds/upload-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        setError(payload.detail ?? "JD PDF 解析失败。");
        return;
      }

      const payload = (await response.json()) as JDParseResponse;
      setJdDraft(payload.persisted.job);
      setJdDraftPersisted(payload.persisted);
      setJdWarnings(payload.warnings.map((item) => item.message));
    });
  };

  const saveDraftJd = () => {
    if (!jdDraft) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`${API_BASE}/api/jds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job: jdDraft,
          source_type: "jd_pdf",
          status: "confirmed",
          raw_pdf_path: jdDraftPersisted?.raw_pdf_path ?? null,
          raw_text: jdDraftPersisted?.raw_text ?? "",
          normalized_json: jdDraftPersisted?.normalized_json ?? jdDraft,
          user_corrected_json: jdDraft,
        }),
      });

      if (!response.ok) {
        setError("保存 JD 失败。");
        return;
      }

      setJdDraft(null);
      setJdDraftPersisted(null);
      setJdWarnings([]);
      setJdPdfFile(null);
      await loadJobs();
    });
  };

  const saveManualJd = () => {
    if (!manualDraft.title.trim() || !manualDraft.summary.trim()) {
      setError("手动新增岗位至少需要标题和摘要。");
      return;
    }

    setError("");
    startTransition(async () => {
      const response = await fetch(`${API_BASE}/api/jds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job: {
            ...manualDraft,
            id: manualDraft.id || `manual-${crypto.randomUUID()}`,
          },
          source_type: "manual",
          status: "confirmed",
          raw_text: manualDraft.summary,
          normalized_json: manualDraft,
          user_corrected_json: manualDraft,
        }),
      });

      if (!response.ok) {
        setError("新增岗位失败。");
        return;
      }

      setManualDraft(emptyManualDraft());
      await loadJobs();
    });
  };

  const removeJd = (jobId: string) => {
    setError("");
    startTransition(async () => {
      const response = await fetch(`${API_BASE}/api/jds/${jobId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        setError(payload.detail ?? "删除岗位失败。");
        return;
      }

      await loadJobs();
    });
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
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Stack spacing={2}>
            <Chip label="JD content management" size="small" sx={{ width: "fit-content", bgcolor: "var(--accent-soft)", color: "var(--accent-2)" }} />
            <Typography variant="h2" sx={{ maxWidth: "16ch" }}>
              先处理岗位内容，再把它送进匹配工作台。
            </Typography>
            <Typography variant="body1" sx={{ color: "var(--muted)", lineHeight: 1.9, maxWidth: "58ch" }}>
              `/jds` 页现在更像内容管理后台，而不是一个上传表单。JD PDF 会先被解析成草稿，再由你确认和入库。
            </Typography>
          </Stack>

          <div className="grid gap-4">
            {[
              ["已入库 JD", `${jobs.length}`],
              ["解析方式", "JD PDF Agent"],
              ["存储方式", "PostgreSQL + 本地 PDF"],
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
            <Stack direction="row" spacing={1.25} alignItems="center">
              <FileUp size={18} />
              <Typography variant="h5">上传 JD PDF</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
              只支持文本型 PDF。解析完成后不会直接入库，而是先生成草稿给你确认。
            </Typography>
            <Button component="label" variant="outlined" sx={{ justifyContent: "flex-start", px: 2.2, py: 1.8 }}>
              {jdPdfFile ? jdPdfFile.name : "选择 JD PDF"}
              <input hidden accept="application/pdf" type="file" onChange={(event) => setJdPdfFile(event.target.files?.[0] ?? null)} />
            </Button>
            <Button
              variant="contained"
              onClick={uploadJdPdf}
              startIcon={isPending ? <CircularProgress color="inherit" size={16} /> : <FileUp size={16} />}
              sx={{ py: 1.4 }}
            >
              {isPending ? "JD PDF Agent 处理中..." : "启动 JD PDF Agent"}
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
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Layers3 size={18} />
              <Typography variant="h5">草稿确认</Typography>
            </Stack>

            {jdDraft ? (
              <Stack spacing={2}>
                <TextField label="岗位标题" value={jdDraft.title} onChange={(event) => setJdDraft({ ...jdDraft, title: event.target.value })} />
                <TextField
                  label="岗位摘要"
                  value={jdDraft.summary}
                  minRows={4}
                  multiline
                  onChange={(event) => setJdDraft({ ...jdDraft, summary: event.target.value })}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField
                    label="必备技能"
                    value={jdDraft.must_have.join("，")}
                    onChange={(event) => setJdDraft({ ...jdDraft, must_have: splitList(event.target.value) })}
                  />
                  <TextField
                    label="加分项"
                    value={jdDraft.nice_to_have.join("，")}
                    onChange={(event) => setJdDraft({ ...jdDraft, nice_to_have: splitList(event.target.value) })}
                  />
                </div>
                <Button variant="contained" onClick={saveDraftJd} sx={{ py: 1.4 }}>
                  确认并保存到岗位库
                </Button>
                {jdWarnings.length ? (
                  <Stack spacing={1.2}>
                    {jdWarnings.map((warning) => (
                      <Alert key={warning} severity="warning">
                        {warning}
                      </Alert>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            ) : (
              <Box
                sx={{
                  borderRadius: "24px",
                  border: "1px dashed var(--line-strong)",
                  bgcolor: "var(--surface-overlay)",
                  minHeight: 280,
                  display: "grid",
                  placeItems: "center",
                  px: 3,
                }}
              >
                <Typography variant="body2" sx={{ color: "var(--muted)", textAlign: "center", lineHeight: 1.8 }}>
                  上传一份 JD PDF 后，这里会出现结构化草稿、警告和确认入口。
                </Typography>
              </Box>
            )}
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
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Plus size={18} />
            <Typography variant="h5">手动新增岗位</Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8, maxWidth: "70ch" }}>
            用这块区域快速补录一个岗位。先写清岗位标题和摘要，再补必备技能、加分项和关键词，系统会直接把它写进当前岗位库。
          </Typography>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
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
                <Stack direction="row" spacing={1} alignItems="center">
                  <Sparkles size={16} />
                  <Typography variant="subtitle1">基础信息</Typography>
                </Stack>
                <div className="grid gap-3 md:grid-cols-[1fr_160px]">
                  <TextField
                    fullWidth
                    helperText="例如：高级 Python 后端工程师"
                    InputLabelProps={{ shrink: true }}
                    label="岗位标题"
                    placeholder="输入岗位名称"
                    value={manualDraft.title}
                    onChange={(event) => setManualDraft({ ...manualDraft, title: event.target.value })}
                  />
                  <TextField
                    fullWidth
                    helperText="默认填 0 表示不限"
                    InputLabelProps={{ shrink: true }}
                    label="最低年限"
                    placeholder="3"
                    type="number"
                    value={manualDraft.min_years}
                    onChange={(event) =>
                      setManualDraft({ ...manualDraft, min_years: Number(event.target.value) || 0 })
                    }
                  />
                </div>
                <TextField
                  fullWidth
                  helperText="一句话说明岗位职责、交付内容和候选人画像"
                  InputLabelProps={{ shrink: true }}
                  label="岗位摘要"
                  minRows={4}
                  multiline
                  placeholder="例如：负责 API 服务、数据处理链路和后端架构优化。"
                  value={manualDraft.summary}
                  onChange={(event) => setManualDraft({ ...manualDraft, summary: event.target.value })}
                />
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
                <Typography variant="subtitle1">匹配条件</Typography>
                <TextField
                  fullWidth
                  helperText="用中文逗号分隔，例如：python，fastapi，sql"
                  InputLabelProps={{ shrink: true }}
                  label="必备技能"
                  placeholder="python，fastapi，sql"
                  value={manualDraft.must_have.join("，")}
                  onChange={(event) =>
                    setManualDraft({ ...manualDraft, must_have: splitList(event.target.value) })
                  }
                />
                <TextField
                  fullWidth
                  helperText="用来拉开候选人差距的加分项"
                  InputLabelProps={{ shrink: true }}
                  label="加分项"
                  placeholder="redis，docker，postgresql"
                  value={manualDraft.nice_to_have.join("，")}
                  onChange={(event) =>
                    setManualDraft({ ...manualDraft, nice_to_have: splitList(event.target.value) })
                  }
                />
                <TextField
                  fullWidth
                  helperText="岗位所在行业或场景关键词"
                  InputLabelProps={{ shrink: true }}
                  label="行业关键词"
                  placeholder="企业服务，saas"
                  value={manualDraft.industry_keywords.join("，")}
                  onChange={(event) =>
                    setManualDraft({
                      ...manualDraft,
                      industry_keywords: splitList(event.target.value),
                    })
                  }
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField
                    fullWidth
                    helperText="学历或专业要求"
                    InputLabelProps={{ shrink: true }}
                    label="教育关键词"
                    placeholder="本科，计算机"
                    value={manualDraft.education_keywords.join("，")}
                    onChange={(event) =>
                      setManualDraft({
                        ...manualDraft,
                        education_keywords: splitList(event.target.value),
                      })
                    }
                  />
                  <TextField
                    fullWidth
                    helperText="项目中常见的任务或技术"
                    InputLabelProps={{ shrink: true }}
                    label="项目关键词"
                    placeholder="api，postgresql，稳定性"
                    value={manualDraft.project_keywords.join("，")}
                    onChange={(event) =>
                      setManualDraft({
                        ...manualDraft,
                        project_keywords: splitList(event.target.value),
                      })
                    }
                  />
                </div>
              </Stack>
            </Paper>
          </div>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between">
            <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
              保存后会立刻进入岗位库，并参与默认全量匹配。
            </Typography>
            <Stack direction="row" spacing={1.25}>
              <Button variant="outlined" onClick={() => setManualDraft(emptyManualDraft())}>
                清空表单
              </Button>
              <Button variant="contained" onClick={saveManualJd} sx={{ py: 1.4, px: 2.4 }}>
                保存手动岗位
              </Button>
            </Stack>
          </Stack>
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
          <Typography variant="h5">岗位库</Typography>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {jobs.map((item) => (
              <Paper
                elevation={0}
                key={item.job.id}
                sx={{
                  borderRadius: "26px",
                  border: "1px solid var(--line)",
                  bgcolor: "var(--surface-strong)",
                  p: 2.5,
                }}
              >
                <Stack spacing={1.6}>
                  <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="start">
                    <Typography variant="h6">{item.job.title}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={item.source_type}
                        size="small"
                        sx={{
                          bgcolor: item.source_type === "preset" ? "var(--surface-muted)" : "var(--accent-soft)",
                          color: item.source_type === "preset" ? "var(--muted)" : "var(--accent-2)",
                        }}
                      />
                      <Button
                        color="error"
                        onClick={() => removeJd(item.job.id)}
                        size="small"
                        startIcon={<Trash2 size={14} />}
                        variant="text"
                      >
                        删除
                      </Button>
                    </Stack>
                  </Stack>
                  <Typography variant="body2" sx={{ color: "var(--muted)", lineHeight: 1.8 }}>
                    {item.job.summary}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {item.job.must_have.slice(0, 4).map((tag) => (
                      <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />
                    ))}
                    {item.job.nice_to_have.slice(0, 4).map((tag) => (
                      <Chip key={tag} label={tag} size="small" color="secondary" variant="outlined" />
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </div>
        </Stack>
      </Paper>
    </main>
  );
}
