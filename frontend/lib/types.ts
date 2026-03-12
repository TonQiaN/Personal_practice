export type JobDescriptionInput = {
  id: string;
  title: string;
  summary: string;
  must_have: string[];
  nice_to_have: string[];
  min_years: number;
  industry_keywords: string[];
  education_keywords: string[];
  project_keywords: string[];
};

export type DimensionScore = {
  name: string;
  score: number;
  matched: string[];
  missing: string[];
  note: string;
};

export type MatchResult = {
  job_id: string;
  job_title: string;
  total_score: number;
  recommendation: "推荐" | "可考虑" | "不推荐";
  summary: string;
  dimension_scores: DimensionScore[];
  hard_requirement_warnings: string[];
};

export type MatchResponse = {
  request_id: string;
  resume_summary: {
    raw_text: string;
    years_of_experience: number;
    skills: string[];
    industries: string[];
    education: string[];
    project_terms: string[];
    highlights: string[];
    uncertainties: string[];
  };
  ranked_results: MatchResult[];
  trace: string[];
};
