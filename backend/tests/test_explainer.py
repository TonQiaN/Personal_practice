from app.models import DimensionScore, JobDescriptionInput, MatchResult, ResumeProfile
from app.services.explainer import _fallback_summary, _parse_llm_explanation_json


def _build_result() -> MatchResult:
    return MatchResult(
        job_id="product-manager",
        job_title="产品经理",
        total_score=68,
        recommendation="可考虑",
        summary="产品经理 综合得分 68。",
        dimension_scores=[
            DimensionScore(
                name="技能匹配",
                score=18,
                max_score=35,
                matched=["数据分析"],
                missing=["产品设计", "用户研究"],
                note="核心技能优先，加分项次之。",
            ),
            DimensionScore(
                name="工作年限",
                score=20,
                max_score=20,
                matched=["5 年经验"],
                missing=[],
                note="按简历中明确可识别的年限估算。",
            ),
            DimensionScore(
                name="项目经历",
                score=10,
                max_score=20,
                matched=["数据分析"],
                missing=["产品设计", "用户研究"],
                note="根据项目关键词和技能交叉判断。",
            ),
            DimensionScore(
                name="加分项匹配",
                score=10,
                max_score=10,
                matched=["数据分析"],
                missing=[],
                note="体现可拓展能力和岗位贴合度。",
            ),
        ],
        hard_requirement_warnings=["缺少核心技能：产品设计、用户研究"],
    )


def _build_resume() -> ResumeProfile:
    return ResumeProfile(
        raw_text="5年产品和数据分析经验",
        years_of_experience=5,
        skills=["数据分析", "SQL", "原型设计"],
        industries=["互联网"],
        education=["本科"],
        project_terms=["数据分析", "增长分析"],
        highlights=["负责增长分析"],
        uncertainties=[],
    )


def test_fallback_summary_deduplicates_fit_and_risk_reasons():
    result = _build_result()
    jd = JobDescriptionInput(
        id="product-manager",
        title="产品经理",
        summary="负责产品设计、用户研究和数据分析。",
        must_have=["产品设计", "用户研究"],
        nice_to_have=["数据分析"],
        min_years=5,
        industry_keywords=[],
        education_keywords=[],
        project_keywords=["产品设计", "用户研究"],
    )

    explanation = _fallback_summary(result, _build_resume(), jd)

    fit_text = " ".join(explanation.fit_reasons)
    risk_text = " ".join(explanation.risk_reasons)
    follow_up_text = " ".join(explanation.follow_up_questions)

    assert fit_text.count("数据分析") == 1
    assert risk_text.count("产品设计") == 1
    assert risk_text.count("用户研究") == 1
    assert "项目经历还缺少 产品设计、用户研究" not in risk_text
    assert follow_up_text.count("产品设计") <= 1
    assert len(explanation.fit_reasons) <= 3
    assert len(explanation.risk_reasons) <= 3
    assert len(explanation.follow_up_questions) <= 3


def test_parse_llm_explanation_json_supports_fenced_json():
    payload = _parse_llm_explanation_json(
        """```json
        {
          "fit_reasons": ["具备数据分析经验，能够支持产品决策。"],
          "risk_reasons": ["缺少产品设计和用户研究的明确证据。"],
          "follow_up_questions": ["请追问候选人是否独立负责过产品设计与用户研究。"],
          "action_recommendation": "建议安排一轮产品面试，重点核实核心方法论。"
        }
        ```"""
    )

    assert payload["fit_reasons"] == ["具备数据分析经验，能够支持产品决策。"]
    assert payload["risk_reasons"] == ["缺少产品设计和用户研究的明确证据。"]
    assert payload["follow_up_questions"] == ["请追问候选人是否独立负责过产品设计与用户研究。"]
    assert payload["action_recommendation"] == "建议安排一轮产品面试，重点核实核心方法论。"
