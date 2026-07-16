# BST 可视化器 UI 与调试效果优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 优化验证二叉搜索树可视化器的 6 处体验问题：画布内容随画布尺寸自适应、控制面板按钮居中、【输入数据】与【样例】合并为一行、代码高亮聚焦单行、代码面板新增变量内存值与调用栈展示、动画注解面板根据文案自适应宽度。

**Architecture:** 用户在 DataInput 输入/选择数据 → App 构建 TreeNode → Canvas 用 ResizeObserver 测得真实画布尺寸后调用 `generateAlgorithmSteps(tree, width, height)` 生成步骤（含节点坐标、变量、栈帧、注解）→ Canvas 用 d3 绘制树与注解（注解宽度用真实文本测量）→ CodePanel 渲染代码（单行主高亮）+ 变量内存面板 + 调用栈面板。核心改造：把算法步骤生成从 App.tsx 的写死尺寸下沉到 Canvas 内基于实测尺寸生成，并通过 `useEffect` 重新生成以保证尺寸变化时坐标正确。

**Tech Stack:** React 19.2, TypeScript 5.9, Vite 7.2, d3 7.9（zoom/selection）, prism-react-renderer 2.4, ESLint 9.39。无新增依赖。

**Risks:**
- Task 1 把步骤生成下沉到 Canvas，会改变状态归属与渲染时机，可能引入"先渲染空树后渲染步骤"的闪烁 → 缓解：Canvas 内合并 treeData+dimensions 为单一 useEffect，步骤生成后通过回调传回 App，App 仍持有 steps 作为单一数据源
- Task 3 把多行高亮改单行，可能丢失"代码块整体执行"语义 → 缓解：保留 `codeLines` 数组，新增 `primaryLine` 字段，CSS 仅对 `primaryLine` 加强高亮，其余行用弱标记
- Task 2 用 SVG `getBBox` 真实测量需先 append 不可见文本 → 缓解：先 append 测量再画背景再移到最终位置，避免双重绘制开销（注解数量有限）

---

### Task 1: 画布尺寸与算法步骤解耦 — 内容随画布大小自适应

**Depends on:** None
**Files:**
- Modify: `src/App.tsx:14-51`（移除写死 600×350，改为接收 Canvas 回传的实测尺寸后再生成步骤）
- Modify: `src/components/Canvas/Canvas.tsx:12-261`（新增 onDimensionsChange 回调，把实测尺寸上报 App）

- [ ] **Step 1: 给 Canvas 增加 onDimensionsChange 回调 — 把实测画布尺寸上报给 App**
文件: `src/components/Canvas/Canvas.tsx:7-30`

```typescript
// 替换 src/components/Canvas/Canvas.tsx:7-30 的 props 定义与状态初始化
interface CanvasProps {
  treeData: TreeNode | null;
  currentStep: AlgorithmStep | null;
  onDimensionsChange?: (width: number, height: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ treeData, currentStep, onDimensionsChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  // 更新尺寸并上报
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // 过滤掉布局未完成时的 0 值
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
          onDimensionsChange?.(width, height);
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    // 监听容器尺寸变化（更精确）
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, [onDimensionsChange]);
```

- [ ] **Step 2: App 接收 Canvas 尺寸回调并按真实尺寸生成步骤 — 替换写死的 600×350**
文件: `src/App.tsx:14-51`

```typescript
// 替换 src/App.tsx:14-51 的 App 函数开头与首个 useEffect
function App() {
  const [inputData, setInputData] = useState<(number | null)[]>(dataExamples[0].input);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentStep: 0,
    totalSteps: 0,
    speed: 1,
  });

  const playIntervalRef = useRef<number | null>(null);

  // 当输入数据变化时，重新构建树
  useEffect(() => {
    queueMicrotask(() => {
      const tree = buildTreeFromArray(inputData);
      setTreeData(tree);
      setPlaybackState(prev => ({
        ...prev,
        currentStep: 0,
        isPlaying: false,
      }));
    });

    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  }, [inputData]);

  // 当树或画布尺寸变化时，重新生成算法步骤（用真实尺寸）
  useEffect(() => {
    if (!treeData || !canvasSize) return;
    queueMicrotask(() => {
      const newSteps = generateAlgorithmSteps(treeData, canvasSize.width, canvasSize.height);
      setSteps(newSteps);
      setPlaybackState(prev => ({
        ...prev,
        currentStep: 0,
        totalSteps: newSteps.length,
        isPlaying: false,
      }));
    });
  }, [treeData, canvasSize]);

  // 画布尺寸变化回调
  const handleDimensionsChange = useCallback((width: number, height: number) => {
    setCanvasSize(prev => {
      // 尺寸未变化时不触发重渲染
      if (prev && Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
        return prev;
      }
      return { width, height };
    });
  }, []);

  // 播放控制
  useEffect(() => {
    if (playbackState.isPlaying) {
      const interval = 1000 / playbackState.speed;
      playIntervalRef.current = window.setInterval(() => {
        setPlaybackState(prev => {
          if (prev.currentStep >= prev.totalSteps - 1) {
            if (playIntervalRef.current) {
              clearInterval(playIntervalRef.current);
              playIntervalRef.current = null;
            }
            return { ...prev, isPlaying: false };
          }
          return { ...prev, currentStep: prev.currentStep + 1 };
        });
      }, interval);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [playbackState.isPlaying, playbackState.speed]);
```

- [ ] **Step 3: 在 App 的 JSX 中把回调传给 Canvas — 接通尺寸上报**
文件: `src/App.tsx:142-149`

```typescript
// 替换 src/App.tsx:142-149 的 main-content 区块
      <div className="main-content">
        <div className="canvas-section">
          <Canvas
            treeData={treeData}
            currentStep={currentStep}
            onDimensionsChange={handleDimensionsChange}
          />
        </div>
        <div className="code-section">
          <CodePanel currentStep={currentStep} />
        </div>
      </div>
```

- [ ] **Step 4: 验证画布尺寸自适应**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && npx tsc -b --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && npm run lint`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error" 或 "warning"（针对改动文件）

- [ ] **Step 5: 提交**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && git add src/App.tsx src/components/Canvas/Canvas.tsx && git commit -m "fix(canvas): 画布内容随真实尺寸自适应生成，移除写死的 600x350"`

---

### Task 2: 注解面板根据文案自适应宽度 — 修复文案展示不开

**Depends on:** Task 1
**Files:**
- Modify: `src/components/Canvas/Canvas.tsx:140-202`（用真实文本测量替换字符数×7 估算）

- [ ] **Step 1: 用真实文本测量替换固定字符数估算 — 注解背景贴合文案宽度**
文件: `src/components/Canvas/Canvas.tsx:169-201`

```typescript
// 替换 src/components/Canvas/Canvas.tsx:169-201 的注解绘制区块（lines 循环前到 lines 循环）
        const lines = annotation.text.split('\n');
        const annotationG = annotationGroup.append('g')
          .attr('class', `annotation annotation-${annotation.type}`);

        // 背景
        const bgPadding = 8;
        const lineHeight = 16;

        // 先 append 不可见文本测量真实宽度，再据之计算背景
        const measureG = annotationGroup.append('g').attr('opacity', 0).attr('class', 'measure');
        const measuredWidths = lines.map(line =>
          measureG.append('text')
            .attr('font-size', '11px')
            .attr('font-family', '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif')
            .text(line)
            .node()?.getBBox().width ?? line.length * 7
        );
        measureG.remove();

        const maxTextWidth = Math.max(...measuredWidths);
        const bgWidth = maxTextWidth + bgPadding * 2;
        const bgHeight = lines.length * lineHeight + bgPadding * 2;

        let bgX = x - bgWidth / 2;
        if (textAnchor === 'start') bgX = x;
        if (textAnchor === 'end') bgX = x - bgWidth;

        annotationG.append('rect')
          .attr('x', bgX)
          .attr('y', y - lineHeight / 2 - bgPadding)
          .attr('width', bgWidth)
          .attr('height', bgHeight)
          .attr('rx', 4)
          .attr('fill', getAnnotationBgColor(annotation.type))
          .attr('opacity', 0.9)
          .attr('stroke', getAnnotationBgColor(annotation.type))
          .attr('stroke-width', 1);

        lines.forEach((line, i) => {
          annotationG.append('text')
            .attr('x', x)
            .attr('y', y + i * lineHeight)
            .attr('text-anchor', textAnchor)
            .attr('fill', getAnnotationTextColor(annotation.type))
            .attr('font-size', '11px')
            .attr('font-family', '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif')
            .text(line);
        });
```

- [ ] **Step 2: 修正注解 text-anchor 与背景对齐 — 避免 left/right 方向背景错位**
文件: `src/components/Canvas/Canvas.tsx:148-167`

```typescript
// 替换 src/components/Canvas/Canvas.tsx:148-167 的注解位置计算
        // 注：此段在 annotation.forEach 内，紧跟 const node = nodes.find(...)
        let x = node.x;
        let y = node.y;
        let textAnchor: 'start' | 'middle' | 'end' = 'middle';

        switch (annotation.position) {
          case 'top':
            y -= nodeRadius + 24;
            break;
          case 'bottom':
            y += nodeRadius + 24;
            break;
          case 'left':
            x -= nodeRadius + 12;
            textAnchor = 'end';
            break;
          case 'right':
            x += nodeRadius + 12;
            textAnchor = 'start';
            break;
        }
```

- [ ] **Step 3: 验证注解面板自适应**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && npx tsc -b --noEmit && npm run lint`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS" 或 "error"

- [ ] **Step 4: 提交**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && git add src/components/Canvas/Canvas.tsx && git commit -m "fix(canvas): 注解面板根据真实文本测量自适应宽度，修复文案展示不开"`

---

### Task 3: 代码高亮聚焦单行 + 完善变量/栈帧数据

**Depends on:** None
**Files:**
- Modify: `src/types/index.ts:22-34`（AlgorithmStep 新增 `primaryLine` 字段）
- Modify: `src/utils/algorithmSteps.ts`（每个步骤补充 primaryLine 与完整 variables/callStack）

- [ ] **Step 1: 扩展 AlgorithmStep 类型 — 新增 primaryLine 标识当前主执行行**
文件: `src/types/index.ts:22-34`

```typescript
// 替换 src/types/index.ts:22-34 的 AlgorithmStep 接口
// 算法步骤
export interface AlgorithmStep {
  id: number;
  description: string;
  nodeId: string | null;
  lower: number;
  upper: number;
  action: 'enter' | 'check' | 'return' | 'compare' | 'recurse-left' | 'recurse-right' | 'result';
  result?: boolean;
  codeLines: CodeLineMapping;
  /** 当前主执行行（按语言）— 仅此行高亮聚焦，codeLines 用于次级弱标记 */
  primaryLine: CodeLineMapping;
  variables: VariableState[];
  annotations: Annotation[];
  callStack: CallStackFrame[];
}
```

- [ ] **Step 2: 给每个步骤补充 primaryLine 与完整变量状态 — 让调试信息可逐行展示**
文件: `src/utils/algorithmSteps.ts:47-74`（"进入递归"步骤）

```typescript
// 替换 src/utils/algorithmSteps.ts:47-74 的"进入递归"步骤 push
    steps.push({
      id: stepId++,
      description: node 
        ? `递归进入节点 ${node.val}，检查范围 (${formatBound(lower)}, ${formatBound(upper)})`
        : `递归到空节点，返回 true`,
      nodeId,
      lower,
      upper,
      action: 'enter',
      codeLines: {
        java: [6],
        python: [2, 3],
        golang: [5],
        javascript: [5],
      },
      primaryLine: {
        java: [6],
        python: [3],
        golang: [5],
        javascript: [5],
      },
      variables: [
        { name: 'root', value: node ? `TreeNode(${node.val})` : 'null', line: 6, language: 'java' },
        { name: 'lower', value: formatBound(lower), line: 6, language: 'java' },
        { name: 'upper', value: formatBound(upper), line: 6, language: 'java' },
        { name: 'root', value: node ? `TreeNode(${node.val})` : 'None', line: 2, language: 'python' },
        { name: 'left', value: formatBound(lower), line: 2, language: 'python' },
        { name: 'right', value: formatBound(upper), line: 2, language: 'python' },
      ],
      annotations: nodeId ? [{
        nodeId,
        text: `进入: (${formatBound(lower)}, ${formatBound(upper)})`,
        position: 'top',
        type: 'param',
      }] : [],
      callStack: [...callStack],
    });
```

- [ ] **Step 3: 给"空节点返回"与"范围检查"步骤补充 primaryLine 与变量 — 覆盖核心执行路径**
文件: `src/utils/algorithmSteps.ts:79-129`

```typescript
// 替换 src/utils/algorithmSteps.ts:79-129 的"空节点返回"与"范围检查"两个步骤 push
    // 空节点返回true
    if (!node) {
      callStack.pop();
      steps.push({
        id: stepId++,
        description: '空节点，返回 true',
        nodeId: null,
        lower,
        upper,
        action: 'return',
        result: true,
        codeLines: {
          java: [7, 8, 9],
          python: [4, 5],
          golang: [6, 7, 8],
          javascript: [6, 7, 8],
        },
        primaryLine: {
          java: [8],
          python: [5],
          golang: [7],
          javascript: [7],
        },
        variables: [
          { name: 'root', value: 'null', line: 7, language: 'java' },
          { name: 'root', value: 'None', line: 4, language: 'python' },
        ],
        annotations: [],
        callStack: [...callStack],
      });
      return true;
    }
    
    // 检查当前节点值是否在范围内
    const inRange = node.val > lower && node.val < upper;
    
    steps.push({
      id: stepId++,
      description: `检查节点 ${node.val}: ${formatBound(lower)} < ${node.val} < ${formatBound(upper)} → ${inRange ? '满足' : '不满足'}`,
      nodeId,
      lower,
      upper,
      action: 'check',
      result: inRange,
      codeLines: {
        java: [10, 11, 12],
        python: [6, 7],
        golang: [9, 10, 11],
        javascript: [9, 10, 11],
      },
      primaryLine: {
        java: [11],
        python: [6],
        golang: [10],
        javascript: [10],
      },
      variables: [
        { name: 'root.val', value: node.val.toString(), line: 10, language: 'java' },
        { name: 'lower', value: formatBound(lower), line: 10, language: 'java' },
        { name: 'upper', value: formatBound(upper), line: 10, language: 'java' },
        { name: 'inRange', value: inRange.toString(), line: 11, language: 'java' },
        { name: 'x', value: node.val.toString(), line: 7, language: 'python' },
      ],
      annotations: [{
        nodeId: nodeId!,
        text: `${formatBound(lower)} < ${node.val} < ${formatBound(upper)}\n${inRange ? '✓ 满足' : '✗ 不满足'}`,
        position: 'right',
        type: 'compare',
      }],
      callStack: [...callStack],
    });
```

- [ ] **Step 4: 给剩余步骤（不在范围/递归左右/最终返回）补充 primaryLine — 保证类型完整不缺字段**
文件: `src/utils/algorithmSteps.ts:131-321`

```typescript
// 替换 src/utils/algorithmSteps.ts:131-156 的"不在范围内返回 false"步骤
    if (!inRange) {
      callStack.pop();
      steps.push({
        id: stepId++,
        description: `节点 ${node.val} 不在范围内，返回 false`,
        nodeId,
        lower,
        upper,
        action: 'result',
        result: false,
        codeLines: {
          java: [10, 11, 12],
          python: [6, 7],
          golang: [9, 10, 11],
          javascript: [9, 10, 11],
        },
        primaryLine: {
          java: [12],
          python: [7],
          golang: [11],
          javascript: [11],
        },
        variables: [
          { name: 'inRange', value: 'false', line: 12, language: 'java' },
        ],
        annotations: [{
          nodeId: nodeId!,
          text: '返回 false',
          position: 'bottom',
          type: 'result',
        }],
        callStack: [...callStack],
      });
      return false;
    }
```

```typescript
// 替换 src/utils/algorithmSteps.ts:159-185 的"递归检查左子树"步骤
    // 递归检查左子树
    if (node.left) {
      steps.push({
        id: stepId++,
        description: `递归检查左子树，新范围 (${formatBound(lower)}, ${node.val})`,
        nodeId,
        lower,
        upper,
        action: 'recurse-left',
        codeLines: {
          java: [13],
          python: [8],
          golang: [12],
          javascript: [12],
        },
        primaryLine: {
          java: [13],
          python: [8],
          golang: [12],
          javascript: [12],
        },
        variables: [
          { name: 'new_upper', value: node.val.toString(), line: 13, language: 'java' },
          { name: 'leftResult', value: 'pending', line: 13, language: 'java' },
        ],
        annotations: [{
          nodeId: nodeId!,
          text: `→ 左子树\n上界更新为 ${node.val}`,
          position: 'left',
          type: 'info',
        }],
        callStack: [...callStack],
      });
    }
```

```typescript
// 替换 src/utils/algorithmSteps.ts:188-215 的"左子树失败返回 false"步骤
    const leftResult = helper(node.left, lower, node.val, depth + 1);
    
    if (!leftResult) {
      callStack.pop();
      steps.push({
        id: stepId++,
        description: `左子树验证失败，返回 false`,
        nodeId,
        lower,
        upper,
        action: 'result',
        result: false,
        codeLines: {
          java: [13, 14],
          python: [8, 9],
          golang: [12, 13],
          javascript: [12, 13],
        },
        primaryLine: {
          java: [13],
          python: [8],
          golang: [12],
          javascript: [12],
        },
        variables: [
          { name: 'leftResult', value: 'false', line: 13, language: 'java' },
        ],
        annotations: [{
          nodeId: nodeId!,
          text: '左子树失败\n返回 false',
          position: 'bottom',
          type: 'result',
        }],
        callStack: [...callStack],
      });
      return false;
    }
```

```typescript
// 替换 src/utils/algorithmSteps.ts:217-243 的"递归检查右子树"步骤
    // 递归检查右子树
    if (node.right) {
      steps.push({
        id: stepId++,
        description: `递归检查右子树，新范围 (${node.val}, ${formatBound(upper)})`,
        nodeId,
        lower,
        upper,
        action: 'recurse-right',
        codeLines: {
          java: [14],
          python: [9],
          golang: [13],
          javascript: [13],
        },
        primaryLine: {
          java: [14],
          python: [9],
          golang: [13],
          javascript: [13],
        },
        variables: [
          { name: 'new_lower', value: node.val.toString(), line: 14, language: 'java' },
          { name: 'rightResult', value: 'pending', line: 14, language: 'java' },
        ],
        annotations: [{
          nodeId: nodeId!,
          text: `→ 右子树\n下界更新为 ${node.val}`,
          position: 'right',
          type: 'info',
        }],
        callStack: [...callStack],
      });
    }
```

```typescript
// 替换 src/utils/algorithmSteps.ts:245-277 的"节点验证完成返回"步骤
    const rightResult = helper(node.right, node.val, upper, depth + 1);
    
    callStack.pop();
    
    const finalResult = leftResult && rightResult;
    steps.push({
      id: stepId++,
      description: `节点 ${node.val} 验证完成，返回 ${finalResult}`,
      nodeId,
      lower,
      upper,
      action: 'return',
      result: finalResult,
      codeLines: {
        java: [13, 14],
        python: [8, 9],
        golang: [12, 13],
        javascript: [12, 13],
      },
      primaryLine: {
        java: [13],
        python: [8],
        golang: [12],
        javascript: [12],
      },
      variables: [
        { name: 'leftResult', value: leftResult.toString(), line: 13, language: 'java' },
        { name: 'rightResult', value: rightResult.toString(), line: 14, language: 'java' },
        { name: 'finalResult', value: finalResult.toString(), line: 13, language: 'java' },
      ],
      annotations: [{
        nodeId: nodeId!,
        text: `返回 ${finalResult}`,
        position: 'bottom',
        type: 'return',
      }],
      callStack: [...callStack],
    });
    
    return finalResult;
  };
```

```typescript
// 替换 src/utils/algorithmSteps.ts:280-321 的"初始步骤"与"最终结果"步骤
  // 初始步骤
  steps.push({
    id: stepId++,
    description: '开始验证二叉搜索树，初始范围 (-∞, +∞)',
    nodeId: visualRoot?.id ?? null,
    lower: Number.MIN_SAFE_INTEGER,
    upper: Number.MAX_SAFE_INTEGER,
    action: 'enter',
    codeLines: {
      java: [1, 2, 3],
      python: [1, 2, 3],
      golang: [1, 2],
      javascript: [1, 2],
    },
    primaryLine: {
      java: [3],
      python: [2],
      golang: [2],
      javascript: [2],
    },
    variables: [
      { name: 'root', value: 'TreeNode(root)', line: 3, language: 'java' },
    ],
    annotations: [],
    callStack: [],
  });
  
  const result = helper(root, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0);
  
  // 最终结果
  steps.push({
    id: stepId++,
    description: `算法执行完毕，结果: ${result ? '是有效的二叉搜索树' : '不是有效的二叉搜索树'}`,
    nodeId: null,
    lower: Number.MIN_SAFE_INTEGER,
    upper: Number.MAX_SAFE_INTEGER,
    action: 'result',
    result,
    codeLines: {
      java: [2, 3],
      python: [2, 3],
      golang: [1, 2],
      javascript: [1, 2],
    },
    primaryLine: {
      java: [3],
      python: [2],
      golang: [1],
      javascript: [1],
    },
    variables: [
      { name: 'result', value: result.toString(), line: 3, language: 'java' },
    ],
    annotations: [],
    callStack: [],
  });
```

- [ ] **Step 5: 验证类型与步骤生成完整**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && npx tsc -b --noEmit && npm run lint`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS" 或 "primaryLine" 相关缺失错误

- [ ] **Step 6: 提交**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && git add src/types/index.ts src/utils/algorithmSteps.ts && git commit -m "feat(algorithm): 代码高亮聚焦单行 primaryLine + 补全各语言变量状态"`

---

### Task 4: CodePanel 新增变量内存面板与调用栈面板 — 增强调试信息

**Depends on:** Task 3
**Files:**
- Modify: `src/components/CodePanel/CodePanel.tsx:34-112`（新增主行高亮、变量内存区、调用栈区）
- Modify: `src/components/CodePanel/CodePanel.css`（新增样式）
- Modify: `src/components/Canvas/Canvas.tsx:204-246`（移除画布上的调用栈，改由 CodePanel 展示）

- [ ] **Step 1: CodePanel 改用 primaryLine 主高亮 + 新增变量内存与调用栈区块 — 集中调试信息**
文件: `src/components/CodePanel/CodePanel.tsx:34-112`

```typescript
// 替换 src/components/CodePanel/CodePanel.tsx:34-112 的派生量与 return JSX
  const codeSnippet = getCodeByLanguage(language);
  const primaryLines = currentStep?.primaryLine[language] || [];
  const secondaryLines = (currentStep?.codeLines[language] || []).filter(
    l => !primaryLines.includes(l)
  );
  const variables = currentStep?.variables.filter(v => v.language === language) || [];
  const callStack = currentStep?.callStack || [];

  const getVariablesForLine = (lineNumber: number): VariableState[] => {
    return variables.filter(v => v.line === lineNumber);
  };

  const getPrismLanguage = (lang: ProgrammingLanguage): string => {
    switch (lang) {
      case 'java': return 'java';
      case 'python': return 'python';
      case 'golang': return 'go';
      case 'javascript': return 'javascript';
      default: return 'javascript';
    }
  };

  return (
    <div className="code-panel">
      <div className="code-header">
        <span className="code-title">算法代码</span>
        <div className="language-tabs">
          {codeSnippets.map(snippet => (
            <button
              key={snippet.language}
              className={`lang-tab ${language === snippet.language ? 'active' : ''}`}
              onClick={() => handleLanguageChange(snippet.language)}
            >
              {snippet.displayName}
            </button>
          ))}
        </div>
      </div>
      
      <div className="code-content">
        <Highlight
          theme={themes.nightOwl}
          code={codeSnippet.code}
          language={getPrismLanguage(language)}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={className} style={{ ...style, margin: 0, padding: '12px', background: 'transparent' }}>
              {tokens.map((line, i) => {
                const lineNumber = i + 1;
                const isPrimary = primaryLines.includes(lineNumber);
                const isSecondary = secondaryLines.includes(lineNumber);
                const lineVars = getVariablesForLine(lineNumber);
                const lineClassName = `code-line${isPrimary ? ' primary' : ''}${isSecondary ? ' secondary' : ''}`;
                
                return (
                  <div
                    key={i}
                    {...getLineProps({ line })}
                    className={lineClassName}
                  >
                    <span className="line-number">{lineNumber}</span>
                    <span className="line-content">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                    {lineVars.length > 0 && (
                      <span className="line-variables">
                        {lineVars.map((v, idx) => (
                          <span key={idx} className="variable-badge">
                            {v.name}={v.value}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>

      <div className="debug-panels">
        <div className="debug-panel variables-panel">
          <div className="debug-panel-title">变量内存</div>
          <div className="variables-list">
            {variables.length === 0 ? (
              <div className="empty-hint">当前无可追踪变量</div>
            ) : (
              variables.map((v, idx) => (
                <div key={idx} className="variable-item">
                  <span className="variable-name">{v.name}</span>
                  <span className="variable-value">{v.value}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="debug-panel callstack-panel">
          <div className="debug-panel-title">调用栈</div>
          <div className="callstack-list">
            {callStack.length === 0 ? (
              <div className="empty-hint">栈为空</div>
            ) : (
              callStack.slice().reverse().map((frame, idx) => (
                <div key={idx} className={`stack-frame ${idx === 0 ? 'stack-top' : ''}`}>
                  <span className="frame-name">{frame.functionName}</span>
                  <span className="frame-node">node: {frame.nodeVal ?? 'null'}</span>
                  <span className="frame-range">({frame.lower}, {frame.upper})</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 2: 在 CodePanel.css 增加主/次行高亮与调试面板样式 — 区分聚焦行与弱标记行**
文件: `src/components/CodePanel/CodePanel.css:60-71`

```css
/* 替换 src/components/CodePanel/CodePanel.css:60-71 的 .code-line 与 .highlighted 规则 */
.code-line {
  display: flex;
  align-items: flex-start;
  padding: 1px 0;
  transition: background 0.2s;
}

/* 主执行行：强高亮聚焦 */
.code-line.primary {
  background: rgba(79, 195, 247, 0.22);
  border-left: 3px solid #4fc3f7;
  margin-left: -3px;
  box-shadow: inset 0 0 0 1px rgba(79, 195, 247, 0.3);
}

/* 次级关联行：弱标记，区分主聚焦行 */
.code-line.secondary {
  background: rgba(79, 195, 247, 0.06);
  border-left: 3px solid rgba(79, 195, 247, 0.4);
  margin-left: -3px;
}
```

- [ ] **Step 3: 在 CodePanel.css 末尾追加调试面板样式 — 变量内存与调用栈区**

```css
/* 追加到 src/components/CodePanel/CodePanel.css 文件末尾 */

.debug-panels {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid #0f3460;
  background: #16213e;
  min-height: 120px;
  max-height: 40%;
}

.debug-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.debug-panel-title {
  color: #4fc3f7;
  font-size: 11px;
  font-weight: 600;
  padding-bottom: 6px;
  border-bottom: 1px solid #0f3460;
  margin-bottom: 6px;
}

.variables-list,
.callstack-list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-hint {
  color: #546e7a;
  font-size: 11px;
  padding: 4px 0;
}

.variable-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 3px 6px;
  background: rgba(15, 52, 96, 0.4);
  border-radius: 3px;
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.variable-name {
  color: #ffb74d;
  flex-shrink: 0;
}

.variable-value {
  color: #e0e0e0;
  text-align: right;
  word-break: break-all;
}

.stack-frame {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 3px;
  border-left: 2px solid #37474f;
}

.stack-frame.stack-top {
  background: rgba(79, 195, 247, 0.12);
  border-left-color: #4fc3f7;
}

.frame-name {
  color: #b39ddb;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
}

.frame-node,
.frame-range {
  color: #90a4ae;
  font-size: 10px;
  font-family: 'Consolas', 'Monaco', monospace;
}
```

- [ ] **Step 4: 移除 Canvas 上重复的调用栈绘制 — 调试信息统一到 CodePanel**
文件: `src/components/Canvas/Canvas.tsx:204-246`

```typescript
// 替换 src/components/Canvas/Canvas.tsx:204-246 的"绘制调用栈"整段为空（删除）
// 该段从 `// 绘制调用栈` 到对应 `});` 结束，整体移除，
// 因为调用栈已改由 CodePanel 的 callstack-panel 展示，避免画布重复占位。
```

- [ ] **Step 5: 验证 CodePanel 调试面板与编译**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && npx tsc -b --noEmit && npm run lint`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS" 或 "error"

- [ ] **Step 6: 提交**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && git add src/components/CodePanel/CodePanel.tsx src/components/CodePanel/CodePanel.css src/components/Canvas/Canvas.tsx && git commit -m "feat(codepanel): 新增变量内存与调用栈面板，主行聚焦高亮"`

---

### Task 5: 底部控制面板按钮居中

**Depends on:** None
**Files:**
- Modify: `src/components/PlaybackControls/PlaybackControls.css:7-12`（按钮组居中布局）

- [ ] **Step 1: 控制行按钮组居中 — 三组元素整体居中而非分散贴边**
文件: `src/components/PlaybackControls/PlaybackControls.css:1-12`

```css
/* 替换 src/components/PlaybackControls/PlaybackControls.css:1-12 的 .playback-controls 与 .controls-row */
.playback-controls {
  padding: 10px 16px;
  background: #16213e;
  border-top: 1px solid #0f3460;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
```

- [ ] **Step 2: 调整按钮组与步数信息布局 — 保持居中后组内紧凑**
文件: `src/components/PlaybackControls/PlaybackControls.css:14-17` 与 `:94-98`

```css
/* 替换 src/components/PlaybackControls/PlaybackControls.css:14-17 的 .control-buttons */
.control-buttons {
  display: flex;
  gap: 8px;
}

/* 替换 src/components/PlaybackControls/PlaybackControls.css:94-98 的 .speed-control */
.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

- [ ] **Step 3: 验证控制面板居中**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && npm run lint`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error"

- [ ] **Step 4: 提交**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && git add src/components/PlaybackControls/PlaybackControls.css && git commit -m "fix(controls): 底部控制面板操作按钮居中"`

---

### Task 6: 合并【输入数据】与【样例】为一行

**Depends on:** None
**Files:**
- Modify: `src/components/DataInput/DataInput.tsx:56-94`（合并为单行 + 独立错误行）
- Modify: `src/components/DataInput/DataInput.css:7-12` 与 `:91-97`（合并布局）

- [ ] **Step 1: 合并输入数据行与样例行为单行 — 减少纵向占用**
文件: `src/components/DataInput/DataInput.tsx:56-94`

```typescript
// 替换 src/components/DataInput/DataInput.tsx:56-94 的 return JSX
  return (
    <div className="data-input">
      <div className="input-row">
        <label className="input-label">输入数据 / 样例:</label>
        <input
          type="text"
          className={`input-field ${error ? 'input-error' : ''}`}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="例如: [2,1,3]"
        />
        <button className="submit-btn" onClick={handleSubmit}>
          确认
        </button>
        <button className="random-btn" onClick={handleRandomBST}>
          随机BST
        </button>
        <button className="random-btn non-bst" onClick={handleRandomNonBST}>
          随机非BST
        </button>
        <span className="examples-divider">|</span>
        {dataExamples.slice(0, 5).map((example, index) => (
          <button
            key={index}
            className={`example-btn ${JSON.stringify(currentData) === JSON.stringify(example.input) ? 'active' : ''}`}
            onClick={() => handleExampleClick(example.input)}
            title={`预期结果: ${example.expected}`}
          >
            {example.name}
          </button>
        ))}
      </div>
      
      {error && <div className="error-message">{error}</div>}
    </div>
  );
```

- [ ] **Step 2: 调整 DataInput.css 适配合并行 — 移除样例行独立样式与 padding**
文件: `src/components/DataInput/DataInput.css:84-103`

```css
/* 替换 src/components/DataInput/DataInput.css:84-103 的 .error-message、.examples-row、.examples-label */
.error-message {
  color: #ef5350;
  font-size: 12px;
  margin-top: 4px;
  padding-left: 100px;
}

.examples-divider {
  color: #37474f;
  font-size: 12px;
  align-self: center;
}
```

- [ ] **Step 3: 收窄输入框最大宽度避免合并行过宽溢出**
文件: `src/components/DataInput/DataInput.css:20-31`

```css
/* 替换 src/components/DataInput/DataInput.css:20-31 的 .input-field */
.input-field {
  flex: 1;
  min-width: 160px;
  max-width: 320px;
  padding: 6px 12px;
  border: 1px solid #0f3460;
  border-radius: 4px;
  background: #1a1a2e;
  color: #fff;
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', monospace;
}
```

- [ ] **Step 4: 验证数据输入合并行**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && npx tsc -b --noEmit && npm run lint`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS" 或 "error"

- [ ] **Step 5: 提交**
Run: `cd /home/cc11001100/github/fuck-algorithm/leetcode-98-validate-binary-search-tree && git add src/components/DataInput/DataInput.tsx src/components/DataInput/DataInput.css && git commit -m "fix(datainput): 合并输入数据与样例为一行"`
