# GitHub Pages 自动部署流程修复与验证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 把本地领先远程 9 个 commit 的代码 push 上去，触发 GitHub Actions 自动部署 GitHub Pages，并验证线上部署的是最新代码。

**Architecture:** 调研结论已确认根因 —— `.github/workflows/deploy.yml` 配置完全正确（`push: branches: [main]` 触发 + `workflow_dispatch` 手动触发），Pages 也已设置为 `build_type: workflow` 从 main 分支构建。问题不在 workflow，而在 **本地 9 个 commit 从未 push 到 origin/main**（`git rev-list --count origin/main..HEAD` = 9），所以 GitHub 从未收到 push 事件，最后一次成功部署停留在 2025-12-21 的 `86aeb8d`。修复路径：提交本地遗留的 `package-lock.json` 改动 → push 全部 commit → 监听 Actions 运行 → 校验线上页面内容与本地最新 commit 一致。

**Tech Stack:** Git 2.x, GitHub Actions (actions/deploy-pages@v4), Vite 7, React 19, GitHub Pages (workflow 模式)

**Risks:**
- 本地 `package-lock.json` 有未提交改动（npm 重新生成的 `peer` 标记差异）→ 缓解：这是锁文件格式差异不影响构建，与代码一起提交后 push
- push 后 Actions 可能在 `npm ci` 步骤因锁文件不一致而失败 → 缓解：先本地 `npm ci && npm run build` 验证锁文件与构建一致
- push 是对外发布动作 → 缓解：用户已明确要求"把整个流程跑通"，且仓库为公开的个人算法可视化项目，授权明确

---

### Task 1: 提交遗留改动并 push 触发自动部署

**Depends on:** None
**Files:**
- Modify: `package-lock.json`（本地未提交的 peer 标记差异）
- Modify: `docs/superpowers/plans/2026-07-16-github-pages-auto-deploy.md`（本 Plan）

- [ ] **Step 1: 本地验证构建可过 — 确认锁文件与代码一致，CI 不会在 npm ci / build 失败**

```bash
npm ci && npm run build
```

Run: `npm ci && npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in" 或 "✓ built in"
  - Output does NOT contain: "ERR!" or "error TS"

- [ ] **Step 2: 提交本地遗留的 package-lock.json 改动 — 避免工作区脏状态污染 push**

```bash
git add package-lock.json docs/ && git commit -m "chore(deps): 同步 package-lock.json peer 标记 + 补充部署调试 plan"
```

Run: `git add package-lock.json docs/ && git commit -m "chore(deps): 同步 package-lock.json peer 标记 + 补充部署调试 plan"`
Expected:
  - Exit code: 0
  - Output contains: "main"
  - `git status -s` 之后输出为空（工作区干净）

- [ ] **Step 3: push 全部 commit 到 origin/main — 触发 GitHub Actions 自动部署**

```bash
git push origin main
```

Run: `git push origin main`
Expected:
  - Exit code: 0
  - Output contains: "To github.com:fuck-algorithm/leetcode-98-validate-binary-search-tree"
  - Output contains: "main -> main"

- [ ] **Step 4: 监听 Actions 运行直到结束 — 确认 build + deploy job 都成功**

Run: `gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`
Expected:
  - Exit code: 0
  - Output contains: "✓ build" 和 "✓ deploy"
  - 不出现 "✗" 或 "failure"

- [ ] **Step 5: 提交**

Run: 无需单独提交（Task 1 的提交已在 Step 2 完成，push 是对外发布而非代码提交）

---

### Task 2: 验证线上部署的是最新代码

**Depends on:** Task 1
**Files:**
- 无文件修改，纯验证任务

- [ ] **Step 1: 确认最新一次 Actions 运行对应最新 commit — 验证 push 触发的就是本地最新代码**

Run: `gh run list --limit 1`
Expected:
  - Output 中 commit message 为最新 commit（`chore(deps): 同步 package-lock.json peer 标记 + 补充部署调试 plan` 或前一个 `fix(datainput): 合并输入数据与样例为一行`）
  - Status 列为 "success" 或 "completed"
  - Event 列为 "push"

- [ ] **Step 2: 比对远程 commit 与本地 HEAD — 确认 push 后远程与本地一致**

Run: `git rev-list --count origin/main..HEAD && git rev-list --count HEAD..origin/main`
Expected:
  - 第一个输出: 0（本地不再领先远程）
  - 第二个输出: 0（远程不再领先本地）
  - 两行都为 0，说明本地与远程完全同步

- [ ] **Step 3: 抓取线上 Pages 页面 — 确认部署成功且可访问**

Run: `curl -sI https://fuck-algorithm.github.io/leetcode-98-validate-binary-search-tree/ | head -5`
Expected:
  - Exit code: 0
  - Output contains: "HTTP/2 200" 或 "HTTP/1.1 200"
  - Output does NOT contain: "404"

- [ ] **Step 4: 比对线上页面与本地最新代码的关键标记 — 确认线上跑的是新版本**

本地最新代码（`57fbfe6 fix(datainput): 合并输入数据与样例为一行` 及之前 9 个 commit）新增了「变量内存面板」「调用栈面板」「主行聚焦高亮」等功能。抓取线上 HTML，确认其引用的 JS 资源哈希与本地 `dist/` 一致。

Run: `ls dist/assets/*.js && curl -s https://fuck-algorithm.github.io/leetcode-98-validate-binary-search-tree/ | grep -o 'assets/[^"]*\.js'`
Expected:
  - Exit code: 0
  - 第一条命令输出本地 dist 中的 JS 文件名（含 hash）
  - 第二条命令输出线上 HTML 引用的 JS 路径
  - 两者的文件名 hash 前缀一致（说明线上是最新构建产物）

- [ ] **Step 5: 提交**

Run: 无需提交（纯验证任务，未产生代码变更）
