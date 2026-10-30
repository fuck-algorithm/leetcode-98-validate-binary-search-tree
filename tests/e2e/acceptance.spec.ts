import { expect, test } from '@playwright/test';

test('single-screen workspace, input validation and keyboard controls', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '98. 验证二叉搜索树' })).toBeVisible();
  await expect(page.locator('.tree-canvas')).toBeVisible();
  await expect(page.getByText('算法代码')).toBeVisible();
  await expect(page.getByRole('slider', { name: '演示进度' })).toBeVisible();
  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const canvas = rect('.canvas-container');
    const svg = rect('.tree-canvas');
    const code = rect('.code-panel');
    return {
      chromeRatio: (rect('.header').height + rect('.data-input').height + rect('.playback-controls').height) / innerHeight,
      canvasHeightRatio: canvas.height / innerHeight,
      svgHeightRatio: svg.height / innerHeight,
      canvasWidthShare: canvas.width / (canvas.width + code.width),
    };
  });
  expect(geometry.chromeRatio).toBeLessThanOrEqual(0.26);
  expect(geometry.canvasHeightRatio).toBeGreaterThanOrEqual(0.62);
  expect(geometry.svgHeightRatio).toBeGreaterThanOrEqual(0.5);
  expect(geometry.canvasWidthShare).toBeGreaterThanOrEqual(0.68);

  const input = page.locator('.input-field');
  await input.fill('[1, nope]');
  await input.press('Enter');
  await expect(page.getByText('无效的数值: nope')).toBeVisible();
  await input.fill('[2,1,3]');
  await input.press('Enter');
  await expect(page.locator('.input-field')).toHaveValue('[2,1,3]');
  await expect(page.locator('.step-number')).toHaveText('步骤 1');
  await input.blur();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.step-number')).toHaveText('步骤 2');
  await page.keyboard.press('r');
  await expect(page.locator('.step-number')).toHaveText('步骤 1');
});

test('problem and solution dialogs render markdown structure', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /题目描述/ }).click();
  const problemDialog = page.locator('.modal-content');
  await expect(problemDialog.getByRole('heading', { name: /验证二叉搜索树/ })).toBeVisible();
  await expect(problemDialog.locator('ul li')).toHaveCount(5);
  await expect(problemDialog.locator('strong').first()).toBeVisible();
  await problemDialog.getByRole('button', { name: '关闭题目描述' }).click();

  await page.getByRole('button', { name: /算法思路/ }).click();
  const thoughtsDialog = page.locator('.modal-content');
  await expect(thoughtsDialog.getByRole('heading', { name: '算法思路' })).toBeVisible();
  await expect(thoughtsDialog.getByRole('heading', { name: /为什么不能只比较父子节点/ })).toBeVisible();
  await expect(thoughtsDialog.locator('ol li')).toHaveCount(4);
});

test('canvas keeps stable node identities when stepping and honors reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const initialIds = await page.locator('.node').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-node-id')));
  await page.keyboard.press('ArrowRight');
  const nextIds = await page.locator('.node').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-node-id')));
  expect(nextIds).toEqual(initialIds);
  await expect(page.locator('.step-description')).toBeVisible();
});
