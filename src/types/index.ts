// 二叉树节点定义
export interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

// 可视化节点（包含位置信息）
export interface VisualNode {
  id: string;
  val: number | null;
  x: number;
  y: number;
  left: VisualNode | null;
  right: VisualNode | null;
  parent: VisualNode | null;
  isNull: boolean;
  depth: number;
}

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

// 代码行映射（多语言支持）
export interface CodeLineMapping {
  java: number[];
  python: number[];
  golang: number[];
  javascript: number[];
}

// 变量状态
export interface VariableState {
  name: string;
  value: string;
  line: number;
  language: 'java' | 'python' | 'golang' | 'javascript';
}

// 标注信息
export interface Annotation {
  nodeId: string;
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  type: 'info' | 'compare' | 'result' | 'param' | 'return';
}

// 调用栈帧
export interface CallStackFrame {
  functionName: string;
  nodeVal: number | null;
  lower: string;
  upper: string;
  depth: number;
}

// 支持的编程语言
export type ProgrammingLanguage = 'java' | 'python' | 'golang' | 'javascript';

// 播放状态
export interface PlaybackState {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
}

// 数据样例
export interface DataExample {
  name: string;
  input: (number | null)[];
  expected: boolean;
}
