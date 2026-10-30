import type { TreeNode, AlgorithmStep, VisualNode, CallStackFrame } from '../types';
import { buildVisualTree } from './treeUtils';

const JAVA_LINES = { entry: [6], nil: [7, 8], check: [10, 11], left: [13], right: [14], result: [13, 14] };
const PYTHON_LINES = { entry: [3], nil: [4, 5], check: [6, 7], left: [8], right: [9], result: [8, 9] };
const GO_LINES = { entry: [5], nil: [6, 7], check: [9, 10], left: [12], right: [13], result: [12, 13] };
const JS_LINES = { entry: [5], nil: [6, 7], check: [9, 10], left: [12], right: [13], result: [12, 13] };

const codeMapping = (kind: keyof typeof JAVA_LINES) => ({
  java: JAVA_LINES[kind],
  python: PYTHON_LINES[kind],
  golang: GO_LINES[kind],
  javascript: JS_LINES[kind],
});

const formatBound = (value: number): string => {
  if (value === Number.MIN_SAFE_INTEGER) return '-∞';
  if (value === Number.MAX_SAFE_INTEGER) return '+∞';
  return String(value);
};

const nodePathMap = (root: TreeNode | null, visualRoot: VisualNode | null) => {
  const nodes = new Map<string, VisualNode>();
  const walk = (node: TreeNode | null, visual: VisualNode | null, path = 'root'): void => {
    if (visual) nodes.set(path, visual);
    if (visual?.left || node?.left) walk(node?.left ?? null, visual?.left ?? null, `${path}-L`);
    if (visual?.right || node?.right) walk(node?.right ?? null, visual?.right ?? null, `${path}-R`);
  };
  walk(root, visualRoot);
  return nodes;
};

export const generateAlgorithmSteps = (
  root: TreeNode | null,
  canvasWidth: number,
  canvasHeight: number,
): AlgorithmStep[] => {
  if (!root) return [];
  const visualRoot = buildVisualTree(root, canvasWidth, canvasHeight, true, 24);
  const visualNodes = nodePathMap(root, visualRoot);
  const steps: AlgorithmStep[] = [];
  const callStack: CallStackFrame[] = [];
  const visitedNodeIds = new Set<string>();
  let stepId = 0;

  const addStep = (step: Omit<AlgorithmStep, 'id'>) => steps.push({
    ...step,
    visitedNodeIds: [...visitedNodeIds],
    id: stepId++,
  });
  const variables = (node: TreeNode, lower: number, upper: number, inRange?: boolean): AlgorithmStep['variables'] => {
    const values = [
      { name: 'root.val', value: String(node.val), line: 10 },
      { name: 'lower', value: formatBound(lower), line: 10 },
      { name: 'upper', value: formatBound(upper), line: 10 },
      ...(inRange === undefined ? [] : [{ name: 'inRange', value: String(inRange), line: 11 }]),
    ];
    return (['java', 'python', 'golang', 'javascript'] as const).flatMap(language => values.map(item => ({
      ...item,
      language,
      line: language === 'python' ? item.line - 4 : language === 'golang' ? item.line - 1 : language === 'javascript' ? item.line - 1 : item.line,
    })));
  };

  addStep({
    description: '从根节点开始验证，初始范围没有上下界限制。',
    nodeId: visualRoot?.id ?? null,
    lower: Number.MIN_SAFE_INTEGER,
    upper: Number.MAX_SAFE_INTEGER,
    action: 'enter',
    operation: 'init',
    narration: '根节点从 (-∞, +∞) 开始；每往下一层，祖先节点都会继续收紧允许的范围。',
    anchorIds: ['helper-entry'],
    codeLines: { java: [2, 3], python: [1, 2], golang: [1, 2], javascript: [1, 2] },
    primaryLine: { java: [3], python: [2], golang: [2], javascript: [2] },
    variables: [], annotations: [], callStack: [],
  });

  const visit = (node: TreeNode | null, lower: number, upper: number, depth: number, path: string): boolean => {
    const visual = visualNodes.get(path);
    const nodeId = visual?.id ?? `${path}-null`;
    const lowerText = formatBound(lower);
    const upperText = formatBound(upper);
    const frame = { functionName: 'helper', nodeVal: node?.val ?? null, lower: lowerText, upper: upperText, depth };
    callStack.push(frame);

    addStep({
      description: node
        ? `进入${path === 'root' ? '根节点' : path.endsWith('-L') ? '左子节点' : '右子节点'} ${node.val}，继承范围 (${lowerText}, ${upperText})。`
        : `到达 ${path.replaceAll('root', '根').replaceAll('-L', '的左').replaceAll('-R', '的右')}空位置。`,
      nodeId,
      lower,
      upper,
      action: 'enter',
      operation: node ? 'recurse' : 'return',
      narration: node
        ? `因为节点必须同时遵守所有祖先的限制，所以先检查 ${node.val} 是否落在 (${lowerText}, ${upperText})。`
        : '这里没有实际节点，不可能违反范围，因此空分支返回 true。',
      anchorIds: ['helper-entry'],
      visitedNodeIds: [...visitedNodeIds],
      codeLines: codeMapping('entry'),
      primaryLine: { java: [6], python: [3], golang: [5], javascript: [5] },
      variables: node ? variables(node, lower, upper) : [],
      annotations: visual ? [{ nodeId: visual.id, text: `允许范围\n(${lowerText}, ${upperText})`, position: 'top', type: 'param' }] : [],
      callStack: [...callStack],
    });

    if (!node) {
      callStack.pop();
      addStep({
        description: `空分支返回 true，不会让整棵树失效。`,
        nodeId,
        lower,
        upper,
        action: 'return',
        operation: 'return',
        narration: `空位置没有值可检查，所以它满足当前分支要求并向上一层返回 true。`,
        anchorIds: ['base-case'],
        visitedNodeIds: [...visitedNodeIds],
        result: true,
        codeLines: codeMapping('nil'),
        primaryLine: { java: [8], python: [5], golang: [7], javascript: [7] },
        variables: [], annotations: [], callStack: [...callStack],
      });
      return true;
    }

    const valid = node.val > lower && node.val < upper;
    addStep({
      description: `检查 ${lowerText} < ${node.val} < ${upperText}：${valid ? '成立' : '不成立'}。`,
      nodeId: visual?.id ?? null,
      lower,
      upper,
      action: 'check',
      operation: valid ? 'compare' : 'error',
      narration: valid
        ? `比较结果成立；${node.val} 严格位于上下界之间，因此继续检查它的左右子树。`
        : `${node.val} 没有严格落在 (${lowerText}, ${upperText}) 内；它违反了祖先限制，整棵树立即判为无效。`,
      anchorIds: ['range-check'],
      visitedNodeIds: [...visitedNodeIds],
      result: valid,
      codeLines: codeMapping('check'),
      primaryLine: { java: [10], python: [7], golang: [9], javascript: [9] },
      variables: variables(node, lower, upper, valid),
      annotations: visual ? [{ nodeId: visual.id, text: `${lowerText} < ${node.val} < ${upperText}\n${valid ? '✓ 范围内' : '✗ 越界'}`, position: 'right', type: valid ? 'compare' : 'result' }] : [],
      callStack: [...callStack],
    });

    if (!valid) {
      if (visual) visitedNodeIds.add(visual.id);
      callStack.pop();
      addStep({
        description: `节点 ${node.val} 越界，返回 false 并停止搜索。`,
        nodeId: visual?.id ?? null,
        lower,
        upper,
        action: 'result',
        operation: 'error',
        narration: '由于题目要求每个节点都必须满足上下界，发现一个违规节点就足以否定整棵树，无需再访问它的后代。',
        anchorIds: ['range-check', 'return-false'],
        visitedNodeIds: [...visitedNodeIds],
        result: false,
        codeLines: codeMapping('check'),
        primaryLine: { java: [11], python: [7], golang: [10], javascript: [10] },
        variables: variables(node, lower, upper, false),
        annotations: visual ? [{ nodeId: visual.id, text: '违反祖先范围\n返回 false', position: 'bottom', type: 'result' }] : [],
        callStack: [...callStack],
      });
      return false;
    }

    if (visual) visitedNodeIds.add(visual.id);
    const leftResult = visit(node.left, lower, node.val, depth + 1, `${path}-L`);
    if (!leftResult) {
      callStack.pop();
      addStep({
        description: `节点 ${node.val} 的左子树返回 false，当前递归也返回 false。`,
        nodeId: visual?.id ?? null,
        lower,
        upper,
        action: 'result',
        operation: 'return',
        narration: '左侧已经发现违规；因为两边都必须有效，所以这里短路返回，不再检查右子树。',
        anchorIds: ['left-recursion', 'return-false'],
        visitedNodeIds: [...visitedNodeIds],
        result: false,
        codeLines: codeMapping('left'),
        primaryLine: { java: [13], python: [8], golang: [12], javascript: [12] },
        variables: [], annotations: [], callStack: [...callStack],
      });
      return false;
    }

    const rightResult = visit(node.right, node.val, upper, depth + 1, `${path}-R`);
    callStack.pop();
    const result = leftResult && rightResult;
    addStep({
      description: `节点 ${node.val} 汇总结果：左侧 ${leftResult}，右侧 ${rightResult}，所以当前子树为 ${result}。`,
      nodeId: visual?.id ?? null,
      lower,
      upper,
      action: 'return',
      operation: 'return',
      narration: `只有左右子树都返回 true，当前节点组成的整棵子树才是有效 BST；现在将结果交还给父节点。`,
      anchorIds: ['left-recursion', 'right-recursion', 'return-result'],
      visitedNodeIds: [...visitedNodeIds],
      result,
      codeLines: codeMapping('result'),
      primaryLine: { java: [13], python: [8], golang: [12], javascript: [12] },
      variables: [],
      annotations: visual ? [{ nodeId: visual.id, text: `左 ${leftResult} / 右 ${rightResult}\n返回 ${result}`, position: 'bottom', type: 'return' }] : [],
      callStack: [...callStack],
    });
    return result;
  };

  const result = visit(root, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0, 'root');
  addStep({
    description: result ? '验证结束：所有节点都符合 BST 规则。' : '验证结束：发现违反 BST 规则的节点。',
    nodeId: null,
    lower: Number.MIN_SAFE_INTEGER,
    upper: Number.MAX_SAFE_INTEGER,
    action: 'result',
    operation: 'done',
    narration: result
      ? '从根到每个节点的严格范围检查都通过，因此整棵树是有效的二叉搜索树。'
      : '有节点违反了从祖先继承的严格范围，因此整棵树不是有效的二叉搜索树。',
    anchorIds: ['return-result'],
    visitedNodeIds: [...visitedNodeIds],
    result,
    codeLines: { java: [3], python: [2], golang: [2], javascript: [2] },
    primaryLine: { java: [3], python: [2], golang: [2], javascript: [2] },
    variables: [], annotations: [], callStack: [],
  });
  return steps;
};
