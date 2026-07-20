# 画布视觉增强 + 调试面板去单调化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 解决画布视觉单调与字体过小问题（说明文字 11px 看不清）、丰富"变量内存"与"调用栈"组件样式以消除单调感。所有改动直接在 main 分支提交（单主分支约束）。

**Architecture:** 数据流分两条独立链路：(1) 画布链路——`algorithmSteps.ts` 生成 `Annotation`/节点状态 → `Canvas.tsx` 用 D3 渲染 SVG 节点/边/标注，字体大小由常量 `ANNOTATION_FONT_SIZE` 控制（getBBox 测量与实际渲染共用此常量，改它测量自动同步）；(2) 调试面板链路——`CodePanel.tsx` 从 `currentStep.variables`/`callStack` 渲染 `.variable-item`/`.stack-frame`，样式由 `CodePanel.css` 控制。关键改动：放大画布字体（标注 11→14px、节点值 14→16px、空节点 10→12px、徽标 11→13px）+ 给节点加光晕阴影、给活动节点加脉冲动画、给标注加阴影提升层次；调试面板加类型色标、栈帧按 depth 缩进呈现递归深度、变量值用等宽高亮。为何这样做：标注测量与渲染共用 `ANNOTATION_FONT_SIZE` 常量，改一处即可同步，无需动测量逻辑。

**Tech Stack:** React 19, TypeScript 5.9, D3.js 7.9, Vite 7, CSS3（filter/drop-shadow/@keyframes 动画）

**Risks:**
- Task 1 放大节点值字体到 16px，需确认仍在直径 48px 圆内 → 缓解：16px 数值文字宽度远小于 48px，且 text-anchor=middle 居中，无溢出风险
- Task 1 新增 @keyframes 脉冲动画可能分散注意力 → 缓解：动画只作用于当前活动节点（`.node.active`），且幅度温和（光晕透明度 0.4↔0.8）
- Task 2、3 都改 CodePanel.tsx 和 CodePanel.css → 缓解：Task 2 改变量区块（CodePanel.tsx:124-129、CodePanel.css:155-175），Task 3 改栈帧区块（CodePanel.tsx:140-147、CodePanel.css:177-204），区块不重叠，顺序执行
- Task 2 新增变量类型色标依赖变量 name 前缀判断类型 → 缓解：用简单前缀匹配（root/root.val→蓝、lower/upper/new_lower/new_upper→橙、*Result/finalResult→绿、inRange→红），不匹配的默认灰，逻辑在 CodePanel.tsx 内联

---

### Task 1: 画布字体放大 + 视觉层次增强

**Depends on:** None
**Files:**
- Modify: `src/components/Canvas/Canvas.tsx:7-9`（字体常量）
- Modify: `src/components/Canvas/Canvas.tsx:147-164`（节点值/空节点字体）
- Modify: `src/components/Canvas/Canvas.tsx:166-195`（徽标尺寸字体）
- Modify: `src/components/Canvas/Canvas.tsx:231-262`（标注背景阴影）
- Modify: `src/components/Canvas/Canvas.css:83-102`（节点/边/标注样式 + 新增脉冲动画）

- [ ] **Step 1: 放大标注字体常量 — 11px 提升到 14px 解决说明文字看不清**

文件: `src/components/Canvas/Canvas.tsx:7-9`

测量与渲染共用此常量，改它后 getBBox 测得的宽度自动同步增大，标注背景会按新宽度重算，无需改测量逻辑。

```typescript
// 注解测量与渲染共用字体常量：测量和实际绘制必须用相同字体，否则 getBBox 宽度与渲染宽度脱钩
const ANNOTATION_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
const ANNOTATION_FONT_SIZE = '14px';
```

- [ ] **Step 2: 放大节点值与空节点字体 — 节点值 14→16px、空节点 10→12px**

文件: `src/components/Canvas/Canvas.tsx:147-164`

```typescript
    // 节点值
    nodeGroups.filter(d => !d.isNull)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#1a1a2e')
      .attr('font-size', '16px')
      .attr('font-weight', '700')
      .text(d => d.val?.toString() || '');

    // 空节点标记
    nodeGroups.filter(d => d.isNull)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#b0bec5')
      .attr('font-size', '12px')
      .text('null');
```

- [ ] **Step 3: 放大状态徽标尺寸与字体 — 徽标圆 r=9→11、字体 11→13px**

文件: `src/components/Canvas/Canvas.tsx:166-195`

```typescript
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
            .attr('cx', nodeRadius * 0.72)
            .attr('cy', -nodeRadius * 0.72)
            .attr('r', 11)
            .attr('fill', currentStep.result === false ? '#ef5350' :
              currentStep.result === true ? '#66bb6a' : '#fff')
            .attr('stroke', '#1a1a2e')
            .attr('stroke-width', 1.5);
          nodeGroups.filter(d => d.id === currentStep.nodeId)
            .append('text')
            .attr('x', nodeRadius * 0.72)
            .attr('y', -nodeRadius * 0.72)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', currentStep.result === false ? '#fff' : '#1a1a2e')
            .attr('font-size', '13px')
            .attr('font-weight', '700')
            .text(badgeText);
        }
      }
    }
```

- [ ] **Step 4: 标注背景增加阴影与圆角 — 提升标注层次感，rx=4→6 并加 drop-shadow**

文件: `src/components/Canvas/Canvas.tsx:253-262`

```typescript
        annotationG.append('rect')
          .attr('x', bgX)
          .attr('y', y - lineHeight / 2 - bgPadding)
          .attr('width', bgWidth)
          .attr('height', bgHeight)
          .attr('rx', 6)
          .attr('fill', getAnnotationBgColor(annotation.type))
          .attr('opacity', 0.95)
          .attr('stroke', getAnnotationBgColor(annotation.type))
          .attr('stroke-width', 1)
          .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))');
```

- [ ] **Step 5: 增强 Canvas.css 节点光晕、活动节点脉冲动画、标注阴影 — 消除画布单调感**

文件: `src/components/Canvas/Canvas.css:83-102`（替换 .node circle 到文件末尾的样式区块，新增脉冲动画和边动画）

```css
/* D3 节点样式 */
.node circle {
  transition: all 0.3s ease;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35));
}

.node.active circle {
  filter: drop-shadow(0 0 10px rgba(255, 183, 77, 0.85));
  animation: node-pulse 1.6s ease-in-out infinite;
}

@keyframes node-pulse {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(255, 183, 77, 0.5)); }
  50% { filter: drop-shadow(0 0 14px rgba(255, 183, 77, 0.9)); }
}

.node.null-node circle {
  opacity: 0.55;
}

.edge {
  transition: stroke 0.3s ease, stroke-width 0.3s ease;
}

.annotation text {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

- [ ] **Step 6: 验证编译通过 — 确认 Canvas 改动无类型错误**

Run: `npx tsc -b --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 7: 验证构建通过 — 确认 CSS 与 TSX 打包无错误**

Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "✓ built in"
  - Output does NOT contain: "error"

- [ ] **Step 8: 提交**
Run: `git add src/components/Canvas/Canvas.tsx src/components/Canvas/Canvas.css && git commit -m "feat(canvas): 放大标注节点字体并增强光晕脉冲动画提升演示层次"`

---

### Task 2: 变量内存面板样式丰富化

**Depends on:** Task 1
**Files:**
- Modify: `src/components/CodePanel/CodePanel.tsx:124-129`（变量项结构加类型色标）
- Modify: `src/components/CodePanel/CodePanel.css:155-175`（变量项样式去单调化）

- [ ] **Step 1: 变量项增加类型色标 dot — 按变量名前缀区分类型提升可读性**

文件: `src/components/CodePanel/CodePanel.tsx:124-129`

在 `.variable-item` 内增加一个按变量类型上色的色点 span。类型判断逻辑内联：root 开头→蓝、lower/upper/new_lower/new_upper→橙、含 Result→绿、inRange→红、其余→灰。同时把判断函数定义在组件内 `variables.map` 之前。

```typescript
              variables.map((v, idx) => {
                const varColor = (name: string): string => {
                  if (name.startsWith('root')) return '#4fc3f7';
                  if (name.includes('lower') || name.includes('upper')) return '#ffb74d';
                  if (name.includes('Result')) return '#66bb6a';
                  if (name === 'inRange') return '#ef5350';
                  return '#94a3b8';
                };
                return (
                  <div key={idx} className="variable-item">
                    <span className="variable-dot" style={{ background: varColor(v.name) }} />
                    <span className="variable-name">{v.name}</span>
                    <span className="variable-value">{v.value}</span>
                  </div>
                );
              })
```

- [ ] **Step 2: 增强变量项 CSS — 加色点、悬停高亮、左侧色条提升层次**

文件: `src/components/CodePanel/CodePanel.css:155-175`（替换 .variable-item 到 .variable-value 区块）

```css
.variable-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: rgba(30, 41, 59, 0.5);
  border-left: 3px solid transparent;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}

.variable-item:hover {
  background: rgba(79, 195, 247, 0.12);
  transform: translateX(2px);
}

.variable-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 4px currentColor;
}

.variable-name {
  color: #ffb74d;
  flex-shrink: 0;
  font-weight: 600;
}

.variable-value {
  color: #e2e8f0;
  text-align: right;
  word-break: break-all;
  margin-left: auto;
}
```

- [ ] **Step 3: 验证编译通过 — 确认 CodePanel 改动无类型错误**

Run: `npx tsc -b --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 提交**
Run: `git add src/components/CodePanel/CodePanel.tsx src/components/CodePanel/CodePanel.css && git commit -m "feat(codepanel): 变量内存项加类型色标与悬停动效消除单调"`

---

### Task 3: 调用栈面板样式丰富化

**Depends on:** Task 2
**Files:**
- Modify: `src/components/CodePanel/CodePanel.tsx:140-147`（栈帧结构加序号与深度缩进）
- Modify: `src/components/CodePanel/CodePanel.css:177-204`（栈帧样式去单调化）

- [ ] **Step 1: 栈帧增加序号与按 depth 缩进 — 直观呈现递归调用深度**

文件: `src/components/CodePanel/CodePanel.tsx:140-147`

栈帧 `slice().reverse()` 后，栈顶（idx=0）在最上方显示。`frame.depth` 已由 algorithmSteps 生成，用它做缩进：`paddingLeft = 8 + depth * 12`，让深层递归视觉上内缩。序号用倒序显示（栈顶为最新调用）。

```typescript
              callStack.slice().reverse().map((frame, idx) => {
                const frameNum = callStack.length - idx;
                return (
                  <div
                    key={idx}
                    className={`stack-frame ${idx === 0 ? 'stack-top' : ''}`}
                    style={{ paddingLeft: `${8 + frame.depth * 12}px` }}
                  >
                    <div className="frame-head">
                      <span className="frame-index">#{frameNum}</span>
                      <span className="frame-name">{frame.functionName}</span>
                    </div>
                    <span className="frame-node">node: {frame.nodeVal ?? 'null'}</span>
                    <span className="frame-range">({frame.lower}, {frame.upper})</span>
                  </div>
                );
              })
```

- [ ] **Step 2: 增强调用栈 CSS — 栈顶高亮、序号徽标、层级行布局提升层次**

文件: `src/components/CodePanel/CodePanel.css:177-204`（替换 .stack-frame 到 .frame-range 区块）

```css
.stack-frame {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
  border-left: 2px solid #334155;
  transition: background 0.2s, border-color 0.2s;
}

.stack-frame:hover {
  background: rgba(186, 104, 200, 0.1);
  border-left-color: #ba68c8;
}

.stack-frame.stack-top {
  background: rgba(79, 195, 247, 0.14);
  border-left: 3px solid #4fc3f7;
  box-shadow: 0 0 0 1px rgba(79, 195, 247, 0.25);
}

.frame-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.frame-index {
  display: inline-block;
  min-width: 22px;
  padding: 1px 5px;
  background: rgba(186, 104, 200, 0.25);
  color: #ce93d8;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
  text-align: center;
}

.frame-name {
  color: #b39ddb;
  font-size: 12px;
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
}

.frame-node,
.frame-range {
  color: #94a3b8;
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', monospace;
  padding-left: 28px;
}

.frame-range {
  color: #ffb74d;
}
```

- [ ] **Step 3: 验证编译通过 — 确认栈帧改动无类型错误**

Run: `npx tsc -b --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 验证构建通过 — 确认整体打包无错误**

Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "✓ built in"
  - Output does NOT contain: "error"

- [ ] **Step 5: 提交**
Run: `git add src/components/CodePanel/CodePanel.tsx src/components/CodePanel/CodePanel.css && git commit -m "feat(codepanel): 调用栈帧加序号徽标与深度缩进呈现递归层次"`
