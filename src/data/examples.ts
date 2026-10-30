import type { DataExample } from '../types';
import { algorithmThoughts } from './algorithmThoughts';

export const dataExamples: DataExample[] = [
  { name: '示例1: 有效BST', input: [2, 1, 3], expected: true },
  { name: '示例2: 无效BST', input: [5, 1, 4, null, null, 3, 6], expected: false },
  { name: '单节点', input: [1], expected: true },
  { name: '左倾斜树', input: [3, 2, null, 1], expected: true },
  { name: '右倾斜树', input: [1, null, 2, null, 3], expected: true },
  { name: '完全二叉搜索树', input: [4, 2, 6, 1, 3, 5, 7], expected: true },
  { name: '边界值测试', input: [2147483647], expected: true },
];

export { algorithmThoughts };
