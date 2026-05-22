import { test, expect } from '@playwright/test';

test.describe('Viewport Offset Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to be ready
    await page.waitForFunction(() => (window as any).e2eReady === true);
  });

  test('navigation bar remains at top-0 when inspector is open', async ({ page }) => {
    const nav = page.locator('nav');
    const inspector = page.locator('[role="dialog"]');

    // 1. Initial state: Nav is at top
    await expect(nav).toBeVisible();
    let navBox = await nav.boundingBox();
    expect(navBox?.y).toBe(0);

    // 2. Open Inspector by clicking a system
    // We wait for the star map to be visible
    const starMap = page.locator('[data-testid="star-map"]');
    await expect(starMap).toBeVisible();

    // Click on a system node (first one found)
    await page.click('canvas', { position: { x: 400, y: 300 } }); // Rough center click to hit something or we can try to find a system node
    
    // Better way: wait for some system nodes to be rendered and click one
    // But StarMap renders on canvas. 
    // We can use the exposed stores to select an entity directly if canvas clicking is flaky.
    await page.evaluate(() => {
      const cluster = (window as any).getClusterSnapshot();
      if (cluster && cluster.Systems && cluster.Systems.length > 0) {
        (window as any).stores.selectedEntity.set(cluster.Systems[0]);
      }
    });

    // 3. Verify Inspector is visible
    await expect(inspector).toBeVisible();

    // 4. Verify Nav is still at top-0
    navBox = await nav.boundingBox();
    expect(navBox?.y).toBe(0);

    // 5. Verify fixed positioning
    const navStyle = await nav.evaluate((el) => window.getComputedStyle(el).position);
    expect(navStyle).toBe('fixed');

    const inspectorStyle = await inspector.evaluate((el) => window.getComputedStyle(el).position);
    expect(inspectorStyle).toBe('fixed');

    // 6. Verify page hasn't scrolled
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });

  test('map components are absolute and inset-0', async ({ page }) => {
    const starMap = page.locator('[data-testid="star-map"]');
    await expect(starMap).toBeVisible();

    const style = await starMap.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        position: s.position,
        top: s.top,
        left: s.left,
        right: s.right,
        bottom: s.bottom
      };
    });

    expect(style.position).toBe('absolute');
    expect(style.top).toBe('0px');
    expect(style.left).toBe('0px');
    expect(style.right).toBe('0px');
    expect(style.bottom).toBe('0px');
  });
});
