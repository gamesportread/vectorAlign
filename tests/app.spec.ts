import { test, expect } from '@playwright/test';

test('entry home screen displays title, 6 options, switches mission details and enters docking simulation', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');

  // 1. Verify Top-Left Title and Brand
  await expect(page.locator('.home-title')).toContainText('VECTOR');
  await expect(page.locator('.home-title')).toContainText('ALIGN');

  // 2. Verify all 6 options in Bottom-Left
  await expect(page.getByRole('button', { name: /1\s+升空/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /2\s+太空站对接/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /3\s+太空站离开/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /4\s+舱体降落/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /5\s+选项/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /6\s+制作人员/ })).toBeVisible();

  // 3. Verify Right-Side scenario card
  await expect(page.locator('.scenario-card')).toBeVisible();
  await expect(page.getByText('国际空间站 (ISS) 标准对接演练')).toBeVisible();

  // 4. Test clicking Mission 1 (升空)
  await page.getByRole('button', { name: /1\s+升空/ }).click();
  await expect(page.locator('.briefing-mission-badge')).toContainText('升空');
  await expect(page.getByText('第一宇宙速度与级间分离')).toBeVisible();

  // 5. Test clicking Enter on placeholder mission 1 triggers dev notice modal
  await page.getByRole('button', { name: /进入模拟|ENTER SIMULATION/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('任务筹备研发中')).toBeVisible();
  await page.getByRole('button', { name: '返回主菜单' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  // 6. Test clicking Mission 3 (太空站离开)
  await page.getByRole('button', { name: /3\s+太空站离开/ }).click();
  await expect(page.locator('.briefing-mission-badge')).toContainText('太空站离开');
  await expect(page.getByText('撤离安全走廊与弹簧分离')).toBeVisible();

  // 7. Test clicking Mission 4 (舱体降落)
  await page.getByRole('button', { name: /4\s+舱体降落/ }).click();
  await expect(page.locator('.briefing-mission-badge')).toContainText('舱体降落');
  await expect(page.getByText('黑障区与触地反推火箭')).toBeVisible();

  // 8. Test Option 5 (选项) modal
  await page.getByRole('button', { name: /5\s+选项/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('系统设置 · 选项')).toBeVisible();
  await page.getByRole('button', { name: 'Close / 关闭' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  // 9. Test Option 6 (制作人员) modal
  await page.getByRole('button', { name: /6\s+制作人员/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('制作人员与致谢 · Credits')).toBeVisible();
  await page.getByRole('button', { name: 'Close / 关闭' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  // 10. Test clicking Option 2 (太空站对接) and Enter
  await page.getByRole('button', { name: /2\s+太空站对接/ }).click();
  await expect(page.locator('.briefing-mission-badge')).toContainText('太空站对接');
  await page.getByRole('button', { name: /进入模拟|ENTER SIMULATION/ }).click();

  // Enters the simulator interface!
  await expect(page.getByRole('heading', { name: /学会停下来/ })).toBeVisible();

  // Topbar has return to menu button
  const returnBtn = page.getByRole('button', { name: /返回主菜单|Menu/ });
  await expect(returnBtn).toBeVisible();
  await returnBtn.click();

  // Returned to Home screen!
  await expect(page.locator('.home-title')).toBeVisible();

  expect(errors).toEqual([]);
});

test('loads the flight surface, switches language and operates keyboard / touch', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?screen=simulator');
  await expect(page.getByRole('heading', { name: /学会停下来/ })).toBeVisible();
  await page.getByRole('button', { name: 'Switch language' }).click();
  await expect(page.getByRole('heading', { name: /Learn to stop/ })).toBeVisible();
  await page.getByRole('button', { name: 'Take control', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  if (isMobile) {
    await expect(page.locator('.scene-container')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Forward +', exact: true })).toBeInViewport();
  }
  await page.locator('.scene-container').click({ position: { x: 5, y: 60 } });
  await page.keyboard.down('KeyF');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyF');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset mission' }).click();
  await expect(page.getByRole('button', { name: 'Take control', exact: true })).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: 'Choose a mission' }).click();
  await page.getByRole('button', { name: /03 Align the port/ }).click();
  await expect(page.getByRole('heading', { name: /Align the port/, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Briefing', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close / 关闭' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('demo completes, produces a debrief and persists the record without awarding progress', async ({ page }) => {
  await page.goto('/?screen=simulator');
  await page.getByRole('button', { name: '观看示范', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 40000 });
  await expect(page.getByText('完成得很好。')).toBeVisible();
  await page.getByRole('button', { name: 'Close / 关闭' }).click();
  await page.reload();
  await page.getByRole('button', { name: '飞行记录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '你的飞行记录' })).toBeVisible();
  await expect(page.getByText('完成得很好。')).toBeVisible();
});

test('guide and installation help remain accessible', async ({ page }) => {
  await page.goto('/?screen=simulator');
  await page.getByRole('button', { name: '学习指南', exact: true }).click();
  await expect(page.getByRole('heading', { name: '模型与科学边界' })).toBeVisible();
  await page.getByRole('button', { name: '安装应用' }).click();
  await expect(page.getByRole('dialog')).toContainText('添加到主屏幕');
});

test('cached lessons work offline and the scene fits the viewport', async ({ page, context, isMobile }) => {
  await page.goto('/?screen=simulator');
  await expect(page.getByText('离线课程已就绪', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: isMobile ? '/tmp/vector-align-mobile.png' : '/tmp/vector-align-desktop.png', fullPage: true });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /学会停下来/ })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await expect(page.getByRole('button', { name: '暂停', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('pointer thrust, cancellation and rotation preserve a usable flight surface', async ({ page, isMobile }) => {
  await page.goto('/?screen=simulator');
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  const reverse = page.getByRole('button', { name: '前后 +', exact: true });
  await reverse.scrollIntoViewIfNeeded();
  const rect = await reverse.boundingBox();
  expect(rect).not.toBeNull();
  await page.mouse.move(rect!.x + rect!.width / 2, rect!.y + rect!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(450);
  await page.mouse.up();
  const speed = () => page.locator('.metric').nth(1).locator('strong').textContent();
  expect(parseFloat((await speed())!)).toBeLessThan(0.63);
  await page.waitForTimeout(150);
  const coast = parseFloat((await speed())!);
  await page.waitForTimeout(350);
  expect(parseFloat((await speed())!)).toBeCloseTo(coast, 2);
  if (isMobile) {
    await page.screenshot({ path: '/tmp/vector-align-mobile-flight.png' });
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('.scene-container')).toBeInViewport();
    await expect(reverse).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: '/tmp/vector-align-mobile-landscape.png' });
  }
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('button', { name: '继续飞行', exact: true })).toBeVisible();
});

test('handles collision failure, debrief modal and keyboard R retry cleanly', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?screen=simulator');
  await page.getByRole('button', { name: '开始训练', exact: true }).click();

  for (let i = 0; i < 35; i++) {
    await page.keyboard.down('KeyR');
    await page.waitForTimeout(300);
    if (await page.locator('.scene-failure-overlay').isVisible()) break;
  }

  await expect(page.locator('.scene-failure-overlay')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.failure-title')).toContainText('飞船撞击失控');
  await expect(page.locator('.failure-actions').getByRole('button', { name: /重新开始/ })).toBeVisible();

  await page.getByRole('button', { name: '查看复盘报告' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('科学原理揭秘')).toBeVisible();
  await expect(page.getByText('教官通关秘籍')).toBeVisible();

  await page.keyboard.press('KeyR');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: '暂停', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
