import { test, expect, type Page } from '@playwright/test';

async function signup(page: Page, name: string) {
  await page.goto('./');
  if ((page.viewportSize()?.width || 1280) < 960) await page.getByRole('button', { name: '프로필과 로그인' }).click();
  await page.getByRole('button', { name: '회원가입', exact: true }).click();
  await page.getByLabel('닉네임', { exact: true }).fill(name);
  await page.getByLabel('이메일', { exact: true }).fill(`${name}-${Date.now()}@example.com`);
  await page.getByLabel('비밀번호', { exact: true }).fill('test-password-2026');
  await page.getByRole('button', { name: '가입하기' }).click();
  await expect(page.getByRole('heading', { name: '프로필 만들기', exact: true })).toBeVisible();
  await page.getByLabel('이름', { exact: true }).fill(name);
  await page.getByLabel('핸들', { exact: true }).fill(name);
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '프로필을 저장했어요.' })).toBeVisible();
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '피드', exact: true }).click();
}
async function menu(page: Page, card: ReturnType<Page['getByRole']>, item: string) {
  await card.getByRole('button', { name: '게시물 메뉴', exact: true }).click();
  await card.getByRole('button', { name: item, exact: true }).click();
}

test.beforeAll(async () => {
  const response = await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-postpost/databases/(default)/documents', { method: 'DELETE' });
  expect(response.ok).toBeTruthy();
});

test('desktop sidebar, icon reactions, counts, private handles, search and post management', async ({ browser }) => {
  const first = await browser.newContext(); const second = await browser.newContext();
  const author = await first.newPage(); const reader = await second.newPage();
  try {
    await signup(author, 'writer');
    const sidebar = author.getByRole('complementary', { name: '계정과 글쓰기' });
    await expect(sidebar.getByRole('heading', { name: '글 쓰기', exact: true })).toBeVisible();
    await sidebar.getByLabel('게시할 글', { exact: true }).fill('첫 번째 이야기 #일상 #React');
    author.once('dialog', dialog => dialog.accept());
    await author.reload();
    await expect(sidebar.getByLabel('게시할 글', { exact: true })).toHaveValue('첫 번째 이야기 #일상 #React');
    await sidebar.getByRole('button', { name: '게시하기', exact: true }).click();
    await expect(sidebar.getByText('글을 게시했어요.', { exact: true })).toBeVisible();
    const original = author.getByRole('article', { name: 'writer의 글', exact: true });
    await expect(original.getByText('@writer', { exact: true })).toBeVisible();
    await expect(original.locator('.avatar')).toHaveCount(0);
    expect(await original.locator('.post-body').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(18.6667, 1);
    await author.screenshot({ path: 'test-results/feed-desktop.png', fullPage: true });

    await signup(reader, 'reader');
    const foreign = reader.getByRole('article', { name: 'writer의 글', exact: true });
    await foreign.getByRole('button', { name: '게시물 메뉴' }).click();
    await expect(foreign.getByRole('button', { name: '반응한 사람' })).toHaveCount(0);
    await reader.keyboard.press('Escape');
    await foreign.getByRole('button', { name: '좋아요 0', exact: true }).click();
    await expect(foreign.getByRole('button', { name: '좋아요 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await foreign.getByRole('button', { name: '싫어요 0', exact: true }).click();
    await expect(foreign.getByRole('button', { name: '좋아요 0', exact: true })).toBeVisible();
    await foreign.getByRole('button', { name: '싫어요 1', exact: true }).click();
    await expect(foreign.getByRole('button', { name: '싫어요 0', exact: true })).toBeVisible();
    await foreign.getByRole('button', { name: '좋아요 0', exact: true }).click();
    await expect(original.getByRole('button', { name: '좋아요 1', exact: true })).toBeVisible();
    await menu(author, original, '반응한 사람');
    const people = author.getByRole('dialog', { name: '반응한 사람 · 작성자만 공개' });
    await expect(people.getByText('@reader', { exact: true })).toBeVisible();
    await expect(people.getByText('계정 ID', { exact: false })).toHaveCount(0);
    await people.getByRole('link').filter({ hasText: '@reader' }).click();
    await expect(author.getByRole('main').getByRole('heading', { name: 'reader', exact: true })).toBeVisible();
    await author.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '피드', exact: true }).click();

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

    await reader.getByRole('button', { name: '포스트 검색', exact: true }).click();
    const search = reader.getByRole('dialog', { name: '포스트 검색', exact: true });
    await expect(search.getByRole('button', { name: '모든 글', exact: true })).toBeVisible();
    await search.getByRole('searchbox', { name: '검색어' }).fill('#일상');
    await search.getByRole('button', { name: '검색하기', exact: true }).click();
    await expect(foreign).toBeVisible();
    await expect(shared).toHaveCount(0);
    await reader.getByRole('button', { name: '검색 해제', exact: true }).click();
    await reader.getByRole('main').getByRole('button', { name: '내 글', exact: true }).click();
    await expect(foreign).toHaveCount(0); await expect(shared).toBeVisible();
    await reader.getByRole('main').getByRole('button', { name: '모든 글', exact: true }).click();

    await menu(author, original, '수정');
    await original.getByLabel('글 수정', { exact: true }).fill('수정한 이야기 #기록');
    await original.getByRole('button', { name: '저장', exact: true }).click();
    await expect(foreign.getByText('수정한 이야기 #기록', { exact: true })).toBeVisible();
    await original.getByRole('button', { name: '게시물 메뉴', exact: true }).click();
    author.once('dialog', dialog => dialog.accept());
    await original.getByRole('button', { name: '삭제', exact: true }).click();
    await expect(original).toHaveCount(0);
    await shared.getByRole('link', { name: '원 포스트 보기', exact: true }).click();
    await expect(detail.getByText('삭제되었거나 찾을 수 없는 게시물입니다.')).toBeVisible();
  } finally { await first.close(); await second.close(); }
});

test('mobile profile login, Korean navigation, profile editor, handle quota and social links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByRole('complementary')).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '프로필과 로그인' })).toBeVisible();
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '소개', exact: true }).click();
  await expect(page.getByRole('heading', { name: '작은 생각이 이야기가 되는 곳.' })).toBeVisible();
  await expect(page.getByText('About', { exact: false })).toHaveCount(0);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/about-mobile.png', fullPage: true });
  await signup(page, 'phone');
  await page.getByRole('button', { name: '내 프로필', exact: true }).click();
  await expect(page.getByRole('heading', { name: '마이페이지', exact: true })).toBeVisible();
  await page.getByLabel('이름', { exact: true }).fill('새 이름');
  await page.getByLabel('소개', { exact: true }).fill('소개 내용 '.repeat(100));
  await page.getByRole('button', { name: '링크 추가', exact: true }).click();
  await page.getByRole('textbox', { name: 'SNS 링크 1', exact: true }).fill('https://social.example.com/my-page');
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  await expect(page.getByRole('heading', { name: '새 이름', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'social.example.com/my-page' })).toBeVisible();
  await page.getByLabel('핸들', { exact: true }).fill('writer');
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('이미 사용 중인 핸들');
  await page.getByLabel('핸들', { exact: true }).fill('phone_two');
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  await expect(page.getByRole('main').getByText('@phone_two', { exact: true })).toBeVisible();
  await page.getByLabel('핸들', { exact: true }).fill('phone_three');
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  await expect(page.getByLabel('핸들', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'SNS 링크 1 삭제', exact: true }).click();
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  await expect(page.getByRole('link', { name: 'social.example.com/my-page' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/profile-mobile.png', fullPage: true });
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '피드', exact: true }).click();
  await page.getByRole('button', { name: '글 쓰기', exact: true }).click();
  const composer = page.getByRole('dialog', { name: '새 글 쓰기', exact: true });
  await composer.getByLabel('게시할 글', { exact: true }).fill('모바일 글 #테스트');
  await composer.getByRole('button', { name: '게시하기', exact: true }).click();
  await expect(composer.getByText('글을 게시했어요.', { exact: true })).toBeVisible();
  await composer.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: '모바일 글 #테스트' }).getByText('@phone_three', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/feed-mobile.png', fullPage: true });
});
