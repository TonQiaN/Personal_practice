# 简历与职位要求匹配 Agent 系统设计

## 1. 目标

这个系统的目标不是简单做“关键词匹配”，而是输出一份可解释、可追踪、可复核的匹配结果，回答下面几个问题：

- 这个候选人和 JD 的匹配度是多少
- 匹配和不匹配分别体现在哪些维度
- 缺口是否能通过培训、转岗或短期补齐
- 为什么给出这个结论

对新手来说，最重要的一点是：**不要一开始就做一个“万能大 Agent”**。正确做法是把系统拆成多个小模块，让 Agent 只处理它最擅长的部分，规则和模型各司其职。

## 2. 推荐系统形态

推荐采用 **“工作流编排 + 多 Agent 协作 + 规则兜底”** 的混合架构。

不是：

- 用户丢一份简历和 JD 给一个大模型
- 大模型直接吐一个分数

而是：

1. 解析简历和 JD
2. 抽取结构化信息
3. 做技能、经验、行业、教育等多维匹配
4. 由 Agent 生成解释和建议
5. 用规则校验结果是否合理
6. 输出最终报告

这样做的原因：

- 更稳定
- 更容易调试
- 更容易做 A/B 测试
- 更容易解释给 HR 或业务负责人
- 更适合后续接入招聘系统

## 3. 核心业务输入输出

### 输入

- 候选人简历：PDF、DOCX、图片、纯文本
- 职位描述：JD 文本、岗位画像、招聘要求
- 可选补充信息：行业标签、职级、城市、薪资范围、语言要求、签证要求

### 输出

- 总匹配分数：0 到 100
- 分维度分数
- 强匹配项
- 关键缺口项
- 风险提示
- 推荐结论：推荐 / 可考虑 / 不推荐
- 可解释证据：分数依据来自简历的哪一段、JD 的哪一条

## 4. 多 Agent 拆分

建议先做 4 个 Agent，已经足够完整。

### 4.1 Parser Agent

职责：

- 读取 PDF / DOCX / OCR 文本
- 清洗格式噪音
- 分段识别教育、工作经历、项目、技能、证书

输入：

- 原始简历 / JD 文件

输出：

- 标准化文本
- 分段结果
- 原文位置索引

说明：

这个 Agent 尽量少做推理，重点是“抽取”和“切块”。

### 4.2 Structuring Agent

职责：

- 从简历中抽取结构化字段
- 从 JD 中抽取硬性要求和软性要求

简历结构建议：

- 基本信息
- 工作年限
- 最近岗位
- 技能列表
- 行业经验
- 管理经验
- 教育背景
- 项目经历
- 语言能力
- 证书

JD 结构建议：

- must-have 技能
- nice-to-have 技能
- 最低年限
- 行业要求
- 学历要求
- 语言要求
- 地点要求
- 管理范围
- 工具栈

输出格式建议统一为 JSON。

### 4.3 Matching Agent

职责：

- 基于结构化结果做多维打分
- 判断匹配、部分匹配、缺失、不确定

建议评分维度：

- 技能匹配：30%
- 经验年限：20%
- 行业背景：15%
- 项目相似度：15%
- 学历与证书：10%
- 地域/语言/合规要求：10%

输出：

- 每个维度的原始分
- 证据片段
- 缺口列表
- 不确定点列表

### 4.4 Explanation Agent

职责：

- 把结构化结果转换成人能看的报告
- 生成面向 HR、业务经理、候选人的不同版本说明

输出示例：

- 一句话结论
- 三个最强匹配点
- 三个最大风险点
- 是否建议进入面试
- 建议面试重点追问的问题

## 5. 为什么不能只靠 LLM

因为简历匹配里有很多东西适合规则，不适合纯生成。

适合规则的部分：

- 年限是否达标
- 是否有某个必备证书
- 是否满足工作地点要求
- 是否命中必须技能

适合 LLM 的部分：

- 技能同义词归一化
- 项目经验语义理解
- 行业经验迁移判断
- 生成可解释报告

所以最佳实践是：

- **规则引擎负责硬约束**
- **LLM 负责语义理解和解释生成**

## 6. 端到端工作流

```text
上传简历/JD
  -> 文档解析
  -> 文本清洗
  -> 字段抽取
  -> 结构化存储
  -> 规则预筛
  -> 向量召回/语义匹配
  -> 多维评分
  -> Agent 解释生成
  -> 人工复核
  -> 输出报告/API结果
```

## 7. 推荐技术架构

## 7.1 应用层

- 前端：Next.js
- 后端 API：FastAPI 或 Node.js + NestJS
- 工作流编排：LangGraph / LangChain + 自定义状态机
- 异步任务：Celery / BullMQ

如果你是新手，我建议：

- Python 技术栈优先
- `FastAPI + LangGraph + PostgreSQL + pgvector`

原因：

- Python 的 LLM 生态更成熟
- 文档解析库更多
- 后续做评估和实验更方便

## 7.2 模型层

至少分三类模型能力：

- OCR/文档解析模型
- Embedding 模型
- 推理/总结模型

推荐职责分配：

- OCR：MinerU、PyMuPDF、Unstructured、Azure Document Intelligence
- Embedding：OpenAI text-embedding-3-large 或同类模型
- 推理模型：GPT-4.1 / GPT-4o / 同级中文能力模型

## 7.3 存储层

- PostgreSQL：存结构化简历、JD、匹配结果、审计日志
- pgvector：存简历段落 embedding、JD 条目 embedding
- 对象存储：存原始 PDF/DOCX
- Redis：任务队列、缓存

## 8. 数据表设计建议

### resumes

- id
- candidate_id
- raw_file_url
- parsed_text
- normalized_json
- created_at

### job_descriptions

- id
- job_title
- department
- raw_text
- normalized_json
- created_at

### match_results

- id
- resume_id
- jd_id
- total_score
- recommendation
- score_breakdown_json
- reasoning_json
- created_at

### audit_logs

- id
- request_id
- agent_name
- input_summary
- output_summary
- latency_ms
- model_name
- created_at

## 9. 关键算法设计

不要只用一个分数。推荐三层打分。

### 第一层：硬过滤

示例：

- 缺少必备技能
- 年限低于最低要求
- 地点不满足
- 语言要求不满足

这层可以直接标记风险，甚至直接淘汰。

### 第二层：语义匹配

用 embedding 或 cross-encoder 比较：

- JD 中技能要求和简历技能段落
- JD 中项目要求和简历项目描述
- JD 中行业要求和候选人工作经历

### 第三层：LLM 复核

让 LLM 做三件事：

- 判断“看起来不一样但本质相近”的经验是否可迁移
- 解释为什么匹配或不匹配
- 发现结构化抽取遗漏

## 10. 提示词设计

Agent 提示词必须高度结构化，不要开放式提问。

### Structuring Agent 提示词原则

- 明确字段定义
- 明确输出 JSON schema
- 明确缺失时填 null
- 明确不能编造

示例：

```text
你是一个招聘信息结构化助手。
任务：从输入简历中提取结构化字段。
要求：
1. 只能基于文本内容提取，禁止猜测
2. 若信息不存在，返回 null
3. 输出必须符合 JSON schema
4. 对每个关键字段给出 evidence_span
```

### Matching Agent 提示词原则

- 先判定硬约束
- 再做语义匹配
- 最后给出分维度得分和证据

示例：

```text
你是一个招聘匹配分析助手。
请比较候选人简历和职位描述。
按以下维度分别打分：技能、年限、行业、项目、教育、语言/地点。
每个维度输出：
- score
- matched_evidence
- missing_evidence
- confidence
禁止输出无法从输入中支持的判断。
```

## 11. API 设计

建议采用异步 API，因为文档解析和 Agent 推理一般不是秒级完成。

### 核心接口

`POST /api/resumes/upload`

- 上传简历文件
- 返回 `resume_id`

`POST /api/jds`

- 创建 JD
- 返回 `jd_id`

`POST /api/matches`

- 请求一次匹配任务
- 输入 `resume_id` 和 `jd_id`
- 返回 `task_id`

`GET /api/tasks/{task_id}`

- 查询任务状态：`queued` / `running` / `done` / `failed`

`GET /api/matches/{match_id}`

- 查询匹配结果详情

`POST /api/matches/batch`

- 对一个 JD 批量匹配多份简历

## 12. 人工复核机制

这是系统能不能真正落地的关键。

不要让 Agent 最终拍板，而要让它：

- 给出建议结论
- 暴露证据
- 标记低置信度项
- 提醒人工重点核查

建议加入：

- 低于置信度阈值自动人工复核
- 高风险岗位必须人工确认
- 审核员可修改结果并回写

## 13. 评估体系

没有评估，Agent 系统一定会漂。

你至少要准备一套标注集：

- 100 到 500 对简历-JD 样本
- 每对样本有人工标签：推荐 / 可考虑 / 不推荐
- 最好再有维度级标注

评估指标建议：

- 分类准确率
- Top-K 召回率
- 分数与人工判断的一致性
- 解释可接受率
- 平均延迟
- 单次成本

## 14. 风险点

### 14.1 幻觉

LLM 会把简历里没写的能力“脑补”出来。

解决：

- 强制 evidence_span
- 无证据不允许输出结论
- 用规则二次校验

### 14.2 偏见

招聘场景容易出现学历、年龄、性别、地域偏见。

解决：

- 禁止使用敏感属性参与打分
- 对提示词做偏见约束
- 保留人工审计日志

### 14.3 简历解析错误

PDF、表格、双栏简历很容易解析错。

解决：

- 保留原文段落映射
- 关键字段支持二次抽取
- 对低质量解析设置告警

### 14.4 数据安全

简历属于敏感个人信息。

必须做：

- 文件加密存储
- 访问控制
- 审计日志
- 数据最小化
- 脱敏展示
- 删除与保留策略

## 15. 安全设计要求

结合简历场景，最低要求如下：

- 所有上传文件先做类型、大小、病毒扫描校验
- API 必须做鉴权和速率限制
- 不把简历原文直接发给不可信第三方
- Prompt 中避免泄露企业内部岗位信息
- 对模型输入输出做日志分级，默认脱敏
- 不在代码里硬编码密钥
- 数据库存储采用参数化查询
- 针对下载、导出、批量搜索做权限隔离

## 16. 最适合新手的 MVP

不要一上来做多租户、批量推荐、复杂工作流。先做一个单岗位单简历匹配 MVP。

### MVP 范围

- 上传 1 份简历
- 输入 1 条 JD
- 自动解析
- 自动抽取结构化信息
- 输出总分和原因
- 显示证据片段

### MVP 技术选型

- 前端：Next.js
- 后端：FastAPI
- Agent 编排：LangGraph
- 数据库：PostgreSQL + pgvector
- 模型：一个 embedding 模型 + 一个推理模型

### MVP 开发顺序

1. 先把简历/JD 结构化
2. 再做规则打分
3. 再加 embedding 语义匹配
4. 最后接入 LLM 解释层

这样做最稳，因为前 3 步已经能跑出一个基础版本。

## 17. 推荐项目目录

```text
app/
  api/
    resumes.py
    jds.py
    matches.py
  agents/
    parser_agent.py
    structuring_agent.py
    matching_agent.py
    explanation_agent.py
  services/
    file_service.py
    embedding_service.py
    scoring_service.py
    audit_service.py
  repositories/
    resume_repository.py
    jd_repository.py
    match_repository.py
  schemas/
    resume_schema.py
    jd_schema.py
    match_schema.py
  workflows/
    match_workflow.py
  tests/
    test_structuring_agent.py
    test_matching_agent.py
    test_match_api.py
```

## 18. 一条可执行的落地路线

如果你是 agent 小白，建议按这个节奏推进：

### 第 1 周

- 明确输入输出
- 定义 JSON schema
- 手工写 20 个简历/JD 样本

### 第 2 周

- 做简历解析
- 做 JD 抽取
- 存入数据库

### 第 3 周

- 做规则评分
- 做总分聚合
- 做结果页面

### 第 4 周

- 加 embedding 相似度
- 加 LLM 解释
- 做评估与调参

## 19. 一句话架构结论

最适合你的方案不是“一个全自动大模型 Agent”，而是：

**一个以结构化抽取和规则评分为底座、以语义匹配和解释生成为增强层、以人工复核为闭环的多 Agent 招聘匹配系统。**

这套架构既能做 demo，也能逐步演进成生产系统。
