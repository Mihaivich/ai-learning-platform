# PR 标题

fix: 修复登录用户静态课程进度未同步及刷新后丢失

## PR 正文（可复制到 GitHub）

登录用户完成静态课程活动后，Supabase 查询对象被直接 `void`，没有实际发出
进度和事件写入；重新加载又会用远端空记录或旧记录覆盖本地状态。
本次修复让写入真正执行，并保留未同步的账号进度，使刷新和网络故障后可以恢复、重试。

### 变更

- 提取账号级进度同步模块，显式等待 Supabase 查询并检查返回错误。
- 在一个本地缓存条目中同时保存进度、待同步快照和旧格式恢复标记，防止刷新丢失待写内容。
- 串行写入最新课时快照，避免较早的请求覆盖后续活动结果。
- 远端加载完成前显示加载状态；加载失败时恢复当前账号缓存，并提供同步失败提示和重试入口。
- 切换账号时取消旧请求并停止旧实例的状态更新，保持匿名及不同账号的数据隔离。
- 动态 UUID 课程继续由服务端记录学习证据，浏览器同步队列不会直接写入其完成记录。
- 添加真实 Supabase SDK + fetch stub 回归测试，以及使用实际 Provider 和页面组件的浏览器测试。
- 修正原有预览测试中与当前按钮文字不一致的选择器；更新存储语义和测试说明。

### 验证

- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm test`：6 个测试文件全部通过，包含原有数据库权限测试与新增同步测试。
- 新增同步回归用例：14 项通过，覆盖实际 HTTP 请求、刷新恢复、写入失败、网络异常、旧缓存、串行写入、账号隔离和存储恢复。
- `npm run test:e2e:progress`：4 项通过，覆盖登录学习与刷新、失败后刷新和重试、读取失败与账号切换、浏览器存储不可用。
- `npm run build`：通过。
- `npm run test:e2e`：原有 5 项端到端测试通过。

测试使用 Node.js 24.22.3 和 Chromium。Supabase HTTP 在自动化测试中模拟；
本次没有使用生产凭据，也未执行真实云端登录或数据库冒烟测试。
无需数据库迁移，未新增依赖。

### 边界

旧缓存与远端活动字段冲突时优先保留远端值；之后的新本地修改优先于旧远端快照。
已没有任何副本的历史进度无法恢复。事件采用独立的尽力写入，不根据旧进度补造事件。
队列只保证当前浏览器内的写入顺序，多设备或多标签页的同时编辑冲突仍需单独处理。

---

## 本地提交说明（无需粘贴到 PR）

当前修复分支：`fix/learner-progress-sync`。
它从本地 `origin/main` 对应的 `ccaad8b` 创建；修改尚未由本次助手提交或推送。

本次建议提交以下 12 个文件：

```text
README.md
package.json
playwright.config.ts
playwright.progress.config.ts
src/components/LessonPlayer.tsx
src/components/ProgressSyncStatus.tsx
src/lib/learner-store.tsx
src/lib/learner-sync.ts
tests/e2e/platform.spec.ts
tests/e2e/learner-progress.spec.ts
tests/learner-sync.test.ts
docs/PR_LEARNER_PROGRESS_SYNC.md
```

上次审查生成的 `docs/PROJECT_REVIEW.md` 和
`docs/pr-proposals/fix-learner-progress-sync.md` 是独立的审查与历史提案文档，
不在本次修复提交清单中。

在 VS Code 打开项目终端后执行：

```bash
git branch --show-current
git add README.md package.json playwright.config.ts playwright.progress.config.ts \
  src/components/LessonPlayer.tsx src/components/ProgressSyncStatus.tsx \
  src/lib/learner-store.tsx src/lib/learner-sync.ts \
  tests/e2e/platform.spec.ts tests/e2e/learner-progress.spec.ts \
  tests/learner-sync.test.ts docs/PR_LEARNER_PROGRESS_SYNC.md
git diff --cached --stat
git commit -m "fix: persist learner progress and recover pending sync"
git push -u origin fix/learner-progress-sync
```

第一条命令应显示 `fix/learner-progress-sync`。
也可以在 VS Code 源代码管理中对这 12 个文件逐个点 `+`，输入相同提交说明，
选择 Commit，再选择 Publish Branch，并将远端设为 `origin`。

推送后打开：

[创建 main ← fix/learner-progress-sync 的 PR](https://github.com/Brynn-Wang/ai-learning-platform/compare/main...fix/learner-progress-sync?expand=1)

确认 base repository 为 `Brynn-Wang/ai-learning-platform`、base 为 `main`、
compare 为 `fix/learner-progress-sync`，填入本文件的标题与 PR 正文，
检查 Files changed 后点击 Create pull request（需要草稿时选择 Create draft pull request）。

参见 [GitHub 官方创建 PR 说明](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request)。
