import { test, expect, type Page, type Locator } from '@playwright/test';
const password = 'test-password-2026';
async function signup(page: Page, handle: string) {
  const email = `${handle}-${Date.now()}@example.com`;
  await page.goto('./');
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '마이페이지', exact: true }).click();
  await page.getByRole('button', { name: '회원가입', exact: true }).click();
  await expect(page.getByLabel('닉네임', { exact: true })).toHaveCount(0);
  await page.getByLabel('이메일', { exact: true }).fill(email);
  await expect(page.getByLabel('이메일', { exact: true })).toHaveAttribute('autocomplete', 'username');
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await expect(page.getByLabel('비밀번호', { exact: true })).toHaveAttribute('autocomplete', 'new-password');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByLabel('가입 이메일', { exact: true })).toHaveAttribute('readonly', '');
  await page.getByLabel('핸들', { exact: true }).fill(handle);
  await page.getByLabel('닉네임', { exact: true }).fill(handle);
  await page.getByRole('button', { name: '가입 완료', exact: true }).click();
  await expect(page.getByRole('heading', { name: '프로필', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: '프로필 편집', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '피드', exact: true }).click();
  return email;
}
async function post(page: Page, body: string) {
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '게시물 추가', exact: true }).click();
  const composer = page.getByRole('dialog', { name: '새 글 쓰기', exact: true });
  await composer.getByLabel('게시할 글', { exact: true }).fill(body);
  await composer.getByRole('button', { name: '게시하기', exact: true }).click();
  await expect(composer.getByText('글을 게시했어요.', { exact: true })).toBeVisible();
  await composer.getByRole('button', { name: '닫기', exact: true }).click();
}
async function menu(card: Locator, item: string) {
  await card.getByRole('button', { name: '게시물 메뉴', exact: true }).click();
  await card.getByRole('button', { name: item, exact: true }).click();
}
test.beforeAll(async () => {
  const response = await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-postpost/databases/(default)/documents', { method: 'DELETE' });
  expect(response.ok).toBeTruthy();
});

test('desktop navigation, private reactions, activity, exploration, inline search and menus', async ({ browser }) => {
  const first = await browser.newContext(); const second = await browser.newContext();
  const author = await first.newPage(); const reader = await second.newPage();
  try {
    await signup(author, 'writer');
    await post(author, '첫 번째 이야기 #일상 #React');
    const original = author.getByRole('article', { name: 'writer의 글', exact: true });
    await expect(original.getByText('@writer', { exact: true })).toBeVisible();
    expect(await original.locator('.post-body').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(18.6667, 1);
    await author.screenshot({ path: 'test-results/feed-desktop.png', fullPage: true });
    await signup(reader, 'reader');
    const foreign = reader.getByRole('article', { name: 'writer의 글', exact: true });
    await foreign.getByRole('button', { name: '좋아요 0', exact: true }).click();
    await expect(foreign.getByRole('button', { name: '좋아요 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await menu(original, '반응한 사람');
    const people = author.getByRole('dialog', { name: '반응한 사람 · 작성자만 공개' });
    await expect(people.getByText('@reader', { exact: true })).toBeVisible();
    await people.getByRole('link').filter({ hasText: '@reader' }).click();
    await expect(author.getByRole('heading', { name: '프로필', exact: true, level: 1 })).toBeVisible();
    await author.getByRole('button', { name: '이전 화면으로', exact: true }).click();
    await expect(author.getByRole('heading', { name: '피드', exact: true, level: 1 })).toBeVisible();

    await foreign.getByRole('button', { name: '리포스트 0', exact: true }).click();
    const shared = reader.getByRole('article', { name: 'reader의 리포스트', exact: true });
    await expect(shared).toBeVisible();
    await expect(original.getByRole('button', { name: '리포스트 1', exact: true })).toBeVisible();
    await foreign.getByRole('button', { name: '리포스트 1', exact: true }).click();
    await expect(shared).toHaveCount(0);
    await foreign.getByRole('button', { name: '리포스트 0', exact: true }).click();
    await expect(shared).toBeVisible();
    await shared.getByRole('link', { name: '원 포스트 보기', exact: true }).click();
    const detail = reader.getByRole('dialog', { name: '포스트 보기', exact: true });
    await expect(detail.getByText('첫 번째 이야기 #일상 #React', { exact: true })).toBeVisible();
    await reader.keyboard.press('Escape');

    await foreign.getByRole('button', { name: '게시물 메뉴', exact: true }).click();
    const bounds = await foreign.getByRole('button', { name: '링크 복사', exact: true }).locator('svg').evaluate(el => { const box = (el as SVGSVGElement).getBBox(); return { x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height }; });
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(24); expect(bounds.bottom).toBeLessThanOrEqual(24);
    await reader.keyboard.press('Escape');

    await reader.getByRole('button', { name: '더보기', exact: true }).click();
    await reader.getByRole('button', { name: '내 활동', exact: true }).click();
    await expect(reader.getByRole('heading', { name: '내 활동', exact: true })).toBeVisible();
    await reader.getByRole('button', { name: '좋아요', exact: true }).click();
    await expect(reader.getByRole('article', { name: 'writer의 글', exact: true })).toHaveCount(1);
    await reader.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '탐색', exact: true }).click();
    await expect(reader.getByRole('heading', { name: '탐색', exact: true })).toBeVisible();
    await reader.locator('.discovery .tags button').filter({ hasText: '#일상' }).click();
    await expect(reader.getByRole('searchbox', { name: '검색어' })).toHaveValue('#일상');
    await expect(reader.getByRole('dialog')).toHaveCount(0);
    await reader.getByRole('searchbox', { name: '검색어' }).fill('@writer');
    await expect(foreign).toBeVisible();
    await reader.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '피드', exact: true }).click();

    await menu(original, '수정');
    await original.getByLabel('글 수정', { exact: true }).fill('수정한 이야기 #기록');
    await original.getByRole('button', { name: '저장', exact: true }).click();
    await expect(foreign.getByText('수정한 이야기 #기록', { exact: true })).toBeVisible();
    await reader.getByRole('button', { name: '더보기', exact: true }).click();
    await reader.getByRole('button', { name: '내 활동', exact: true }).click();
    await reader.getByRole('button', { name: '좋아요', exact: true }).click();
    await expect(reader.getByText('수정한 이야기 #기록', { exact: true })).toBeVisible();
    await original.getByRole('button', { name: '게시물 메뉴', exact: true }).click();
    author.once('dialog', dialog => dialog.accept());
    await original.getByRole('button', { name: '삭제', exact: true }).click();
    await expect(original).toHaveCount(0);
    await expect(reader.getByText('수정한 이야기 #기록', { exact: true })).toHaveCount(0);
    await reader.getByRole('navigation', { name: '주 메뉴' }).getByRole('button', { name: '피드', exact: true }).click();
    await shared.getByRole('link', { name: '원 포스트 보기', exact: true }).click();
    await expect(detail.getByText('삭제되었거나 찾을 수 없는 게시물입니다.')).toBeVisible();
  } finally { await first.close(); await second.close(); }
});

test('mobile two-step signup, email-only login, back navigation and persistent dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = await signup(page, 'phone');
  const nav = page.getByRole('navigation', { name: '주 메뉴' });
  await expect(nav.getByRole('button')).toHaveCount(5);
  expect(await nav.getByRole('button').evaluateAll(items => items.map(item => item.getAttribute('aria-label')))).toEqual(['피드', '탐색', '게시물 추가', '검색', '마이페이지']);
  await post(page, '모바일 글 #테스트');
  await nav.getByRole('button', { name: '마이페이지', exact: true }).click();
  await expect(page.getByRole('heading', { name: '프로필', exact: true, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: '이전 화면으로', exact: true }).click();
  await expect(page.getByRole('heading', { name: '피드', exact: true })).toBeVisible();
  await nav.getByRole('button', { name: '마이페이지', exact: true }).click();
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await nav.getByRole('button', { name: '탐색', exact: true }).click();
  await nav.getByRole('button', { name: '마이페이지', exact: true }).click();
  await expect(page.getByRole('button', { name: '닫기', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '이전 화면으로', exact: true }).click();
  await expect(page.getByRole('heading', { name: '탐색', exact: true })).toBeVisible();
  await nav.getByRole('button', { name: '마이페이지', exact: true }).click();
  await page.getByLabel('이메일', { exact: true }).fill('@phone');
  expect(await page.getByLabel('이메일', { exact: true }).evaluate(el => (el as HTMLInputElement).checkValidity())).toBeFalsy();
  await page.getByLabel('이메일', { exact: true }).fill(email);
  await page.getByLabel('비밀번호', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('이메일 또는 비밀번호');
  expect(await page.locator('body').innerText()).not.toContain(email);
  await page.getByRole('button', { name: '비밀번호를 잊었나요?', exact: true }).click();
  await page.getByRole('button', { name: '재설정 메일 받기', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('재설정 메일');
  await page.getByRole('button', { name: '이전 화면으로', exact: true }).click();
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('heading', { name: '프로필', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('main').getByText('@phone', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '설정', exact: true }).first().click();
  await page.getByRole('radio', { name: '다크 모드', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await nav.getByRole('button', { name: '검색', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: '검색어' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('searchbox', { name: '검색어' }).fill('@phone');
  await expect(page.getByRole('article').filter({ hasText: '모바일 글 #테스트' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/search-dark-mobile.png', fullPage: true });
  await nav.getByRole('button', { name: '피드', exact: true }).click();
  await page.screenshot({ path: 'test-results/feed-dark-mobile.png', fullPage: true });
});
