import { describe, expect, it } from 'vitest';
import { generateAlgorithmSteps } from '../../../src/utils/algorithmSteps';
import { buildTreeFromArray } from '../../../src/utils/treeUtils';

describe('generateAlgorithmSteps', () => {
  it('explains the inherited range that rejects a descendant outside its ancestor bounds', () => {
    const steps = generateAlgorithmSteps(buildTreeFromArray([5, 1, 7, null, null, 4]), 800, 500);
    const failure = steps.find(step => step.action === 'check' && step.nodeId && step.result === false);

    expect(failure).toMatchObject({ nodeId: expect.any(String), lower: 5, upper: 7, result: false });
    expect(failure?.description).toContain('5 < 4 < 7');
    expect(failure?.annotations[0]?.text).toContain('越界');
  });

  it('binds repeated values to their own stable tree nodes instead of matching by value', () => {
    const root = buildTreeFromArray([5, 5, 7]);
    const first = generateAlgorithmSteps(root, 800, 500);
    const second = generateAlgorithmSteps(root, 800, 500);
    const checked = first.filter(step => step.action === 'check');

    expect(checked[0].nodeId).not.toBe(checked[1].nodeId);
    expect(first.map(step => step.nodeId)).toEqual(second.map(step => step.nodeId));
  });

  it('provides readable explanations and bindings for every step', () => {
    const steps = generateAlgorithmSteps(buildTreeFromArray([2, 1, 3]), 800, 500);

    expect(steps.length).toBeGreaterThan(1);
    expect(steps.every(step => step.description.trim().length > 8)).toBe(true);
    expect(steps.every(step => step.narration && step.operation && step.anchorIds?.length)).toBe(true);
    expect(steps.every(step => step.codeLines.java.length > 0)).toBe(true);
  });
});
