import re

from app.models import ResumeProfile


COMMON_SKILLS = [
    "api",
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "next.js",
    "vue",
    "node.js",
    "fastapi",
    "django",
    "flask",
    "langchain",
    "langgraph",
    "sql",
    "mysql",
    "postgresql",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "机器学习",
    "深度学习",
    "数据分析",
    "产品设计",
    "用户研究",
    "爬虫",
    "大模型",
    "llm",
    "prompt",
]

INDUSTRY_KEYWORDS = [
    "电商",
    "saas",
    "金融",
    "教育",
    "医疗",
    "招聘",
    "企业服务",
    "ai",
    "人工智能",
    "消费互联网",
]

EDUCATION_KEYWORDS = [
    "本科",
    "硕士",
    "博士",
    "计算机",
    "软件工程",
    "数学",
    "统计学",
]


def _find_keywords(text: str, keywords: list[str]) -> list[str]:
    lower_text = text.lower()
    found = [item for item in keywords if item.lower() in lower_text]
    return sorted(set(found))


def _extract_years(text: str) -> int:
    patterns = [
        r"(\d{1,2})\s*年(?:工作经验|经验)",
        r"(\d{1,2})\s*年以上",
        r"工作\s*(\d{1,2})\s*年",
        r"(\d{1,2})\s*年",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return int(match.group(1))
    return 0


def _extract_highlights(text: str) -> list[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return lines[:5]


def normalize_resume(raw_text: str) -> ResumeProfile:
    years = _extract_years(raw_text)
    skills = _find_keywords(raw_text, COMMON_SKILLS)
    industries = _find_keywords(raw_text, INDUSTRY_KEYWORDS)
    education = _find_keywords(raw_text, EDUCATION_KEYWORDS)
    project_terms = sorted(set(skills[:8] + industries[:4]))
    uncertainties: list[str] = []

    if years == 0:
        uncertainties.append("未明确识别到工作年限，按 0 年处理。")

    return ResumeProfile(
        raw_text=raw_text,
        years_of_experience=years,
        skills=skills,
        industries=industries,
        education=education,
        project_terms=project_terms,
        highlights=_extract_highlights(raw_text),
        uncertainties=uncertainties,
    )
