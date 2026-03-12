from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
SAMPLE_ROOT = ROOT / "backend" / "data" / "sample_pdfs"
RESUME_DIR = SAMPLE_ROOT / "resumes"
JD_DIR = SAMPLE_ROOT / "jds"

pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))


RESUMES = [
    (
        "resume_python_backend_zh.pdf",
        [
            "张晨 | Python 后端工程师",
            "工作经验：5年",
            "技术栈：Python、FastAPI、PostgreSQL、Redis、Docker",
            "行业经验：企业服务、SaaS",
            "教育背景：本科，计算机科学与技术",
            "项目经历：",
            "1. 负责企业级 API 平台建设，服务 50+ B 端客户。",
            "2. 基于 FastAPI 和 PostgreSQL 搭建多租户数据服务。",
            "3. 使用 Redis 优化查询性能，接口平均耗时下降 35%。",
        ],
    ),
    (
        "resume_frontend_react_zh.pdf",
        [
            "李想 | 前端工程师",
            "工作经验：3年",
            "技术栈：React、Next.js、TypeScript、Node.js",
            "行业经验：消费互联网、SaaS",
            "教育背景：本科，软件工程",
            "项目经历：",
            "1. 负责用户增长后台和运营工具前端开发。",
            "2. 使用 Next.js 重构官网，首屏性能提升 28%。",
            "3. 推动设计系统建设，提升中后台页面复用率。",
        ],
    ),
    (
        "resume_ai_engineer_zh.pdf",
        [
            "王一鸣 | AI 应用工程师",
            "工作经验：4年",
            "技术栈：Python、LangChain、LangGraph、LLM、Prompt、Docker",
            "行业经验：AI、人工智能、企业服务",
            "教育背景：硕士，计算机科学",
            "项目经历：",
            "1. 负责大模型问答系统与企业知识库检索增强。",
            "2. 基于 LangGraph 设计多 Agent 编排流程。",
            "3. 优化 Prompt 和工具调用链路，提升答案稳定性。",
        ],
    ),
    (
        "resume_data_analyst_zh.pdf",
        [
            "周宁 | 数据分析师",
            "工作经验：4年",
            "技术栈：SQL、Python、数据分析、Tableau",
            "行业经验：电商、金融",
            "教育背景：本科，统计学",
            "项目经历：",
            "1. 建立核心运营指标看板，支持周/月业务复盘。",
            "2. 使用 SQL 和 Python 完成用户分层与转化分析。",
            "3. 与运营团队协作优化投放策略，ROI 提升 18%。",
        ],
    ),
    (
        "resume_product_manager_zh.pdf",
        [
            "陈可 | 产品经理",
            "工作经验：5年",
            "能力标签：产品设计、用户研究、数据分析、跨团队协作",
            "行业经验：消费互联网、招聘",
            "教育背景：本科，信息管理",
            "项目经历：",
            "1. 负责招聘平台职位发布和候选人推荐模块。",
            "2. 通过用户访谈和行为数据优化投递转化流程。",
            "3. 协调研发、设计、运营完成多个版本迭代。",
        ],
    ),
]


JDS = [
    (
        "jd_python_backend_zh.pdf",
        [
            "Python 后端工程师",
            "岗位职责：负责 API 服务开发、数据处理和系统优化。",
            "任职要求：",
            "1. 必须熟练使用 Python、FastAPI、SQL。",
            "2. 3年以上后端开发经验。",
            "3. 有 PostgreSQL、Redis、Docker 经验优先。",
            "4. 本科及以上学历，计算机相关专业优先。",
            "5. 有企业服务或 SaaS 行业经验优先。",
        ],
    ),
    (
        "jd_frontend_engineer_zh.pdf",
        [
            "前端工程师",
            "岗位职责：负责 React / Next.js 前端页面与交互体验。",
            "任职要求：",
            "1. 必须熟练使用 React、TypeScript、JavaScript。",
            "2. 2年以上前端开发经验。",
            "3. 有 Next.js、Node.js 经验优先。",
            "4. 有中后台系统或 SaaS 产品经验加分。",
        ],
    ),
    (
        "jd_ai_application_engineer_zh.pdf",
        [
            "AI 应用工程师",
            "岗位职责：负责 LLM 应用开发、多 Agent 工作流设计与优化。",
            "任职要求：",
            "1. 必须熟练使用 Python、LangChain、LLM 应用开发。",
            "2. 有 LangGraph、Prompt 工程、大模型应用经验优先。",
            "3. 2年以上相关经验。",
            "4. 本科及以上学历，计算机相关专业。",
        ],
    ),
    (
        "jd_data_analyst_zh.pdf",
        [
            "数据分析师",
            "岗位职责：负责业务数据分析、指标体系和增长洞察。",
            "任职要求：",
            "1. 必须熟练使用 SQL、Python、数据分析方法。",
            "2. 2年以上数据分析经验。",
            "3. 有电商或金融行业经验优先。",
            "4. 统计学、数学相关专业优先。",
        ],
    ),
    (
        "jd_product_manager_zh.pdf",
        [
            "产品经理",
            "岗位职责：负责需求分析、产品设计和跨团队推进。",
            "任职要求：",
            "1. 必须具备产品设计和用户研究能力。",
            "2. 3年以上产品经验。",
            "3. 具备数据分析能力优先。",
            "4. 有招聘平台或消费互联网经验加分。",
        ],
    ),
]


def write_pdf(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(path), pagesize=A4)
    pdf.setTitle(path.stem)
    pdf.setFont("STSong-Light", 14)

    width, height = A4
    x = 18 * mm
    y = height - 22 * mm

    for line in lines:
        if y < 20 * mm:
            pdf.showPage()
            pdf.setFont("STSong-Light", 14)
            y = height - 22 * mm
        pdf.drawString(x, y, line)
        y -= 10 * mm

    pdf.save()


def main() -> None:
    for filename, lines in RESUMES:
        write_pdf(RESUME_DIR / filename, lines)
    for filename, lines in JDS:
        write_pdf(JD_DIR / filename, lines)

    print(f"Generated {len(RESUMES)} resume PDFs in {RESUME_DIR}")
    print(f"Generated {len(JDS)} JD PDFs in {JD_DIR}")


if __name__ == "__main__":
    main()
