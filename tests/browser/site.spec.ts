import { test, expect, type Page } from '@playwright/test';

async function signup(page: Page, name: string) {
  await page.goto('./');
  await page.getByRole('button', { name: '로그인 / 가입' }).click();
  await page.getByRole('button', { name: '회원가입', exact: true }).click();
  await page.getByLabel('닉네임', { exact: true }).fill(name);
  await page.getByLabel('이메일', { exact: true }).fill(`${name}-${Date.now()}@example.com`);
  await page.getByLabel('비밀번호', { exact: true }).fill('test-password-2026');
  await page.getByRole('button', { name: '가입하기' }).click();
  await expect(page.getByRole('button', { name: '가입하기', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '새 글 쓰기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '글 쓰기', exact: true })).toBeVisible();
}

test.beforeAll(async () => {
  const response = await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-postpost/databases/(default)/documents', { method: 'DELETE' });
  expect(response.ok).toBeTruthy();
});

test('two users publish, react privately, repost, search, edit and erase an original', async ({ browser }) => {
  const first = await browser.newContext(); const second = await browser.newContext();
  const author = await first.newPage(); const reader = await second.newPage();
  try {
    await signup(author, 'writer');
    await author.getByLabel('게시할 글', { exact: true }).fill('첫 번째 이야기 #일상 #React');
    author.once('dialog', dialog => dialog.accept());
    await author.reload();
    await expect(author.getByLabel('게시할 글', { exact: true })).toHaveValue('첫 번째 이야기 #일상 #React');
    await expect(author.getByRole('status')).toContainText('초안을 복원');
    await author.getByRole('button', { name: '게시하기', exact: true }).click();
    await expect(author.getByText('글을 게시했어요.', { exact: true })).toBeVisible();
    const original = author.getByRole('article', { name: 'writer의 글', exact: true });
    await expect(original).toBeVisible();
    await author.screenshot({ path: 'test-results/feed-desktop.png', fullPage: true });

    await signup(reader, 'reader');
    const foreign = reader.getByRole('article', { name: 'writer의 글', exact: true });
    await expect(foreign.getByRole('button', { name: '반응한 사람' })).toHaveCount(0);
    await foreign.getByRole('button', { name: '좋아요 0', exact: true }).click();
    await expect(foreign.getByRole('button', { name: '좋아요 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await foreign.getByRole('button', { name: '싫어요 0', exact: true }).click();
    await expect(foreign.getByRole('button', { name: '좋아요 0', exact: true })).toBeVisible();
    await foreign.getByRole('button', { name: '싫어요 1', exact: true }).click();
    await expect(foreign.getByRole('button', { name: '싫어요 0', exact: true })).toBeVisible();
    await foreign.getByRole('button', { name: '좋아요 0', exact: true }).click();
    await expect(original.getByRole('button', { name: '좋아요 1', exact: true })).toBeVisible();
    await original.getByRole('button', { name: '반응한 사람' }).click();
    const people = author.getByRole('dialog', { name: '반응한 사람 · 작성자만 공개' });
    await expect(people.getByText('reader', { exact: true })).toBeVisible();
    await author.keyboard.press('Escape');
    await expect(people).not.toBeVisible();

    await foreign.getByRole('button', { name: '리포스트', exact: true }).click();
    const shared = reader.getByRole('article', { name: 'reader의 리포스트', exact: true });
    await expect(shared).toBeVisible();
    await foreign.getByRole('button', { name: '리포스트', exact: true }).click();
    await expect(shared).toHaveCount(1);
    await shared.getByRole('link', { name: '원 포스트 보기' }).click();
    const detail = reader.getByRole('dialog', { name: '포스트 보기', exact: true });
    await expect(detail.getByText('첫 번째 이야기 #일상 #React', { exact: true })).toBeVisible();
    await reader.keyboard.press('Escape');
    await foreign.getByRole('button', { name: '#일상', exact: true }).click();
    await expect(reader.getByRole('searchbox')).toHaveValue('#일상');
    await expect(shared).toHaveCount(0);
    await reader.getByRole('searchbox').fill('없는검색어');
    await expect(reader.getByText('조건에 맞는 글이 없어요.')).toBeVisible();
    await reader.getByRole('button', { name: '지우기', exact: true }).click();

    await original.getByRole('button', { name: '수정', exact: true }).click();
    await original.getByLabel('글 수정', { exact: true }).fill('수정한 이야기 #기록');
    await original.getByRole('button', { name: '저장', exact: true }).click();
    await expect(foreign.getByText('수정한 이야기 #기록', { exact: true })).toBeVisible();
    author.once('dialog', dialog => dialog.accept());
    await original.getByRole('button', { name: '삭제', exact: true }).click();
    await expect(original).toHaveCount(0);
    await shared.getByRole('link', { name: '원 포스트 보기' }).click();
    await expect(detail.getByText('삭제되었거나 찾을 수 없는 게시물입니다.')).toBeVisible();
  } finally { await first.close(); await second.close(); }
});

test('About separation, 15pt minimum, mobile layout and reset-password entry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByText('A PLACE FOR YOUR THOUGHTS')).toHaveCount(0);
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About Postpost' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('A PLACE FOR YOUR THOUGHTS')).toBeVisible();
  await page.screenshot({ path: 'test-results/about-mobile.png', fullPage: true });
  await expect(page.getByRole('heading', { name: '피드', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(await page.evaluate(() => [...document.querySelectorAll('p,a,button,h1,h2,span')].filter(el => (el as HTMLElement).offsetParent !== null).every(el => parseFloat(getComputedStyle(el).fontSize) >= 20))).toBeTruthy();
  await page.getByRole('link', { name: '피드', exact: true }).click();
  await page.getByRole('button', { name: '로그인 / 가입' }).click();
  await page.getByRole('button', { name: '비밀번호를 잊었나요?' }).click();
  await expect(page.getByRole('heading', { name: '비밀번호 재설정', exact: true })).toBeVisible();
  await page.getByLabel('이메일', { exact: true }).fill('unknown@example.com');
  await page.getByRole('button', { name: '재설정 메일 받기' }).click();
  await expect(page.getByRole('status')).toContainText('재설정 메일');
});
