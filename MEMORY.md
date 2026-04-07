# Memory 子系统分析笔记

> 分析时间：2026-04-07

## 核心文件位置

| 路径                                                         | 职责                         |
| ------------------------------------------------------------ | ---------------------------- |
| `extensions/memory-core/src/memory/manager.ts`               | 核心调度器（本文分析对象）   |
| `extensions/memory-core/src/memory/manager-embedding-ops.ts` | Embedding batch/retry/cache  |
| `extensions/memory-core/src/memory/manager-search.ts`        | 向量/FTS 查询 SQL            |
| `extensions/memory-core/src/memory/hybrid.ts`                | BM25 + 向量混合融合          |
| `extensions/memory-lancedb/`                                 | LanceDB 向量存储后端（可选） |
| `packages/memory-host-sdk/`                                  | Memory host SDK 接口         |

---

## MemoryIndexManager 整体定位

`MemoryIndexManager` 是 memory 子系统的核心调度器，负责：

- 管理 SQLite 数据库（存储 files / chunks / 向量 / FTS）
- 调度 embedding provider（本地 / 远程 / fallback）
- 执行 sync（把 workspace 文件 / session 内容写入索引）
- 执行 search（向量搜索 + FTS 关键词搜索 + hybrid 融合）

继承关系：

```
MemoryIndexManager
  extends MemoryManagerEmbeddingOps  ← embedding batch/retry/cache
  implements MemorySearchManager     ← search/sync/status/close 接口
```

---

## 单例缓存机制

- 缓存挂在 `global`（`resolveGlobalSingleton`），`vi.resetModules()` 后旧 manager 仍可被 `close()`
- key = `agentId + workspaceDir + settings + purpose`
- `purpose="status"` 时直接 new，不缓存（只读状态查询）
- 并发请求同一 key 时共享同一个 `INDEX_CACHE_PENDING` Promise

---

## 构造函数初始化顺序

1. 打开 SQLite（`openDatabase()`）
2. 初始化 schema（`ensureSchema()`）
3. 读取 meta（向量维度等）
4. 启动三个后台机制（非 status 模式）：
   - `ensureWatcher()` — chokidar 监听 workspace 文件变化
   - `ensureSessionListener()` — 监听 session 文件写入
   - `ensureIntervalSync()` — 定时触发 sync
5. Provider 初始化是**懒加载**的，不在构造函数里阻塞

---

## Embedding Provider 懒加载

```
ensureProviderInitialized() → loadProviderResult() → createEmbeddingProvider()
```

- 并发调用共享同一个 `providerInitPromise`
- 支持 fallback 链：本地 → 远程 → FTS-only
- provider 完全不可用时降级为 **FTS-only 模式**（`this.provider = null`）

---

## search() 流程

```
query
  → warmSession（首次触发 sync）
  → dirty 检查 → 触发后台 sync
  → hasIndexedContent 检查（无内容直接返回 []）
  → ensureProviderInitialized()

FTS-only 模式（provider = null）:
  extractKeywords → 多关键词 searchKeyword → 去重合并 → 分数过滤

有 provider 模式:
  keywordResults = searchKeyword(query)    // FTS BM25
  queryVec      = embedQueryWithTimeout()  // 向量化
  vectorResults = searchVector(queryVec)   // ANN 搜索

  hybrid 关闭 → 直接返回 vectorResults
  hybrid 开启 → mergeHybridResults(vector + keyword, weights, MMR, temporalDecay)
             → minScore 过滤
             → 若 strict 为空且有 keyword 命中 → relaxedMinScore 兜底
```

**关键设计**：keyword-only 命中分数上限 = `textWeight`（如 0.3），可能低于 `minScore`（如 0.35），所以有 `relaxedMinScore` 兜底逻辑。

---

## sync() 并发控制

```
sync() 调用
  ↓
  this.syncing 已存在？
    有 sessionFiles → enqueueTargetedSessionSync（排队，等当前 sync 完再跑）
    无 sessionFiles → 直接等当前 sync
  ↓
  否则 → runSyncWithReadonlyRecovery()
```

**Readonly 恢复**：捕获 `SQLITE_READONLY` 错误 → 关闭旧连接 → 重新 `openDatabase()` → 重置 vectorReady → 重试一次。

---

## status() 返回内容

- files / chunks 数量（按 source 分组）
- provider / model / fallback 信息
- FTS / vector 可用状态
- batch embedding 失败计数
- readonly recovery 统计（attempts / successes / failures）
- dirty 标志（是否有未同步内容）

---

## close() 清理顺序

1. 标记 `closed = true`（阻止新 sync 进入）
2. 清除所有 timer（watchTimer、sessionWatchTimer、intervalTimer）
3. 关闭 chokidar watcher
4. 取消 session 订阅
5. 等待进行中的 sync 和 providerInit 完成
6. 关闭 SQLite
7. 从 `INDEX_CACHE` 删除自己
