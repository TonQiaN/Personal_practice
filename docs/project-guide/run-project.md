# 项目运行说明

本文档说明如何在本地运行当前的简历-JD 匹配 Demo。

## 1. 项目组成

当前项目包含两部分：

- `backend/`: `FastAPI + LangGraph` 后端
- `frontend/`: `Next.js + Tailwind CSS + MUI` 前端

功能流程：

1. 前端可上传 JD PDF
2. JD PDF Agent 解析并写入 PostgreSQL
3. 前端选择已入库 JD
4. 前端上传中文 PDF 简历
5. 后端执行多 Agent 匹配流程
6. 前端在独立页面展示排序结果和解释

当前前端页面结构：

- `/`: 首页，介绍产品结构和入口
- `/jds`: JD 管理页，负责 JD PDF 上传、草稿确认、手动新增、删除和岗位库维护
- `/match`: 匹配工作台，负责上传简历、默认匹配全部岗位，也支持切换到手动选择岗位后再查看排序结果
- `/batch-match`: 批量匹配页，负责上传多份简历、异步执行批量任务，并展示“简历视角 / 岗位视角”两种结果
- `/agents`: Agent 架构说明页，负责展示当前 multi-agent 拆分

当前 `/match` 和 `/batch-match` 都支持两种模式：

- `快速匹配`: 只为 Top 3 结果生成详细 explanation
- `全面匹配`: 为全部匹配结果生成详细 explanation

当前前端设计系统：

- `Tailwind CSS` 负责布局和页面级样式
- `MUI` 负责表单、抽屉、按钮、卡片、进度反馈等重组件
- 支持浅色 / 深色模式切换

## 2. 环境要求

当前本地已验证环境：

- Python `3.13`
- Node.js `22`
- npm `10`

如果你的环境版本不同，优先保证：

- Python `3.11+`
- Node.js `20+`

## 3. 运行前准备

项目根目录需要有 `.env` 文件。

关键环境变量：

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `DATABASE_URL`
- `MATCH_PARALLELISM`
- `BATCH_RESUME_PARALLELISM`

当前项目默认模型配置：

- `OPENAI_MODEL=gpt-5-codex`

当前数据库配置需要指向本地可用 PostgreSQL，例如：

```bash
DATABASE_URL=postgresql+psycopg://your_pg_user@localhost:5432/resume_agent
```

## 4. 启动后端

在项目根目录执行：

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
PYTHONPATH=backend .venv/bin/uvicorn app.main:app --reload
```

启动后地址：

- `http://127.0.0.1:8000`

可用于检查服务是否正常：

- `GET /health`
- `GET /api/presets`
- `POST /api/jds/upload-pdf`
- `POST /api/jds`

## 5. 启动前端

新开一个终端，执行：

```bash
cd frontend
npm install
npm run dev
```

启动后地址：

- `http://127.0.0.1:3000`

如果前端需要显式指定后端地址，可设置：

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## 6. 标准启动顺序

建议按这个顺序启动：

1. 进入项目根目录
2. 启动后端
3. 新开终端启动前端
4. 打开前端页面
5. 打开 `/jds`，上传 JD PDF 并确认保存
6. 打开 `/match`，上传 PDF 简历并发起匹配，系统会默认对当前全部岗位进行比较，也可以切换到手动选择并按来源或关键词筛选岗位
7. 如需批量筛选，打开 `/batch-match`，上传多份 PDF 简历并等待后台任务完成

## 7. 如何验证项目可用

### 后端测试

在项目根目录执行：

```bash
PYTHONPATH=backend .venv/bin/pytest backend/tests -q
```

### 前端构建验证

在项目根目录执行：

```bash
cd frontend
npm run build
```

### 生成本地测试 PDF

项目内提供了样本生成脚本，可一键生成中文简历和 JD PDF：

```bash
.venv/bin/python scripts/generate_sample_pdfs.py
```

生成目录：

- `backend/data/sample_pdfs/resumes/`
- `backend/data/sample_pdfs/jds/`

## 8. 运行时日志

运行日志保存在：

- `backend/data/logs/`

日志特征：

- 按小时切分
- 文件格式为 `JSONL`
- 每条请求带 `request_id`

主要日志事件包括：

- `request_started`
- `node_completed`
- `model_call_completed`
- `model_call_failed`
- `request_completed`
- `request_failed`

匹配性能说明：

- `Resume Parser Agent` 先完成简历结构化
- `Matching Agent` 会对当前匹配范围内的 JD 并行打分
- `Explanation Agent` 会对排序后的结果并行生成说明
- `快速匹配` 模式只为 Top 3 结果调用完整 explanation
- 前端 `/match` 页面会显示动态加载动画和阶段提示
- `/batch-match` 使用异步任务 + 轮询状态查询，不阻塞当前页面
- `/batch-match` 现在会在任务内部并发处理多份简历，并受 `BATCH_RESUME_PARALLELISM` 控制

## 9. 当前限制

当前版本有这些限制：

- 只支持文本型 PDF
- 不支持扫描版 PDF OCR
- JD PDF 解析后需要用户确认再参与匹配
- 原始 JD PDF 存本地文件，JD 结构化结果存 PostgreSQL
- 简历暂时不入库
- 不提供前端日志查看页

## 10. 常见问题

### 前端启动了但无法请求后端

检查：

- 后端是否已经启动
- 后端是否运行在 `127.0.0.1:8000`
- 是否设置了错误的 `NEXT_PUBLIC_API_BASE_URL`

### PDF 上传失败

检查：

- 是否是 PDF 文件
- 是否为文本型 PDF
- 是否超过 `10MB`
- 是否超过 `5` 页

### 后端启动时报数据库错误

检查：

- 本地 PostgreSQL 是否已启动
- `DATABASE_URL` 是否是实际可连接的用户和数据库
- `resume_agent` 数据库是否已创建

### 匹配结果异常

优先查看：

- `backend/data/logs/`
- `docs/codex_error.md`

## 11. 建议先读哪些文档

如果你是第一次接手这个项目，建议按顺序阅读：

1. `README.md`
2. `docs/requirements.md`
3. `docs/current-state.md`
4. `docs/backlog.md`
5. `docs/project-guide/run-project.md`
