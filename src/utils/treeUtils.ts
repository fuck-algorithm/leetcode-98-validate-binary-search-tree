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
    if (parts.some(part => part === '')) {
      return { valid: false, data: [], error: '数组中存在空元素' };
    }
    const data: (number | null)[] = [];
    
    for (const part of parts) {
      if (part === 'null' || part === '') {
        data.push(null);
      } else {
        if (!/^[+-]?\d+$/.test(part)) {
          return { valid: false, data: [], error: `无效的数值: ${part}` };
        }
        const num = Number(part);
        if (!Number.isSafeInteger(num)) {
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
  const count = Math.max(2, Math.min(10, Math.floor(nodeCount)));
  const values = Array.from({ length: count }, (_, index) => index + 1);
  const rootIndex = Math.floor(Math.random() * count);
  const rootValue = values[rootIndex];
  const childIndex = rootIndex === count - 1 ? 0 : rootIndex + 1;
  const childValue = rootIndex === count - 1 ? values[count - 1] : values[0];
  const result: (number | null)[] = [rootValue];

  if (childIndex === 0) {
    result.push(childValue, null);
  } else {
    result.push(null, childValue);
  }

  return result;
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
