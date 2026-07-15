import type { TreeNode, AlgorithmStep, VisualNode, CallStackFrame } from '../types';
import { buildVisualTree } from './treeUtils';

// 生成算法执行步骤
export const generateAlgorithmSteps = (
  root: TreeNode | null,
  canvasWidth: number,
  canvasHeight: number
): AlgorithmStep[] => {
  const steps: AlgorithmStep[] = [];
  const visualRoot = buildVisualTree(root, canvasWidth, canvasHeight, false);
  const nodeMap = new Map<number, VisualNode>();
  
  // 建立值到节点的映射
  const buildNodeMap = (node: VisualNode | null, path: string = '') => {
    if (!node || node.isNull) return;
    nodeMap.set(node.val!, node);
    if (node.left) buildNodeMap(node.left, path + 'L');
    if (node.right) buildNodeMap(node.right, path + 'R');
  };
  
  if (visualRoot) buildNodeMap(visualRoot);
  
  let stepId = 0;
  const callStack: CallStackFrame[] = [];
  
  const formatBound = (val: number): string => {
    if (val === Number.MIN_SAFE_INTEGER) return '-∞';
    if (val === Number.MAX_SAFE_INTEGER) return '+∞';
    return val.toString();
  };
  
  const helper = (node: TreeNode | null, lower: number, upper: number, depth: number): boolean => {
    const nodeVal = node?.val ?? null;
    const visualNode = nodeVal !== null ? nodeMap.get(nodeVal) : null;
    const nodeId = visualNode?.id ?? null;
    
    // 进入递归
    callStack.push({
      functionName: 'helper',
      nodeVal,
      lower: formatBound(lower),
      upper: formatBound(upper),
      depth,
    });
    
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
        { name: 'root', value: node ? `TreeNode(${node.val})` : 'nil', line: 5, language: 'golang' },
        { name: 'lower', value: formatBound(lower), line: 5, language: 'golang' },
        { name: 'upper', value: formatBound(upper), line: 5, language: 'golang' },
        { name: 'root', value: node ? `TreeNode(${node.val})` : 'null', line: 5, language: 'javascript' },
        { name: 'lower', value: formatBound(lower), line: 5, language: 'javascript' },
        { name: 'upper', value: formatBound(upper), line: 5, language: 'javascript' },
      ],
      annotations: nodeId ? [{
        nodeId,
        text: `进入: (${formatBound(lower)}, ${formatBound(upper)})`,
        position: 'top',
        type: 'param',
      }] : [],
      callStack: [...callStack],
    });
    
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
          { name: 'root', value: 'nil', line: 6, language: 'golang' },
          { name: 'root', value: 'null', line: 6, language: 'javascript' },
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
        java: [10],
        python: [7],
        golang: [9],
        javascript: [9],
      },
      variables: [
        { name: 'root.val', value: node.val.toString(), line: 10, language: 'java' },
        { name: 'lower', value: formatBound(lower), line: 10, language: 'java' },
        { name: 'upper', value: formatBound(upper), line: 10, language: 'java' },
        { name: 'inRange', value: inRange.toString(), line: 11, language: 'java' },
        { name: 'x', value: node.val.toString(), line: 7, language: 'python' },
        { name: 'root.Val', value: node.val.toString(), line: 9, language: 'golang' },
        { name: 'lower', value: formatBound(lower), line: 9, language: 'golang' },
        { name: 'upper', value: formatBound(upper), line: 9, language: 'golang' },
        { name: 'inRange', value: inRange.toString(), line: 10, language: 'golang' },
        { name: 'root.val', value: node.val.toString(), line: 9, language: 'javascript' },
        { name: 'lower', value: formatBound(lower), line: 9, language: 'javascript' },
        { name: 'upper', value: formatBound(upper), line: 9, language: 'javascript' },
        { name: 'inRange', value: inRange.toString(), line: 10, language: 'javascript' },
      ],
      annotations: [{
        nodeId: nodeId!,
        text: `${formatBound(lower)} < ${node.val} < ${formatBound(upper)}\n${inRange ? '✓ 满足' : '✗ 不满足'}`,
        position: 'right',
        type: 'compare',
      }],
      callStack: [...callStack],
    });
    
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
          java: [11],
          python: [7],
          golang: [10],
          javascript: [10],
        },
        variables: [
          { name: 'inRange', value: 'false', line: 12, language: 'java' },
          { name: 'inRange', value: 'false', line: 10, language: 'golang' },
          { name: 'inRange', value: 'false', line: 10, language: 'javascript' },
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
          { name: 'new_upper', value: node.val.toString(), line: 12, language: 'golang' },
          { name: 'leftResult', value: 'pending', line: 12, language: 'golang' },
          { name: 'new_upper', value: node.val.toString(), line: 12, language: 'javascript' },
          { name: 'leftResult', value: 'pending', line: 12, language: 'javascript' },
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
          { name: 'leftResult', value: 'false', line: 12, language: 'golang' },
          { name: 'leftResult', value: 'false', line: 12, language: 'javascript' },
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
          { name: 'new_lower', value: node.val.toString(), line: 13, language: 'golang' },
          { name: 'rightResult', value: 'pending', line: 13, language: 'golang' },
          { name: 'new_lower', value: node.val.toString(), line: 13, language: 'javascript' },
          { name: 'rightResult', value: 'pending', line: 13, language: 'javascript' },
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
        { name: 'leftResult', value: leftResult.toString(), line: 12, language: 'golang' },
        { name: 'rightResult', value: rightResult.toString(), line: 13, language: 'golang' },
        { name: 'finalResult', value: finalResult.toString(), line: 12, language: 'golang' },
        { name: 'leftResult', value: leftResult.toString(), line: 12, language: 'javascript' },
        { name: 'rightResult', value: rightResult.toString(), line: 13, language: 'javascript' },
        { name: 'finalResult', value: finalResult.toString(), line: 12, language: 'javascript' },
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
      { name: 'root', value: 'TreeNode(root)', line: 2, language: 'golang' },
      { name: 'root', value: 'TreeNode(root)', line: 2, language: 'javascript' },
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
      golang: [2],
      javascript: [1],
    },
    variables: [
      { name: 'result', value: result.toString(), line: 3, language: 'java' },
      { name: 'result', value: result.toString(), line: 2, language: 'golang' },
      { name: 'result', value: result.toString(), line: 2, language: 'javascript' },
    ],
    annotations: [],
    callStack: [],
  });
  
  return steps;
};
