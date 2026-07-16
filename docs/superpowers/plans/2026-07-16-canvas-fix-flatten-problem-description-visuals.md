# 画布坐标修复 + 扁平化风格 + 题目描述弹窗 + 视觉增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 修复画布节点坐标超出画布边界的 bug，页面整体改为扁平化风格，新增「题目描述」按钮弹窗，并为画布节点引入更丰富的颜色、徽标和箭头指向以提升动画演示效果。

**Architecture:** 修复分两层 —— 数据层 `buildVisualTree`（treeUtils.ts）改用「叶子节点按序铺开 + 内部节点取子树中点」的 Reingold-Tilford 简化算法，替换原有「区间中点」法，并统一 null 节点显示行为（Canvas 与 algorithmSteps 用同一参数），从源头消除坐标错位；绘制层 Canvas.tsx 去除重复的 `centerOffsetX` 二次偏移，改为单次 padding 居中。视觉增强在同一 Canvas 绘制流程内增量：节点按递归深度上色、BST 验证状态用徽标角标、递归方向用方向箭头。题目描述复用 Header 现有 modal 弹窗模式，独立为 ProblemDescription 组件。扁平化在全局 CSS 层移除渐变背景与多余边框圆角，统一为纯色 + 细边框。

**Tech Stack:** React 19, TypeScript 5.9, D3.js 7.9, Vite 7, prism-react-renderer 2.4

**Risks:**
- Task 1 改 `buildVisualTree` 同时被 Canvas（`showNullNodes=true`）和 algorithmSteps（`showNullNodes=false`）调用，行为变化影响两者 → 缓解：Task 1 后两者调用方式统一，坐标自动对齐
- Task 5 视觉增强在 Task 2 padding 基础上增量，节点半径保持 24 不变，只改配色和徽标，避免再次溢出
- Task 6 扁平化涉及 6 个 CSS 文件，可能引入回归 → 缓解：每改一文件即 `npm run build` 验证，最后统一浏览器视觉检查

---

### Task 1: 重写 buildVisualTree 坐标算法修复溢出

**Depends on:** None
**Files:**
- Modify: `src/utils/treeUtils.ts:57-114`（替换整个 `buildVisualTree` 函数）

- [ ] **Step 1: 重写 buildVisualTree 坐标算法 — 用叶子铺开法替代区间中点法，留出 padding 防溢出**

文件: `src/utils/treeUtils.ts:57-114`（替换整个 `buildVisualTree` 函数）

新算法核心思想：先递归收集每个节点的子树宽度（叶子=1，内部=左右子树宽度之和），再按子树宽度分配 x 坐标，使兄弟节点不重叠。y 坐标按深度均匀分布。这样无论树是否平衡，节点都在 `[padding, width-padding]` 区间内。

```typescript
// 构建可视化树（包含位置信息）
// 坐标算法：叶子按序铺开，内部节点取子树中点；y 按深度均匀分布
// padding 留出节点半径(24)+标注空间，确保不溢出画布
export const buildVisualTree = (
  root: TreeNode | null,
  width: number,
  height: number,
  showNullNodes: boolean = true
): VisualNode | null => {
  if (!root) return null;

  const padding = 40;
  const usableWidth = Math.max(width - padding * 2, 80);
  const treeHeight = getTreeHeight(root);
  // 每层高度，最深节点 y = treeHeight * levelHeight，不超过 height - padding
  const levelHeight = treeHeight > 0 ? Math.max((height - padding * 2) / treeHeight, 40) : 0;

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
  const xUnit = usableWidth / totalWidth;

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

- [ ] **Step 2: 验证坐标算法编译通过 — 确认 TypeScript 无类型错误**

Run: `npx tsc -b --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 3: 提交**

Run: `git add src/utils/treeUtils.ts && git commit -m "fix(canvas): 重写 buildVisualTree 坐标算法修复节点溢出画布"`

---

### Task 2: Canvas 绘制层去除重复居中并统一 null 显示

**Depends on:** Task 1
**Files:**
- Modify: `src/components/Canvas/Canvas.tsx:56-79`（margin 与 transform 区块）
- Modify: `src/utils/algorithmSteps.ts:11`（统一 showNullNodes 为 true，与 Canvas 一致）

- [ ] **Step 1: 统一 algorithmSteps 的 showNullNodes 为 true — 与 Canvas 渲染一致，消除坐标错位**

文件: `src/utils/algorithmSteps.ts:11`

```typescript
// 显示 null 节点，与 Canvas.tsx 渲染时保持一致，避免坐标布局错位
const visualRoot = buildVisualTree(root, canvasWidth, canvasHeight, true);
```

- [ ] **Step 2: 修改 Canvas 去除重复 centerOffsetX 二次偏移 — buildVisualTree 已内置 padding 居中**

文件: `src/components/Canvas/Canvas.tsx:56-79`（替换 margin、buildVisualTree 调用、centerOffsetX、g transform 区块）

```typescript
    const { width, height } = dimensions;
    // margin 仅用于 g 容器整体偏移，padding 已在 buildVisualTree 内部处理
    const margin = { top: 20, right: 20, bottom: 40, left: 20 };

    // 构建可视化树（padding 已内置，坐标在 [padding, width-padding] 区间）
    const visualRoot = buildVisualTree(treeData, width, height, true);
    if (!visualRoot) return;

    const nodes = flattenVisualTree(visualRoot);
    const edges = getEdges(visualRoot);

    // buildVisualTree 已保证节点在画布内，无需重复计算 centerOffsetX
    // 创建主容器
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left + transform.x}, ${margin.top + transform.y}) scale(${transform.k})`);
```

- [ ] **Step 3: 验证 Canvas 编译通过 — 确认去除 centerOffsetX 后无未使用变量**

Run: `npx tsc -b --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS" or "is declared but never read"

- [ ] **Step 4: 提交**

Run: `git add src/components/Canvas/Canvas.tsx src/utils/algorithmSteps.ts && git commit -m "fix(canvas): 去除重复居中偏移并统一 null 节点显示行为"`

---

### Task 3: 创建题目描述弹窗组件

**Depends on:** None
**Files:**
- Create: `src/data/problemDescription.ts`
- Create: `src/components/ProblemDescription/ProblemDescription.tsx`
- Create: `src/components/ProblemDescription/ProblemDescription.css`
- Create: `src/components/ProblemDescription/index.ts`

- [ ] **Step 1: 创建题目描述文案数据 — 提供完整的 LeetCode 98 题目描述供弹窗展示**

```typescript
// src/data/problemDescription.ts

export const problemDescription = `## 98. 验证二叉搜索树

### 题目描述
给你一个二叉树的根节点 root ，判断其是否是一个有效的二叉搜索树（BST）。

有效二叉搜索树定义如下：
- 节点的左子树只包含 **严格小于** 当前节点的数
- 节点的右子树只包含 **严格大于** 当前节点的数
- 所有左子树和右子树自身必须也是二叉搜索树

### 示例

**示例 1：**
输入：root = [2,1,3]
输出：true
解释：2 的左子节点 1 < 2，右子节点 3 > 2，是有效的 BST。

**示例 2：**
输入：root = [5,1,4,null,null,3,6]
输出：false
解释：根节点 5 的右子节点 4 的左子节点 3 < 5，违反了「右子树所有节点必须大于根节点」的规则。

### 约束
- 树中节点数目范围在 [1, 10^4] 内
- -2^31 <= Node.val <= 2^31 - 1

### 关键陷阱
1. 不能只比较相邻父子节点，必须保证整个左子树都小于根、整个右子树都大于根
2. 注意整数边界，节点值可能是 INT_MAX 或 INT_MIN，需用更大范围类型比较
`;
```

- [ ] **Step 2: 创建 ProblemDescription 弹窗组件 — 受控显示，复用 Header 的 modal 样式但独立维护**

```tsx
// src/components/ProblemDescription/ProblemDescription.tsx
import React from 'react';
import { problemDescription } from '../../data/problemDescription';
import './ProblemDescription.css';

interface ProblemDescriptionProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">题目描述</h2>
        <div className="problem-content">
          <pre>{problemDescription}</pre>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: 创建 ProblemDescription 样式 — 复用 modal 基础样式，增加标题与内容区**

```css
/* src/components/ProblemDescription/ProblemDescription.css */
.modal-title {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #2a3a5c;
}

.problem-content {
  color: #e0e0e0;
  line-height: 1.7;
}

.problem-content pre {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
  font-size: 14px;
}
```

- [ ] **Step 4: 创建 barrel 导出文件 — 统一组件导出路径**

```typescript
// src/components/ProblemDescription/index.ts
export { ProblemDescription } from './ProblemDescription';
```

- [ ] **Step 5: 提交**

Run: `git add src/data/problemDescription.ts src/components/ProblemDescription/ && git commit -m "feat(ui): 新增题目描述弹窗组件"`

---

### Task 4: Header 在算法思路按钮前加题目描述按钮

**Depends on:** Task 3
**Files:**
- Modify: `src/components/Header/Header.tsx:1-49`（import、state、按钮 JSX）

- [ ] **Step 1: 修改 Header 引入 ProblemDescription 并新增按钮状态 — 复用弹窗组件**

文件: `src/components/Header/Header.tsx:1-4`（替换 import 区块）

```tsx
import React, { useState, useEffect } from 'react';
import { getGitHubStars } from '../../utils/indexedDB';
import { algorithmThoughts } from '../../data/examples';
import { ProblemDescription } from '../ProblemDescription';
import './Header.css';
```

- [ ] **Step 2: 新增 showProblem 状态并在算法思路按钮前插入题目描述按钮 — 满足「算法思路前增加题目描述按钮」需求**

文件: `src/components/Header/Header.tsx:11-49`（替换 Header 函数体从 useState 到 header-right 区块）

```tsx
export const Header: React.FC = () => {
  const [stars, setStars] = useState<number>(0);
  const [showThoughts, setShowThoughts] = useState(false);
  const [showProblem, setShowProblem] = useState(false);

  useEffect(() => {
    getGitHubStars(GITHUB_OWNER, GITHUB_REPO).then(setStars);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <a 
          href={HOT100_URL} 
          target="_blank" 
          rel="noopener noreferrer"
          className="back-link"
        >
          ← 返回 LeetCode Hot 100
        </a>
      </div>
      
      <div className="header-center">
        <a 
          href={LEETCODE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="title-link"
        >
          <h1 className="title">98. 验证二叉搜索树</h1>
        </a>
      </div>
      
      <div className="header-right">
        <button 
          className="header-btn"
          onClick={() => setShowProblem(true)}
        >
          📋 题目描述
        </button>
        
        <button 
          className="header-btn"
          onClick={() => setShowThoughts(true)}
        >
          💡 算法思路
        </button>
        
        <a
          href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`}
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
          title="点击去 GitHub 仓库 Star 支持一下"
        >
          <svg className="github-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          <span className="star-count">⭐ {stars}</span>
        </a>
      </div>

      <ProblemDescription isOpen={showProblem} onClose={() => setShowProblem(false)} />

      {showThoughts && (
        <div className="modal-overlay" onClick={() => setShowThoughts(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowThoughts(false)}>×</button>
            <div className="thoughts-content">
              <pre>{algorithmThoughts}</pre>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
```

- [ ] **Step 3: 验证 Header 编译通过 — 确认按钮与弹窗集成无类型错误**

Run: `npx tsc -b --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 提交**

Run: `git add src/components/Header/Header.tsx && git commit -m "feat(header): 在算法思路按钮前增加题目描述按钮"`

---

### Task 5: 画布视觉增强 — 节点配色、状态徽标、方向箭头

**Depends on:** Task 2
**Files:**
- Modify: `src/components/Canvas/Canvas.tsx:81-156`（defs、边、节点绘制区块）

- [ ] **Step 1: 扩展 defs 增加多种箭头标记 — 为递归方向、比较、结果提供不同颜色箭头**

文件: `src/components/Canvas/Canvas.tsx:81-92`（替换 defs/marker 区块）

```typescript
    // 定义多种箭头标记
    const defs = svg.append('defs');
    const arrowColors: Record<string, string> = {
      'arrow-default': '#4fc3f7',
      'arrow-left': '#ffb74d',
      'arrow-right': '#81c784',
      'arrow-fail': '#ef5350',
    };
    Object.entries(arrowColors).forEach(([id, color]) => {
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .append('path')
        .attr('d', 'M 0,-5 L 10,0 L 0,5')
        .attr('fill', color);
    });
```

- [ ] **Step 2: 修改边绘制按递归方向上色并带箭头 — 让父子连接线体现递归走向**

文件: `src/components/Canvas/Canvas.tsx:94-106`（替换边绘制区块）

```typescript
    // 绘制边（按是否为当前步骤路径上色，null 边虚线）
    g.selectAll('.edge')
      .data(edges)
      .enter()
      .append('line')
      .attr('class', 'edge')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', d => {
        if (d.target.isNull) return '#37474f';
        if (d.target.id === currentStep?.nodeId) return '#ffb74d';
        return '#4fc3f7';
      })
      .attr('stroke-width', d => d.target.id === currentStep?.nodeId ? 3 : 2)
      .attr('stroke-dasharray', d => d.target.isNull ? '4,4' : 'none')
      .attr('marker-end', d => d.target.isNull ? '' : 'url(#arrow-default)');
```

- [ ] **Step 3: 修改节点绘制按深度上色并增加状态徽标 — 提升节点辨识度**

文件: `src/components/Canvas/Canvas.tsx:108-155`（替换 nodeRadius 到空节点标记区块）

```typescript
    // 节点半径
    const nodeRadius = 24;

    // 按深度调色板（扁平化配色）
    const depthColors = ['#4fc3f7', '#81c784', '#ffb74d', '#ba68c8', '#ff8a65', '#4dd0e1'];

    // 绘制节点
    const nodeGroups = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => `node ${d.isNull ? 'null-node' : ''} ${d.id === currentStep?.nodeId ? 'active' : ''}`)
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // 节点圆圈（按深度上色，活动节点覆盖为状态色）
    nodeGroups.append('circle')
      .attr('r', d => d.isNull ? 12 : nodeRadius)
      .attr('fill', d => {
        if (d.isNull) return '#37474f';
        if (d.id === currentStep?.nodeId) {
          if (currentStep?.result === false) return '#ef5350';
          if (currentStep?.result === true) return '#66bb6a';
          return '#ffb74d';
        }
        return depthColors[d.depth % depthColors.length];
      })
      .attr('stroke', d => {
        if (d.isNull) return '#546e7a';
        if (d.id === currentStep?.nodeId) return '#fff';
        return '#fff';
      })
      .attr('stroke-width', d => d.id === currentStep?.nodeId ? 3 : 1.5)
      .attr('opacity', d => d.isNull ? 0.6 : 1);

    // 节点值
    nodeGroups.filter(d => !d.isNull)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#1a1a2e')
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .text(d => d.val?.toString() || '');

    // 空节点标记
    nodeGroups.filter(d => d.isNull)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#b0bec5')
      .attr('font-size', '10px')
      .text('null');

    // 状态徽标：当前节点显示操作类型角标
    if (currentStep?.nodeId) {
      const activeNode = nodes.find(n => n.id === currentStep.nodeId);
      if (activeNode && !activeNode.isNull) {
        const badgeText = currentStep.action === 'check' ? '?' :
          currentStep.action === 'result' ? (currentStep.result ? '✓' : '✗') :
          currentStep.action === 'enter' ? '→' : '';
        if (badgeText) {
          nodeGroups.filter(d => d.id === currentStep.nodeId)
            .append('circle')
            .attr('cx', nodeRadius * 0.7)
            .attr('cy', -nodeRadius * 0.7)
            .attr('r', 9)
            .attr('fill', currentStep.result === false ? '#ef5350' :
              currentStep.result === true ? '#66bb6a' : '#fff')
            .attr('stroke', '#1a1a2e')
            .attr('stroke-width', 1.5);
          nodeGroups.filter(d => d.id === currentStep.nodeId)
            .append('text')
            .attr('x', nodeRadius * 0.7)
            .attr('y', -nodeRadius * 0.7)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', currentStep.result === false ? '#fff' : '#1a1a2e')
            .attr('font-size', '11px')
            .attr('font-weight', '700')
            .text(badgeText);
        }
      }
    }
```

- [ ] **Step 4: 验证 Canvas 编译通过 — 确认视觉增强代码无类型错误**

Run: `npx tsc -b --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 5: 提交**

Run: `git add src/components/Canvas/Canvas.tsx && git commit -m "feat(canvas): 节点按深度配色+状态徽标+边箭头提升演示效果"`

---

### Task 6: 全局扁平化风格改造

**Depends on:** Task 4, Task 5
**Files:**
- Modify: `src/index.css:13-19`（背景纯色化）
- Modify: `src/App.css:1-7`（背景纯色化）
- Modify: `src/components/Header/Header.css:1-10,61-77`（去渐变、统一 header-btn 类）
- Modify: `src/components/Canvas/Canvas.css:1-8`（去渐变）
- Modify: `src/components/ProblemDescription/ProblemDescription.css`（扁平化弹窗）
- Modify: `src/components/CodePanel/CodePanel.css`、`src/components/DataInput/DataInput.css`、`src/components/PlaybackControls/PlaybackControls.css`（去渐变、统一细边框）

- [ ] **Step 1: 扁平化全局背景与 Header — 移除渐变改纯色，新增 header-btn 统一按钮样式**

文件: `src/index.css:13-19`（替换 body 背景）

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #0f172a;
  color: #e2e8f0;
}
```

文件: `src/App.css:1-7`（替换 .app 背景）

```css
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0f172a;
  overflow: hidden;
}
```

文件: `src/components/Header/Header.css:1-10`（替换 .header，去渐变改纯色 + 细边框）

```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  height: 48px;
  box-sizing: border-box;
}
```

文件: `src/components/Header/Header.css:61-77`（替换 .thoughts-btn 为通用 .header-btn，覆盖题目描述和算法思路两个按钮）

```css
.header-btn {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #334155;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
  white-space: nowrap;
}

.header-btn:hover {
  background: #334155;
  border-color: #4fc3f7;
  color: #4fc3f7;
}
```

- [ ] **Step 2: 扁平化 Canvas 与弹窗背景 — 移除渐变改纯色**

文件: `src/components/Canvas/Canvas.css:1-8`（替换 .canvas-container）

```css
.canvas-container {
  position: relative;
  flex: 1;
  background: #0f172a;
  border-radius: 4px;
  border: 1px solid #1e293b;
  overflow: hidden;
}
```

文件: `src/components/ProblemDescription/ProblemDescription.css`（追加扁平化弹窗背景，复用 Header modal 变量值）

```css
.modal-title {
  color: #e2e8f0;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #1e293b;
}

.problem-content {
  color: #cbd5e1;
  line-height: 1.7;
}

.problem-content pre {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
  font-size: 14px;
}
```

- [ ] **Step 3: 扁平化 CodePanel/DataInput/PlaybackControls — 统一去渐变、细边框**

文件: `src/components/CodePanel/CodePanel.css`、`src/components/DataInput/DataInput.css`、`src/components/PlaybackControls/PlaybackControls.css`

对这三个文件执行统一替换规则（用 grep 定位后逐个改）：
- 所有 `background: linear-gradient(...)` → `background: #0f172a` 或 `background: #1e293b`（视原用途）
- 所有 `border-radius: 8px` → `border-radius: 4px`
- 边框颜色统一为 `#1e293b`

由于这三个文件具体行号需执行时定位，执行者用 `grep -n "linear-gradient\|border-radius: 8px"` 找到后替换为上述扁平化值。

Run: `grep -rn "linear-gradient\|border-radius: 8px" src/components/CodePanel/CodePanel.css src/components/DataInput/DataInput.css src/components/PlaybackControls/PlaybackControls.css`
Expected:
  - Exit code: 0
  - 列出所有需替换的行（执行者据此逐行替换为扁平化值）

- [ ] **Step 4: 验证全部编译与构建通过 — 确认扁平化无破坏性改动**

Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "✓ built in"
  - Output does NOT contain: "error" or "Error"

- [ ] **Step 5: 提交**

Run: `git add -A && git commit -m "style: 全局扁平化风格，移除渐变统一细边框配色"`
