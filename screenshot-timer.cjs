const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto('http://localhost:8081/soul-jam/');
  await page.waitForTimeout(500);

  // Title screen
  await page.keyboard.press('Enter');
  await page.waitForTimeout(4500); // wait through preload + char select appears

  // Character select → confirm
  await page.keyboard.press('Space');
  await page.waitForTimeout(800);

  // Court select → confirm
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);

  // Wait through CheckBall (1.5s) + Inbound (1.0s) + some Live time
  await page.waitForTimeout(3200);

  // Hold Space to start shooting — bar shows while key is held
  await page.keyboard.down('Space');

  // Take multiple screenshots to catch the bar mid-fill
  await page.waitForTimeout(100);
  await page.screenshot({ path: '/Users/crafterc/Claude Test/soul-jam/timer-bar-position.png' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/Users/crafterc/Claude Test/soul-jam/timer-bar-mid.png' });

  await page.keyboard.up('Space');

  // Wait for shot to resolve then screenshot the "after" state
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/Users/crafterc/Claude Test/soul-jam/timer-bar-after.png' });

  console.log('Done!');
  await browser.close();
})();
