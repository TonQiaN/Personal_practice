"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";

import type { JobDescriptionInput, MatchResponse } from "@/lib/types";

import styles from "./match-app.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const emptyJob = (): JobDescriptionInput => ({
  id: `custom-${crypto.randomUUID()}`,
  title: "",
  summary: "",
  must_have: [],
  nice_to_have: [],
  min_years: 0,
  industry_keywords: [],
  education_keywords: [],
  project_keywords: [],
});

const splitList = (value: string) =>
  value
    .split(/[，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

export function MatchApp() {
  const [jobs, setJobs] = useState<JobDescriptionInput[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void fetch(`${API_BASE}/api/presets`)
      .then(async (response) => response.json())
      .then((data: JobDescriptionInput[]) => setJobs(data))
      .catch(() => setError("默认 JD 加载失败，请确认后端是否已启动。"));
  }, []);

  const updateJob = (id: string, patch: Partial<JobDescriptionInput>) => {
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  };

  const addJob = () => setJobs((current) => [...current, emptyJob()]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("请先上传一份 PDF 简历。");
      return;
    }
    const validJobs = jobs.filter((job) => job.title.trim());
    if (!validJobs.length) {
      setError("请至少保留一条有效 JD。");
      return;
    }

    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobs", JSON.stringify(validJobs));

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

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.kicker}>Resume Match Lab</p>
          <h1>把一份中文简历，和 10 条岗位画像，拉进同一张判断桌。</h1>
          <p className={styles.lead}>
            这个 Demo 以规则打分为底座，用 LangGraph 编排工作流，再用
            GPT-5 Codex 生成面向 HR 的简短解释。
          </p>
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.metricCard}>
            <span>支持输入</span>
            <strong>文本型 PDF</strong>
          </div>
          <div className={styles.metricCard}>
            <span>预置岗位</span>
            <strong>{jobs.length || 10} 条</strong>
          </div>
          <div className={styles.metricCard}>
            <span>工作流</span>
            <strong>LangGraph</strong>
          </div>
        </div>
      </section>

      <form className={styles.grid} onSubmit={submit}>
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2>上传简历</h2>
            <span>只支持文本型 PDF，最多 10MB / 5 页</span>
          </div>
          <label className={styles.upload}>
            <input
              accept="application/pdf"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <span>{file ? file.name : "选择简历 PDF"}</span>
          </label>

          <div className={styles.sectionHead}>
            <h2>岗位列表</h2>
            <button className={styles.secondaryButton} type="button" onClick={addJob}>
              新增 JD
            </button>
          </div>

          <div className={styles.jobList}>
            {jobs.map((job, index) => (
              <article className={styles.jobCard} key={job.id}>
                <div className={styles.jobCardHead}>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <input
                    value={job.title}
                    onChange={(event) => updateJob(job.id, { title: event.target.value })}
                    placeholder="岗位标题"
                  />
                </div>
                <textarea
                  value={job.summary}
                  onChange={(event) => updateJob(job.id, { summary: event.target.value })}
                  placeholder="岗位描述"
                />
                <div className={styles.twoCols}>
                  <input
                    value={job.must_have.join("，")}
                    onChange={(event) =>
                      updateJob(job.id, { must_have: splitList(event.target.value) })
                    }
                    placeholder="必备技能，逗号分隔"
                  />
                  <input
                    value={job.nice_to_have.join("，")}
                    onChange={(event) =>
                      updateJob(job.id, { nice_to_have: splitList(event.target.value) })
                    }
                    placeholder="加分项，逗号分隔"
                  />
                </div>
                <div className={styles.twoCols}>
                  <input
                    type="number"
                    min={0}
                    value={job.min_years}
                    onChange={(event) =>
                      updateJob(job.id, { min_years: Number(event.target.value) || 0 })
                    }
                    placeholder="最低年限"
                  />
                  <input
                    value={job.project_keywords.join("，")}
                    onChange={(event) =>
                      updateJob(job.id, { project_keywords: splitList(event.target.value) })
                    }
                    placeholder="项目关键词"
                  />
                </div>
              </article>
            ))}
          </div>

          <button className={styles.primaryButton} disabled={isPending} type="submit">
            {isPending ? "匹配中..." : "开始匹配"}
          </button>
          {error ? <p className={styles.error}>{error}</p> : null}
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2>匹配结果</h2>
            <span>显示全部排序结果，并高亮 Top 3</span>
          </div>

          {result ? (
            <>
              <div className={styles.resumeMeta}>
                <div>
                  <span>识别工作年限</span>
                  <strong>{result.resume_summary.years_of_experience} 年</strong>
                </div>
                <div>
                  <span>识别技能</span>
                  <strong>{result.resume_summary.skills.slice(0, 6).join(" / ") || "暂无"}</strong>
                </div>
              </div>

              <div className={styles.resultList}>
                {result.ranked_results.map((item, index) => (
                  <article
                    className={`${styles.resultCard} ${index < 3 ? styles.resultTop : ""}`}
                    key={item.job_id}
                  >
                    <div className={styles.resultHead}>
                      <div>
                        <p>#{index + 1}</p>
                        <h3>{item.job_title}</h3>
                      </div>
                      <div className={styles.scoreBlock}>
                        <strong>{item.total_score}</strong>
                        <span>{item.recommendation}</span>
                      </div>
                    </div>
                    <p className={styles.summary}>{item.summary}</p>
                    <div className={styles.dimensionGrid}>
                      {item.dimension_scores.map((dimension) => (
                        <div key={dimension.name}>
                          <span>{dimension.name}</span>
                          <strong>{dimension.score}</strong>
                        </div>
                      ))}
                    </div>
                    {item.hard_requirement_warnings.length ? (
                      <ul className={styles.warningList}>
                        {item.hard_requirement_warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>

              <details className={styles.traceBox}>
                <summary>查看工作流追踪</summary>
                <pre>{JSON.stringify(result.trace, null, 2)}</pre>
              </details>
            </>
          ) : (
            <div className={styles.empty}>
              <p>上传简历后，右侧会展示排序后的匹配结果和每条 JD 的简短说明。</p>
            </div>
          )}
        </section>
      </form>
    </main>
  );
}
