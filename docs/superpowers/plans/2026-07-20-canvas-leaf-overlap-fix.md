# 画布叶子节点重叠遮挡修复 + 推送触发部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 修复画布中叶子节点圆圈互相重叠遮挡的问题（计算树位置时纳入节点直径约束），并把本地 7 个 commit push 到 main 触发 GitHub Actions 自动部署，验证线上为最新代码。

**Architecture:** 根因在 `buildVisualTree`（treeUtils.ts:59-128）——当前 `xUnit = usableWidth / totalWidth` 只保证节点坐标在画布内，未保证相邻节点间距 ≥ 节点直径。当叶子数 ≥ 15 时间距 < 48px 直径导致重叠。修复：引入 `nodeRadius` 参数（与 Canvas 的 nodeRadius=24 对齐），算出 `minGap = nodeRadius*2 + 8`（56px），`requiredWidth = totalWidth * minGap`，实际可用宽度取 `max(usableWidth, requiredWidth)`——节点永远不重叠，树若过宽则撑出画布（用户用 d3 zoom 平移查看，优于重叠）。数据流：buildVisualTree(tree, width, height, nodeRadius) → 节点坐标保证不重叠 → Canvas 渲染 + algorithmSteps 标注坐标同比例放大。GitHub Action 已配置 `push: branches:[main]`，单主分支下任何 push 即触发，无需改 workflow，只需 push 本地 7 个 commit。

**Tech Stack:** TypeScript 5.9, D3.js 7.9, React 19, Vite 7, GitHub Actions (actions/deploy-pages@v4)

**Risks:**
- Task 1 改 buildVisualTree 签名增加 nodeRadius 参数，Canvas.tsx:61 和 algorithmSteps.ts:12 两处调用需同步传参 → 缓解：nodeRadius 设默认值 24，两处显式传 24 保持一致
- 撑宽后树可能超出画布右侧不可见 → 缓解：d3 zoom 已支持平移，Canvas 有重置按钮；这是"可平移查看"明确优于"重叠遮挡"的取舍，符合用户"把叶子节点考虑进去"的意图
- Task 2 push 是对外发布 → 缓解：用户已要求单主分支直接推送，且要求"任何变更都触发部署"，授权明确

---

### Task 1: 修复 buildVisualTree 纳入节点直径约束消除叶子重叠

**Depends on:** None
**Files:**
- Modify: `src/utils/treeUtils.ts:56-128`（替换整个 buildVisualTree 函数）
- Modify: `src/components/Canvas/Canvas.tsx:61`（调用处传 nodeRadius）
- Modify: `src/utils/algorithmSteps.ts:12`（调用处传 nodeRadius）

- [ ] **Step 1: 重写 buildVisualTree 增加节点直径约束 — 保证相邻节点不重叠，树过宽则撑宽画布**

文件: `src/utils/treeUtils.ts:56-128`（替换整个 buildVisualTree 函数）

新逻辑：增加 `nodeRadius` 参数（默认 24），算最小间距 `minGap = nodeRadius*2 + 8`，`requiredWidth = totalWidth * minGap`，实际可用宽度 `effectiveWidth = max(usableWidth, requiredWidth)`。这样节点间距永远 ≥ minGap，不重叠；树过宽时坐标超出画布但可通过 d3 平移查看。

```typescript
// 构建可视化树（包含位置信息）
// 坐标算法：叶子按序铺开，内部节点取子树中点；y 按深度均匀分布
// nodeRadius 纳入约束：相邻节点最小间距 = nodeRadius*2 + 8，保证不重叠
// 树过宽时按 requiredWidth 撑宽画布，超出部分用 d3 zoom 平移查看（优于重叠遮挡）
export const buildVisualTree = (
  root: TreeNode | null,
  width: number,
  height: number,
  showNullNodes: boolean = true,
  nodeRadius: number = 24
): VisualNode | null => {
  if (!root) return null;

  const padding = 40;
  const usableWidth = Math.max(width - padding * 2, 80);
  const treeHeight = getTreeHeight(root);
  // 每层高度，最深节点 y = treeHeight * levelHeight，不超过 height - padding
  const levelHeight = treeHeight > 0 ? Math.max((height - padding * 2) / treeHeight, 40) : 0;

  // 相邻节点最小间距：直径 + 8px 间隙，确保叶子节点圆圈不重叠
  const minGap = nodeRadius * 2 + 8;

  let nodeId = 0;

  // 计算子树宽度（叶子=1，内部=左右子树宽度之和）
  const subtreeWidth = (node: TreeNode | null, depth: number): number => {
    if (!node) {
      // null 节点在显示时占 1 宽度，且不深入超过 treeHeight+1 层
      if (showNullNodes && depth <= treeHeight) return 1;
      return 0;
    }
    const lw = subtreeWidth(node.left, depth + 1);
    const rw = subtreeWidth(node.right, depth + 1);
    return lw + rw || 1; // 叶子节点（无子节点显示）宽度为 1
  };

  const totalWidth = subtreeWidth(root, 0) || 1;
  // 实际可用宽度：取画布可用宽度与「不重叠所需宽度」的较大值
  const requiredWidth = totalWidth * minGap;
  const effectiveWidth = Math.max(usableWidth, requiredWidth);
  const xUnit = effectiveWidth / totalWidth;

  const buildNode = (
    node: TreeNode | null,
    depth: number,
    leftX: number,
    parent: VisualNode | null,
    parentHasThisChild: boolean = true
  ): VisualNode | null => {
    if (!node && !showNullNodes) return null;
    if (!node && !parentHasThisChild) return null;
    if (!node && depth > treeHeight + 1) return null;

    const sw = subtreeWidth(node, depth) || 1;
    // 当前节点子树占据 [leftX, leftX + sw*xUnit] 区间，节点居中
    const x = leftX + (sw * xUnit) / 2 + padding;
    const y = depth * levelHeight + padding;

    const visualNode: VisualNode = {
      id: `node-${nodeId++}`,
      val: node ? node.val : null,
      x,
      y,
      left: null,
      right: null,
      parent,
      isNull: !node,
      depth,
    };

    if (node) {
      const lw = subtreeWidth(node.left, depth + 1);
      visualNode.left = buildNode(node.left, depth + 1, leftX, visualNode, true);
      visualNode.right = buildNode(node.right, depth + 1, leftX + lw * xUnit, visualNode, true);
    }

    return visualNode;
  };

  return buildNode(root, 0, 0, null, true);
};
```

- [ ] **Step 2: 修改 Canvas 调用处显式传 nodeRadius=24 — 与渲染节点半径对齐**

文件: `src/components/Canvas/Canvas.tsx:61`

```typescript
    // 构建可视化树（padding 已内置，坐标在 [padding, width-padding] 区间；nodeRadius 约束保证不重叠）
    const visualRoot = buildVisualTree(treeData, width, height, true, 24);
```

- [ ] **Step 3: 修改 algorithmSteps 调用处显式传 nodeRadius=24 — 与 Canvas 坐标布局一致**

文件: `src/utils/algorithmSteps.ts:12`

```typescript
  // 显示 null 节点，与 Canvas.tsx 渲染时保持一致，避免坐标布局错位
  const visualRoot = buildVisualTree(root, canvasWidth, canvasHeight, true, 24);
```

- [ ] **Step 4: 验证编译通过 — 确认签名变更无类型错误**

Run: `npx tsc -b --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 5: 实测验证叶子节点不重叠 — 确认完全二叉树 15 节点间距 ≥ 56px**

Run: `npx tsx -e "import {buildTreeFromArray,buildVisualTree,flattenVisualTree} from './src/utils/treeUtils'; const t=buildTreeFromArray([8,4,12,2,6,10,14,1,3,5,7,9,11,13,15]); const r=buildVisualTree(t,778,687,true,24); const ns=flattenVisualTree(r!); const byD=new Map<number,number[]>(); for(const n of ns){if(!byD.has(n.depth))byD.set(n.depth,[]);byD.get(n.depth)!.push(n.x);} const deepest=[...byD.entries()].sort((a,b)=>b[0]-a[0])[0]; const xs=deepest[1].sort((a,b)=>a-b); let g=Infinity;for(let i=1;i<xs.length;i++)g=Math.min(g,xs[i]-xs[i-1]); console.log('minGap='+g.toFixed(1)+'px (需>=56) '+(g>=56?'✓不重叠':'❌重叠'));" 2>&1 | grep -v "NODE_TLS\|trace-warnings"`
Expected:
  - Exit code: 0
  - Output contains: "✓不重叠"
  - Output does NOT contain: "❌重叠"

- [ ] **Step 6: 提交**

Run: `git add src/utils/treeUtils.ts src/components/Canvas/Canvas.tsx src/utils/algorithmSteps.ts && git commit -m "fix(canvas): 坐标计算纳入节点直径约束，消除叶子节点重叠遮挡"`

---

### Task 2: push 到 main 触发部署并验证线上为最新代码

**Depends on:** Task 1
**Files:**
- 无文件修改，纯部署验证任务

- [ ] **Step 1: 确认 GitHub Action 触发条件已满足 — 验证 workflow 在单主分支下覆盖任何变更**

Run: `cat .github/workflows/deploy.yml | grep -A3 "^on:"`
Expected:
  - Exit code: 0
  - Output contains: "push:" and "branches: [ main ]"
  - 说明：单主分支工作流下，main 的任何 push 即触发，无需 paths 过滤

- [ ] **Step 2: 本地构建验证 — 确保 push 前 CI 不会失败**

Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "✓ built in"
  - Output does NOT contain: "error"

- [ ] **Step 3: push 到 origin/main — 触发 GitHub Actions 自动部署**

Run: `git push origin main`
Expected:
  - Exit code: 0
  - Output contains: "main -> main"

- [ ] **Step 4: 监听 Actions 运行直到成功 — 确认 build + deploy 通过**

Run: `sleep 5 && gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`
Expected:
  - Exit code: 0
  - Output contains: "✓ build" and "✓ deploy"

- [ ] **Step 5: 验证线上部署的是最新 commit — 比对远程与本地 HEAD**

Run: `git rev-list --count origin/main..HEAD && git rev-list --count HEAD..origin/main`
Expected:
  - 第一个输出: 0（本地不再领先远程）
  - 第二个输出: 0（远程不再领先本地）

- [ ] **Step 6: 提交**

Run: 无需提交（Task 1 已提交代码，Task 2 是 push 部署验证，无代码变更）
