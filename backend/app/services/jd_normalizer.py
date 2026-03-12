import re

from app.models import JDParseWarning, JobDescriptionInput


SKILL_KEYWORDS = [
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
    "大模型",
    "llm",
    "prompt",
]

INDUSTRY_KEYWORDS = ["电商", "saas", "金融", "教育", "医疗", "招聘", "企业服务", "ai", "人工智能"]
EDUCATION_KEYWORDS = ["本科", "硕士", "博士", "计算机", "软件工程", "数学", "统计学"]


def _find_keywords(text: str, keywords: list[str]) -> list[str]:
    lower_text = text.lower()
    found = [item for item in keywords if item.lower() in lower_text]
    return sorted(set(found))


def _extract_title(text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return lines[0][:100] if lines else "未命名岗位"


def _extract_min_years(text: str) -> int:
    patterns = [r"(\d{1,2})\s*年(?:以上|及以上)?", r"至少\s*(\d{1,2})\s*年"]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return int(match.group(1))
    return 0


def _classify_requirements(text: str, skills: list[str]) -> tuple[list[str], list[str], list[JDParseWarning]]:
    lower_text = text.lower()
    must_have: list[str] = []
    nice_to_have: list[str] = []
    warnings: list[JDParseWarning] = []

    for skill in skills:
        lower_skill = skill.lower()
        skill_index = lower_text.find(lower_skill)
        if skill_index == -1:
            continue
        window = lower_text[max(0, skill_index - 20): skill_index + 20]
        if any(marker in window for marker in ["必须", "熟练", "精通", "required", "must"]):
            must_have.append(skill)
        elif any(marker in window for marker in ["加分", "优先", "bonus", "preferred"]):
            nice_to_have.append(skill)
        else:
            must_have.append(skill)
            warnings.append(
                JDParseWarning(
                    message=f"技能 {skill} 没有明确的 must-have / nice-to-have 标记，按 must-have 处理。",
                    severity="low",
                )
            )

    return sorted(set(must_have)), sorted(set(nice_to_have)), warnings


def normalize_jd_text(raw_text: str, job_id: str = "") -> tuple[JobDescriptionInput, list[JDParseWarning]]:
    warnings: list[JDParseWarning] = []
    title = _extract_title(raw_text)
    skills = _find_keywords(raw_text, SKILL_KEYWORDS)
    must_have, nice_to_have, classify_warnings = _classify_requirements(raw_text, skills)
    warnings.extend(classify_warnings)

    if not skills:
        warnings.append(JDParseWarning(message="未识别到明显技能关键词。", severity="medium"))

    summary = " ".join([line.strip() for line in raw_text.splitlines() if line.strip()][:3])[:280]

    job = JobDescriptionInput(
        id=job_id,
        title=title,
        summary=summary,
        must_have=must_have,
        nice_to_have=nice_to_have,
        min_years=_extract_min_years(raw_text),
        industry_keywords=_find_keywords(raw_text, INDUSTRY_KEYWORDS),
        education_keywords=_find_keywords(raw_text, EDUCATION_KEYWORDS),
        project_keywords=skills[:8],
    )
    return job, warnings
