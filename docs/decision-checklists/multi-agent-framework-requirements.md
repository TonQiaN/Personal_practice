# Multi-Agent 框架拍板清单

这个文件用于整理“在把当前项目演进为 multi-agent 框架之前，需要用户拍板的内容”。

目标：

- 明确 multi-agent 的边界和运行方式
- 避免架构先复杂化再返工
- 让后续实现可以稳定推进

---

## 1. 第一阶段要落地哪些 Agent

你接受的推荐结构是：

- Resume Parser Agent
- JD PDF Agent
- Normalization Agent
- Matching Agent
- Ranking Agent
- Explanation Agent

需要你确认的是：

- [ ] 第一阶段全部都做
- [ ] 先做输入侧 Agent：Resume + JD PDF
- [ ] 先做到 Matching + Ranking + Explanation 解耦
- [ ] 你来决定

- 建议默认值：
  - 先做 Resume Parser Agent
  - 先做 JD PDF Agent
  - 先把 Matching / Ranking / Explanation 拆开
  - Normalization 保留为共享层，而不是单独复杂 Agent

- 你的回答：默认

---

## 2. Multi-Agent 的运行方式

你希望这些 Agent 如何协作？

- [ ] 固定工作流串行执行
- [ ] 固定工作流 + 条件分支
- [ ] Agent 自主路由
- [ ] 你来决定

- 建议默认值：
  - 固定工作流 + 条件分支

- 原因：
  - 更稳定
  - 更适合 Demo 到产品演进
  - 更容易调试和写日志

- 你的回答：默认

---

## 3. LangGraph 图的拆分方式

你希望是：

- [ ] 一个总图，所有 Agent 都在一个 LangGraph 里
- [ ] 每个 Agent 一个独立图
- [ ] 重要 Agent 独立图，匹配主流程再编排它们
- [ ] 你来决定

- 建议默认值：
  - 重要 Agent 独立图，主流程编排它们

- 你的回答：默认

---

## 4. Agent 之间的数据契约

你是否接受：

- 所有 Agent 之间只传结构化 JSON
- 不直接互传自由文本
- 每个 Agent 都有明确 schema

- [ ] 接受
- [ ] 不接受
- [ ] 你来决定

- 建议默认值：
  - 接受

- 你的回答：接受

---

## 5. 用户上传 JD PDF 后的交互

你已经确定：

- 上传后解析
- 展示结果
- 用户确认后进入匹配

还需要确认的是：

- [ ] 用户确认前不能进入匹配
- [ ] 用户可以跳过确认直接使用
- [ ] 两种都支持
- [ ] 你来决定

- 建议默认值：
  - 用户确认前不能进入匹配

- 你的回答：接受

---

## 6. 自定义 JD 的 session 生命周期

你之前已经拍板：

- 当前 session 内可新增和修改 JD
- 不持久化保存

对于 JD PDF Agent 产出的 JD，也需要明确：

- [ ] 只在当前页面内有效
- [ ] 只在当前 session 内有效
- [ ] 保存到本地文件
- [ ] 你来决定

- 建议默认值：
  - 当前 session 内有效

- 你的回答：保存到本地，所有的JD内容都保存到数据库

---

## 7. Resume Parser Agent 是否也要独立化

你现在已有简历解析流程，但还没正式定义是否升级成独立 Agent。

- [ ] 要，和 JD PDF Agent 对称
- [ ] 暂时不要，先保留现有实现
- [ ] 你来决定

- 建议默认值：
  - 要，保持输入链路对称

- 你的回答：默认

---

## 8. Normalization Agent 的角色

这里最容易设计过度。

你希望：

- [ ] 做成独立 Agent
- [ ] 做成共享 service 层
- [ ] 你来决定

- 建议默认值：
  - 第一版先做共享 service 层

- 原因：
  - 它更像标准化逻辑，不一定需要独立 agent 语义

- 你的回答：默认

---

## 9. Ranking Agent 的职责边界

你希望 Ranking Agent 只做什么？

- [ ] 只做排序
- [ ] 排序 + 推荐分档
- [ ] 排序 + 推荐分档 + Top 3 高亮
- [ ] 你来决定

- 建议默认值：
  - 排序 + 推荐分档 + Top 3 高亮

- 你的回答：默认

---

## 10. Explanation Agent 的输出形式

你之前拍板是“一段简短说明”。

现在需要确认 multi-agent 后是否仍保持：

- [ ] 保持一段简短说明
- [ ] 改成结构化说明（优势/风险/缺失）
- [ ] 两种都要
- [ ] 你来决定

- 建议默认值：
  - 两种都要：内部结构化，前端默认展示简短说明

- 你的回答：说明需要详细一点，合适要说合适的原因，不合适要说不合适的原因，要有证据

---

## 11. 日志系统如何适配 multi-agent

你已经要求独立日志能力。

还需要确认：

- [ ] 所有 Agent 共用一套运行日志
- [ ] 每个 Agent 单独日志文件
- [ ] 共用主日志 + Agent 类型字段
- [ ] 你来决定

- 建议默认值：
  - 共用主日志 + `agent_name` / `graph_name` 字段
  - JD PDF Agent 额外打独立事件类型

- 你的回答：默认

---

## 12. 错误处理策略

当某个 Agent 失败时，你希望主流程怎么做？

- [ ] 整体失败
- [ ] 返回部分结果
- [ ] 对非关键 Agent 允许降级
- [ ] 你来决定

- 建议默认值：
  - 对关键输入 Agent 失败时整体失败
  - 对 Explanation Agent 允许降级

- 你的回答：默认

---

## 13. 是否要保留单 Agent 模式

为了调试和回退，是否保留当前简单流程作为 fallback？

- [ ] 保留
- [ ] 不保留
- [ ] 你来决定

- 建议默认值：
  - 保留

- 原因：
  - 方便回归
  - 方便比较新旧流程输出差异

- 你的回答：保留

---

## 14. 第一阶段的验收标准

当 multi-agent 第一阶段完成时，你希望至少达到什么效果？

- [ ] JD PDF 可独立解析
- [ ] Resume 和 JD 都有独立 Agent
- [ ] 匹配、排序、解释职责拆分清晰
- [ ] 前端流程可以完整跑通
- [ ] 日志能区分不同 Agent
- [ ] 其他：

- 建议默认值：
  - JD PDF 可独立解析
  - Resume 和 JD 有独立输入链
  - Matching / Ranking / Explanation 已拆分
  - 前端完整跑通
  - 日志能区分 Agent

- 你的回答：默认

---

## 推荐默认方案

如果你想快速推进，可以直接采用这套默认值：

1. 第一阶段先做 Resume Parser Agent、JD PDF Agent、Matching Agent、Ranking Agent、Explanation Agent
2. 运行方式：固定工作流 + 条件分支
3. 图拆分：重要 Agent 独立图，主流程统一编排
4. 数据契约：只传结构化 JSON
5. JD PDF 解析后必须用户确认才能进入匹配
6. 自定义 JD：当前 session 内有效
7. Resume Parser Agent 也独立化
8. Normalization 暂时作为共享 service 层
9. Ranking Agent 负责排序 + 推荐分档 + Top 3 高亮
10. Explanation 内部结构化，前端默认显示简短说明
11. 日志：共用主日志 + agent 字段
12. 错误处理：关键输入 Agent 失败则整体失败，Explanation 可降级
13. 保留当前简单流程作为 fallback
14. 验收：输入链独立、输出链清晰、前端跑通、日志可区分 Agent
