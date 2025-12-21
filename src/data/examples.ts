import type { DataExample } from '../types';

export const dataExamples: DataExample[] = [
  {
    name: '示例1: 有效BST',
    input: [2, 1, 3],
    expected: true,
  },
  {
    name: '示例2: 无效BST',
    input: [5, 1, 4, null, null, 3, 6],
    expected: false,
  },
  {
    name: '单节点',
    input: [1],
    expected: true,
  },
  {
    name: '左倾斜树',
    input: [3, 2, null, 1],
    expected: true,
  },
  {
    name: '右倾斜树',
    input: [1, null, 2, null, 3],
    expected: true,
  },
  {
    name: '完全二叉搜索树',
    input: [4, 2, 6, 1, 3, 5, 7],
    expected: true,
  },
  {
    name: '边界值测试',
    input: [2147483647],
    expected: true,
  },
];

export const algorithmThoughts = `
## 验证二叉搜索树 - 解题思路

### 问题分析
二叉搜索树（BST）的定义：
- 节点的左子树只包含**严格小于**当前节点的数
- 节点的右子树只包含**严格大于**当前节点的数
- 所有左子树和右子树自身必须也是二叉搜索树

### 方法：递归 + 范围限定

#### 核心思想
设计递归函数 \`helper(root, lower, upper)\`，判断以 root 为根的子树中所有节点的值是否都在 \`(lower, upper)\` 的**开区间**内。

#### 递归逻辑
1. **空节点**：返回 true（空树是有效的BST）
2. **范围检查**：如果 \`root.val <= lower\` 或 \`root.val >= upper\`，返回 false
3. **递归左子树**：调用 \`helper(root.left, lower, root.val)\`
   - 左子树所有节点必须小于当前节点，所以上界变为 \`root.val\`
4. **递归右子树**：调用 \`helper(root.right, root.val, upper)\`
   - 右子树所有节点必须大于当前节点，所以下界变为 \`root.val\`

#### 初始调用
\`helper(root, -∞, +∞)\`

### 复杂度分析
- **时间复杂度**：O(n)，每个节点访问一次
- **空间复杂度**：O(n)，递归栈深度最坏为 n（链状树）

### 关键点
1. 使用 \`long\` 类型避免整数边界问题
2. 注意是**严格**小于/大于，不能等于
3. 范围是**开区间**，不包含边界值
`;
