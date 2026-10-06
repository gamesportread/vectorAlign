import { test, expect } from '@playwright/test';

test('capture high definition earth visual screenshot', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[error] ${err.message}`));

  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();

  // Wait for 3D textures to fully stream and render several frames
  await page.waitForTimeout(3000);

  // Take screenshot of the 3D scene viewport
  await page.locator('.scene-container').screenshot({
    path: '/tmp/earth_hd_scene.png'
  });

  console.log('Console logs:', logs);
});
