import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('home feed and AI assistant render without browser errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await expect(page.getByRole('heading', { name: 'Your corner of the internet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open CircleUp AI' })).toBeVisible();
  await expect(page.getByText(/finally shipped my first ai side project/i)).toBeVisible();
  await expect.poll(() => pageErrors).toEqual([]);
});

test('discover search works at the current viewport size', async ({ page }) => {
  await page.getByRole('button', { name: 'Discover', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Find your people' })).toBeVisible();
  await page.getByRole('textbox', { name: /search people and topics/i }).fill('Machine Learning');
  await expect(page.getByText('Meera Kapoor')).toBeVisible();
  await expect(page.getByText('Vikram Patel')).toHaveCount(0);
});

test('post composer supports creating a post', async ({ page }) => {
  await page.getByRole('button', { name: /create post/i }).first().click();
  await page.getByPlaceholder(/what’s on your mind/i).fill('Browser compatibility regression post');
  await page.getByRole('button', { name: /share post/i }).click();
  await expect(page.getByText('Browser compatibility regression post')).toBeVisible();
});

test('mobile and desktop layouts do not create horizontal page overflow', async ({ page }) => {
  await expect.poll(async () => page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth <= window.innerWidth + 1;
  })).toBe(true);
  await page.getByRole('button', { name: 'Open CircleUp AI' }).click();
  await expect(page.getByRole('region', { name: 'CircleUp AI assistant' })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    const panel = document.querySelector('.circleup-ai-panel');
    if (!panel) return false;
    const rect = panel.getBoundingClientRect();
    return rect.left >= -1 && rect.right <= window.innerWidth + 1;
  })).toBe(true);
});
