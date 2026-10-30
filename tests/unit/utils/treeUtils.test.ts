import { describe, expect, it } from 'vitest';
import {
  buildTreeFromArray,
  buildVisualTree,
  flattenVisualTree,
  generateRandomBST,
  generateRandomNonBST,
  getEdges,
  getNodeCount,
  getTreeHeight,
  treeToArray,
  validateInput,
} from '../../../src/utils/treeUtils';

const isValidBst = (input: (number | null)[]) => {
  const visit = (node: ReturnType<typeof buildTreeFromArray>, lower: number, upper: number): boolean => {
    if (!node) return true;
    return node.val > lower && node.val < upper && visit(node.left, lower, node.val) && visit(node.right, node.val, upper);
  };
  return visit(buildTreeFromArray(input), -Infinity, Infinity);
};

describe('validateInput', () => {
  it('accepts level-order arrays with null children', () => {
    expect(validateInput('[5,1,4,null,null,3,6]')).toEqual({ valid: true, data: [5, 1, 4, null, null, 3, 6] });
  });

  it.each(['', '[]', '[null,1]', '[1, nope]', '[12abc]', '[1.5]', '[2147483648]', '[1,,2]'])('rejects invalid input %s', input => {
    expect(validateInput(input).valid).toBe(false);
  });
});

describe('tree structure helpers', () => {
  it('builds, flattens, counts and serializes level-order trees', () => {
    const tree = buildTreeFromArray([2, 1, 3]);
    expect(getTreeHeight(tree)).toBe(2);
    expect(getNodeCount(tree)).toBe(3);
    expect(treeToArray(tree)).toEqual([2, 1, 3]);
    expect(flattenVisualTree(buildVisualTree(tree, 800, 400))).toHaveLength(7);
    expect(getEdges(buildVisualTree(tree, 800, 400))).toHaveLength(6);
  });

  it('handles empty trees and rejects invalid inputs', () => {
    expect(buildTreeFromArray([])).toBeNull();
    expect(buildTreeFromArray([null])).toBeNull();
    expect(getTreeHeight(null)).toBe(0);
    expect(getNodeCount(null)).toBe(0);
    expect(treeToArray(null)).toEqual([]);
    expect(flattenVisualTree(null)).toEqual([]);
    expect(getEdges(null)).toEqual([]);
    expect(buildVisualTree(null, 800, 400)).toBeNull();
    expect(buildVisualTree(buildTreeFromArray([1]), 80, 80, false)).not.toBeNull();
    expect(buildVisualTree(buildTreeFromArray([1]), 80, 80, true)).not.toBeNull();
  });
});

describe('random tree data', () => {
  it('generates legal BST inputs', () => {
    for (let i = 0; i < 20; i++) {
      const input = generateRandomBST(7);
      expect(validateInput(JSON.stringify(input)).valid).toBe(true);
      expect(isValidBst(input)).toBe(true);
    }
  });

  it('generates syntactically valid non-BST inputs', () => {
    for (let i = 0; i < 20; i++) {
      const input = generateRandomNonBST(5);
      expect(validateInput(JSON.stringify(input)).valid).toBe(true);
      expect(isValidBst(input)).toBe(false);
    }
  });
});
