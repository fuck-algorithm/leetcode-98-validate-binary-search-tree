import type { TreeNode, VisualNode } from '../types';

// 从数组构建二叉树
export const buildTreeFromArray = (arr: (number | null)[]): TreeNode | null => {
  if (!arr || arr.length === 0 || arr[0] === null) return null;
  
  const root: TreeNode = { val: arr[0], left: null, right: null };
  const queue: (TreeNode | null)[] = [root];
  let i = 1;
  
  while (i < arr.length) {
    const current = queue.shift();
    if (!current) {
      i += 2;
      continue;
    }
    
    // 左子节点
    if (i < arr.length) {
      if (arr[i] !== null) {
        current.left = { val: arr[i]!, left: null, right: null };
        queue.push(current.left);
      } else {
        queue.push(null);
      }
      i++;
    }
    
    // 右子节点
    if (i < arr.length) {
      if (arr[i] !== null) {
        current.right = { val: arr[i]!, left: null, right: null };
        queue.push(current.right);
      } else {
        queue.push(null);
      }
      i++;
    }
  }
  
  return root;
};

// 计算树的高度
export const getTreeHeight = (node: TreeNode | null): number => {
  if (!node) return 0;
  return 1 + Math.max(getTreeHeight(node.left), getTreeHeight(node.right));
};

// 计算树的节点数
export const getNodeCount = (node: TreeNode | null): number => {
  if (!node) return 0;
  return 1 + getNodeCount(node.left) + getNodeCount(node.right);
};

// 构建可视化树（包含位置信息）
export const buildVisualTree = (
  root: TreeNode | null,
  width: number,
  height: number,
  showNullNodes: boolean = true
): VisualNode | null => {
  if (!root) return null;
  
  const treeHeight = getTreeHeight(root);
  const levelHeight = height / (treeHeight + 1);
  
  let nodeId = 0;
  
  const buildNode = (
    node: TreeNode | null,
    depth: number,
    left: number,
    right: number,
    parent: VisualNode | null,
    parentHasThisChild: boolean = true
  ): VisualNode | null => {
    // 如果不显示NULL节点，且当前节点为空，则返回null
    if (!node && !showNullNodes) return null;
    
    // 如果当前节点为空，且父节点没有这个子节点（即不需要显示NULL占位符），则返回null
    // 只有当父节点存在且该位置确实需要显示NULL时才创建NULL节点
    if (!node && !parentHasThisChild) return null;
    
    // 如果节点为空且深度超过树高度，不再创建更深层的NULL节点
    if (!node && depth > treeHeight) return null;
    
    const x = (left + right) / 2;
    const y = (depth + 1) * levelHeight;
    
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
      // 对于实际存在的节点，总是尝试创建其子节点（包括NULL子节点）
      // 只要showNullNodes为true，就应该显示NULL子节点
      visualNode.left = buildNode(node.left, depth + 1, left, x, visualNode, true);
      visualNode.right = buildNode(node.right, depth + 1, x, right, visualNode, true);
    }
    
    return visualNode;
  };
  
  return buildNode(root, 0, 0, width, null, true);
};

// 获取所有节点（扁平化）
export const flattenVisualTree = (root: VisualNode | null): VisualNode[] => {
  if (!root) return [];
  const nodes: VisualNode[] = [root];
  if (root.left) nodes.push(...flattenVisualTree(root.left));
  if (root.right) nodes.push(...flattenVisualTree(root.right));
  return nodes;
};

// 获取所有边
export const getEdges = (root: VisualNode | null): { source: VisualNode; target: VisualNode }[] => {
  if (!root) return [];
  const edges: { source: VisualNode; target: VisualNode }[] = [];
  
  if (root.left) {
    edges.push({ source: root, target: root.left });
    edges.push(...getEdges(root.left));
  }
  if (root.right) {
    edges.push({ source: root, target: root.right });
    edges.push(...getEdges(root.right));
  }
  
  return edges;
};

// 验证输入数据格式
export const validateInput = (input: string): { valid: boolean; data: (number | null)[]; error?: string } => {
  try {
    // 移除空格
    const trimmed = input.trim();
    
    // 检查是否为数组格式
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
      return { valid: false, data: [], error: '输入格式错误，请使用数组格式，如 [2,1,3]' };
    }
    
    // 解析数组
    const content = trimmed.slice(1, -1);
    if (content.trim() === '') {
      return { valid: false, data: [], error: '数组不能为空' };
    }
    
    const parts = content.split(',').map(s => s.trim());
    const data: (number | null)[] = [];
    
    for (const part of parts) {
      if (part === 'null' || part === '') {
        data.push(null);
      } else {
        const num = parseInt(part, 10);
        if (isNaN(num)) {
          return { valid: false, data: [], error: `无效的数值: ${part}` };
        }
        // 检查范围
        if (num < -2147483648 || num > 2147483647) {
          return { valid: false, data: [], error: `数值超出范围: ${part}` };
        }
        data.push(num);
      }
    }
    
    // 根节点不能为null
    if (data.length === 0 || data[0] === null) {
      return { valid: false, data: [], error: '根节点不能为空' };
    }
    
    // 检查节点数量
    if (data.filter(d => d !== null).length > 10000) {
      return { valid: false, data: [], error: '节点数量超过限制（最多10000个）' };
    }
    
    return { valid: true, data };
  } catch {
    return { valid: false, data: [], error: '解析输入时发生错误' };
  }
};

// 生成随机二叉搜索树
export const generateRandomBST = (nodeCount: number = 7): (number | null)[] => {
  // 生成随机有序数组
  const values: number[] = [];
  let current = Math.floor(Math.random() * 10) + 1;
  for (let i = 0; i < nodeCount; i++) {
    values.push(current);
    current += Math.floor(Math.random() * 10) + 1;
  }
  
  // 从有序数组构建平衡BST
  const buildBST = (arr: number[]): TreeNode | null => {
    if (arr.length === 0) return null;
    const mid = Math.floor(arr.length / 2);
    return {
      val: arr[mid],
      left: buildBST(arr.slice(0, mid)),
      right: buildBST(arr.slice(mid + 1)),
    };
  };
  
  const root = buildBST(values);
  return treeToArray(root);
};

// 生成随机非BST（用于测试）
export const generateRandomNonBST = (nodeCount: number = 5): (number | null)[] => {
  const values: number[] = [];
  for (let i = 0; i < nodeCount; i++) {
    values.push(Math.floor(Math.random() * 100) + 1);
  }
  
  // 随机打乱
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  
  return values;
};

// 将树转换为数组表示
export const treeToArray = (root: TreeNode | null): (number | null)[] => {
  if (!root) return [];
  
  const result: (number | null)[] = [];
  const queue: (TreeNode | null)[] = [root];
  
  while (queue.length > 0) {
    const node = queue.shift();
    if (node) {
      result.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    } else {
      result.push(null);
    }
  }
  
  // 移除末尾的null
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop();
  }
  
  return result;
};
