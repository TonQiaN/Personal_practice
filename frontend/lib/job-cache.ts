import type { PersistedJD } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const JOB_CACHE_KEY = "resume-match-jobs-cache";

type JobCachePayload = {
  jobs: PersistedJD[];
  updatedAt: number;
};

export function readCachedJobs(): PersistedJD[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.sessionStorage.getItem(JOB_CACHE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const payload = JSON.parse(raw) as JobCachePayload;
    return Array.isArray(payload.jobs) ? payload.jobs : [];
  } catch {
    return [];
  }
}

export function writeCachedJobs(jobs: PersistedJD[]) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: JobCachePayload = {
    jobs,
    updatedAt: Date.now(),
  };
  window.sessionStorage.setItem(JOB_CACHE_KEY, JSON.stringify(payload));
}

export async function fetchJobsFromApi(): Promise<PersistedJD[]> {
  const response = await fetch(`${API_BASE}/api/presets`);
  const data = (await response.json()) as PersistedJD[];
  writeCachedJobs(data);
  return data;
}
