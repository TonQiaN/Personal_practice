# Session Records

这个目录用于记录每个 session 做了什么。

目标：

- 按时间保留每次 session 的简要总结
- 让下一个 session 只看最新一份记录，就能快速了解上一次做了什么
- 降低跨 session 接力的上下文成本

## 约定

- 同一整次会话只维护一份 session 记录
- 如果当前会话还在继续，不新开文件，而是在当前这份记录后面追加内容
- 只有开始一轮新的独立会话时，才新建一份记录
- 文件名按首次创建该 session 记录的时间命名
- 推荐格式：

```text
YYYY-MM-DD-HHMM.md
```

例如：

```text
2026-03-12-1015.md
```

## 每份记录建议包含

- 本次目标
- 本次完成内容
- 关键修改文件
- 验证结果
- 遇到的问题
- 下一步建议

## 使用方式

下一个 session 开始时，优先阅读：

1. 本目录下 `LATEST.md` 指向的文件
2. `docs/current-state.md`
3. `docs/backlog.md`
4. `docs/codex_error.md`
