export function normalizeHandle(value) {
  return value.trim().normalize('NFKC').replace(/^@/, '').toLowerCase();
}
export function validSocialUrl(value) {
  try {
    const url = new URL(value);
    return value.length <= 500 && url.protocol === 'https:' && !url.username && !url.password
      && url.hostname.includes('.') && !/\s/.test(value);
  } catch { return false; }
}
export function validateProfile(name, handle, bio, links) {
  if (!name.trim() || name.trim().length > 30) return '이름은 1~30자로 입력해 주세요.';
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(normalizeHandle(handle))) return '핸들은 영문자로 시작하는 소문자·숫자·밑줄 3~20자로 입력해 주세요.';
  if (bio.length > 1000) return '소개는 1,000자 이내로 작성해 주세요.';
  if (links.length > 5 || links.some(link => !validSocialUrl(link))) return 'SNS 링크는 https:// 주소로 최대 5개까지 추가할 수 있어요.';
  if (new Set(links).size !== links.length) return '같은 SNS 링크가 중복되어 있어요.';
  return null;
}
