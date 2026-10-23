import { test, expect } from '@playwright/test';

test.describe('Spaceship Hatch E2E Tests', () => {
  test.setTimeout(90000);

  test('initial hatch state is closed, pressing "1" opens it, and clicking toggles it back', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // 1. Open simulator surface
    await page.goto('/?screen=simulator');

    const hatchButton = page.locator('.hatch-btn');
    await expect(hatchButton).toBeVisible();

    // 2. Verify initial state is CLOSED
    await expect(hatchButton).toContainText(/舱门:\s*关闭|Hatch:\s*CLOSED/);
    await expect(hatchButton).toHaveAttribute('aria-label', /飞船舱门控制|Hatch control/);

    // 3. Test keyboard '1' / 'Digit1' triggers hatch opening
    // Click simulator container to ensure focus
    await page.locator('.scene-container').click({ position: { x: 50, y: 50 } });
    await page.keyboard.press('Digit1');

    // Button updates immediately to opening or open state
    await expect(hatchButton).toContainText(/开启中|Opening|舱门:\s*开启|Hatch:\s*OPEN/);

    // Wait for the ~2.0s servo opening animation to finish
    await expect(hatchButton).toContainText(/舱门:\s*开启|Hatch:\s*OPEN/, { timeout: 15000 });
    await expect(hatchButton).toHaveClass(/enabled/);

    // 4. Test clicking the HUD button toggles it back to closed (for mobile / mouse users)
    await hatchButton.click();

    // Button updates to closing or closed state
    await expect(hatchButton).toContainText(/关闭中|Closing|舱门:\s*关闭|Hatch:\s*CLOSED/);

    // Wait for the closing animation to finish
    await expect(hatchButton).toContainText(/舱门:\s*关闭|Hatch:\s*CLOSED/, { timeout: 15000 });

    expect(errors).toEqual([]);
  });

  test('HUD button reflects state accurately across language changes', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => {
      if (!e.message.includes('/models/orig.glb')) errors.push(e.message);
    });

    await page.goto('/?screen=simulator');

    const hatchButton = page.locator('.hatch-btn');
    await expect(hatchButton).toBeVisible();
    await expect(hatchButton).toContainText('舱门: 关闭 [1]');

    // Switch language to English
    await page.getByRole('button', { name: 'Switch language' }).click();

    // Verify English text
    await expect(hatchButton).toContainText('Hatch: CLOSED [1]');

    // Press '1' to open
    await page.keyboard.press('Digit1');
    await expect(hatchButton).toContainText(/Hatch:\s*OPEN/i, { timeout: 15000 });

    expect(errors).toEqual([]);
  });

  test('displays interactive hatch banner during flight with teen explanations and opens on click', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/?screen=simulator');

    // Start flight
    await page.getByRole('button', { name: '开始训练', exact: true }).click();
    await expect(page.getByRole('button', { name: '暂停', exact: true })).toBeVisible();

    // With hatch closed, the interactive tip banner must be visible
    const banner = page.locator('.hatch-tip-banner');
    await expect(banner).toBeVisible();
    await expect(banner.locator('.hatch-tip-title')).toContainText('💡 准备对接提示：按 [1] 键（或点击此处）打开头锥保护罩，露出对接口！');
    await expect(banner.locator('.hatch-tip-desc')).toContainText('就像飞船的头盔面罩');
    await expect(banner.locator('.hatch-tip-desc')).toContainText('国际对接口（IDA）');

    // Click banner to open hatch
    await banner.click();

    // Verify hatch button updates to opening/open
    const hatchButton = page.locator('.hatch-btn');
    await expect(hatchButton).toContainText(/开启中|舱门:\s*开启/, { timeout: 15000 });
    await expect(hatchButton).toContainText(/舱门:\s*开启/, { timeout: 15000 });

    // When hatch is open, banner should automatically disappear
    await expect(banner).not.toBeVisible();

    expect(errors).toEqual([]);
  });

  test('briefing modal and tour contain teen-friendly nosecone hatch and IDA explanations', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => {
      if (!e.message.includes('/models/orig.glb')) errors.push(e.message);
    });

    await page.goto('/?screen=simulator');

    // Open Mission Briefing Modal
    await page.getByRole('button', { name: /攻略|Briefing/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('头锥保护罩（Nosecone Hatch）：就像飞船的头盔面罩！')).toBeVisible();
    await expect(page.getByText(/国际对接口（IDA）：飞船头部的(?:对接|锁扣)大门/)).toBeVisible();

    // Close modal (ensure modal-close can be clicked cleanly without interception)
    await page.getByRole('button', { name: 'Close / 关闭' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Open visual guide
    const guideBtn = page.getByRole('button', { name: /点我看图文讲解|Visual guide/ });
    await guideBtn.scrollIntoViewIfNeeded();
    await guideBtn.click();
    await expect(page.getByRole('navigation', { name: /讲解步骤|Guide steps/ })).toBeVisible();

    // Switch to step 2 "你的飞船"
    const shipStepBtn = page.getByRole('button', { name: /你的飞船|Your ship/ }).or(page.locator('.intro-steps button').nth(1));
    await shipStepBtn.first().scrollIntoViewIfNeeded();
    await shipStepBtn.first().click();
    await expect(page.locator('.intro-steps button').nth(1)).toHaveClass(/active/);
    await expect(page.getByText(/机头的头锥保护罩就像头盔面罩/)).toBeVisible();

    expect(errors).toEqual([]);
  });
});
