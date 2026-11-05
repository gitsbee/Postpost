import type { DocumentSnapshot, Timestamp } from 'firebase/firestore';

export type Post = {
  id: string; body: string; authorId: string; authorName: string;
  createdAt: Timestamp | null; updatedAt: Timestamp | null;
  kind: 'post' | 'repost'; originalId: string | null; tags: string[]; deleted: boolean;
};
export type ReactionKind = 'like' | 'dislike';
export type Reaction = { uid: string; name: string; kind: ReactionKind };
export function readPost(snapshot: DocumentSnapshot): Post | null {
  const data = snapshot.data();
  if (!data || typeof data.authorId !== 'string' || typeof data.body !== 'string') return null;
  const timestamp = (value: unknown): Timestamp | null => value && typeof (value as Timestamp).toDate === 'function' ? value as Timestamp : null;
  return {
    id: snapshot.id, body: data.body, authorId: data.authorId,
    authorName: typeof data.authorName === 'string' ? data.authorName : '작성자',
    createdAt: timestamp(data.createdAt), updatedAt: timestamp(data.updatedAt),
    kind: data.kind === 'repost' ? 'repost' : 'post',
    originalId: typeof data.originalId === 'string' ? data.originalId : null,
    tags: Array.isArray(data.tags) ? data.tags.filter((tag: unknown) => typeof tag === 'string') : [],
    deleted: data.deleted === true,
  };
}
export function errorMessage(error: unknown) {
  switch ((error as { code?: string })?.code) {
    case 'auth/invalid-credential': case 'auth/user-not-found': case 'auth/wrong-password': return '이메일 또는 비밀번호를 확인해 주세요.';
    case 'auth/email-already-in-use': return '이미 가입된 이메일입니다. 로그인해 주세요.';
    case 'auth/invalid-email': return '이메일 주소를 확인해 주세요.';
    case 'auth/weak-password': case 'auth/password-does-not-meet-requirements': return '프로젝트 비밀번호 정책에 맞는 비밀번호를 입력해 주세요.';
    case 'auth/too-many-requests': return '요청이 많아 잠시 제한됐어요. 잠시 후 다시 시도해 주세요.';
    case 'auth/operation-not-allowed': return '이메일/비밀번호 로그인을 사용할 수 없습니다.';
    case 'permission-denied': return '이 작업의 권한이 없습니다. 로그인 상태와 최신 Firestore 규칙 적용 여부를 확인해 주세요.';
    case 'auth/network-request-failed': case 'unavailable': return '연결을 확인한 뒤 다시 시도해 주세요.';
    default: return '처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}
export function dateLabel(value: Post['createdAt']) {
  return value ? value.toDate().toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '전송 중';
}
