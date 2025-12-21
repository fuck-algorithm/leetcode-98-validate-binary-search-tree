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
      functionName: 'isValidBST',
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
        java: [3, 4],
        python: [2, 3],
        golang: [3, 4],
        javascript: [3, 4],
      },
      variables: [
        { name: 'root', value: node ? `TreeNode(${node.val})` : 'null', line: 3, language: 'java' },
        { name: 'lower', value: formatBound(lower), line: 3, language: 'java' },
        { name: 'upper', value: formatBound(upper), line: 3, language: 'java' },
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
          java: [4, 5, 6],
          python: [3, 4],
          golang: [4, 5, 6],
          javascript: [4, 5, 6],
        },
        variables: [],
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
        java: [7, 8, 9],
        python: [5],
        golang: [7, 8, 9],
        javascript: [7, 8, 9],
      },
      variables: [
        { name: 'root.val', value: node.val.toString(), line: 7, language: 'java' },
        { name: 'lower', value: formatBound(lower), line: 7, language: 'java' },
        { name: 'upper', value: formatBound(upper), line: 7, language: 'java' },
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
          java: [7, 8, 9],
          python: [5],
          golang: [7, 8, 9],
          javascript: [7, 8, 9],
        },
        variables: [],
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
          java: [10],
          python: [6],
          golang: [10],
          javascript: [10],
        },
        variables: [
          { name: 'new_upper', value: node.val.toString(), line: 10, language: 'java' },
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
          java: [10],
          python: [6],
          golang: [10],
          javascript: [10],
        },
        variables: [],
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
          java: [10],
          python: [7],
          golang: [10],
          javascript: [10],
        },
        variables: [
          { name: 'new_lower', value: node.val.toString(), line: 10, language: 'java' },
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
        java: [10],
        python: [6, 7],
        golang: [10],
        javascript: [10],
      },
      variables: [
        { name: 'leftResult', value: leftResult.toString(), line: 10, language: 'java' },
        { name: 'rightResult', value: rightResult.toString(), line: 10, language: 'java' },
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
      java: [1, 2, 11, 12, 13],
      python: [1, 2],
      golang: [1, 2, 11, 12, 13],
      javascript: [1, 2, 11, 12, 13],
    },
    variables: [],
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
      java: [11, 12, 13],
      python: [1, 2],
      golang: [11, 12, 13],
      javascript: [11, 12, 13],
    },
    variables: [
      { name: 'result', value: result.toString(), line: 13, language: 'java' },
    ],
    annotations: [],
    callStack: [],
  });
  
  return steps;
};
