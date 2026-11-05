export const MAX_POST_LENGTH = 2000;

export function validatePost(body) {
  const normalized = body.trim();
  if (!normalized) return '게시할 내용을 입력해 주세요.';
  if (normalized.length > MAX_POST_LENGTH) return `글은 ${MAX_POST_LENGTH.toLocaleString('ko-KR')}자까지 작성할 수 있어요.`;
  return null;
}

export function validateAccount(email, password, name, signup) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return '올바른 이메일 주소를 입력해 주세요.';
  if (!password) return '비밀번호를 입력해 주세요.';
  if (signup && password.length < 8) return '비밀번호는 8자 이상 입력해 주세요.';
  if (signup && (!name.trim() || name.trim().length > 30)) return '닉네임은 1~30자로 입력해 주세요.';
  return null;
}

export const MAX_COMMENT_LENGTH = 1000;
export function validateComment(body) {
  if (!body.trim()) return '댓글 내용을 입력해 주세요.';
  if (body.trim().length > MAX_COMMENT_LENGTH) return '댓글은 1,000자까지 작성할 수 있어요.';
  return null;
}
export function validateRepost(body) {
  return body.trim().length > MAX_POST_LENGTH ? '리포스트 글은 2,000자까지 작성할 수 있어요.' : null;
}
