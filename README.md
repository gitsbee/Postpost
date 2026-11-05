# Postpost

Firebase 기반의 가벼운 텍스트 게시판입니다. React + TypeScript + Vite를 사용합니다.

- 이메일/비밀번호 회원가입·로그인·로그아웃, 비밀번호 재설정
- 피드와 별도 About 페이지, 기본 16pt·최소 15pt 글씨
- 텍스트 작성·수정·삭제, 이 탭에서 UID별 초안 복원
- 좋아요·싫어요 선택·전환·취소, 작성자만 반응자 목록 확인
- 원문 참조 리포스트, 창에서 원문 보기, 글 링크 복사
- 해시태그, 현재 불러온 글의 본문·작성자·태그 검색, 내 글 필터
- 최신 50개부터 이전 글 더 불러오기, 실시간 갱신

이번 구현과 후속 후보는 [개선 계획](docs/IMPROVEMENT_PLAN.md)을 참고하세요. 댓글·이미지·신고·계정 탈퇴는 후속 범위입니다.

## 로컬 실행

Node.js 22.12 이상이 필요합니다. 현재 클라우드에서는 Node.js 24로 검증했습니다.

```sh
npm ci
cp .env.example .env.local
# .env.local의 네 항목을 채운 뒤 실행
npm run dev
```

이미 `.env.local`이 있으면 복사하지 말고 기존 파일을 편집하세요. 환경 변수를 수정하면 개발 서버를 다시 시작하세요. 키가 없으면 안내 화면을 보여주며 Firebase 요청을 보내지 않습니다.

```sh
npm test       # 입력 검증 테스트
npm run build # TypeScript 검사 + 프로덕션 번들
npm run preview
```

Firestore 보안 규칙 테스트는 Java 21 이상과 에뮬레이터 다운로드 권한이 필요합니다. 실제 Firebase 키나 프로젝트는 필요하지 않습니다.

```sh
npm run test:rules
```

현재 클라우드에서는 에뮬레이터 다운로드가 허용되어 규칙 테스트를 실행할 수 있습니다. 브라우저 통합 검증은 운영 프로젝트 대신 데모 Auth·Firestore를 사용합니다.

```sh
npx playwright install chromium
npm run test:e2e
# 시스템 Chromium을 사용할 때:
# PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

브라우저 테스트 설정은 로컬 Vite 서버에 데모 설정을 주입합니다. `VITE_FIREBASE_USE_EMULATORS=true`는 개발 모드·로컬 호스트·`demo-postpost` 프로젝트에서만 동작하며 운영 빌드에는 적용되지 않습니다.

## Firebase 프로젝트 연결

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트를 만들고 **프로젝트 설정 → 일반 → 내 앱 → 웹 앱**을 등록합니다. Analytics는 필요하지 않습니다.
2. 웹 앱의 `firebaseConfig`에서 아래 값을 `.env.local`에 입력합니다.

   | 환경 변수 | firebaseConfig 필드 |
   | --- | --- |
   | `VITE_FIREBASE_API_KEY` | `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
   | `VITE_FIREBASE_APP_ID` | `appId` |

3. **Authentication → Sign-in method**에서 **이메일/비밀번호**를 활성화합니다. 이메일 링크 로그인은 사용하지 않습니다. 가입 폼은 최소 8자를 요구합니다. 콘솔에서 더 강한 비밀번호 정책을 적용하면 해당 조건도 충족해야 합니다.
4. **Authentication → Settings → Authorized domains**에 실제 서비스 도메인을 등록합니다. 로컬 개발에는 `localhost`도 등록하세요. 최근 생성된 프로젝트에서는 자동 등록되지 않을 수 있습니다.
5. **Firestore Database**를 생성합니다. 보안 규칙을 아래 `firestore.rules` 내용으로 배포하기 전까지 서비스를 공개하지 마세요. `posts` 컬렉션은 첫 게시 시 생성됩니다. 별도 복합 인덱스는 필요하지 않습니다.

이 네 값은 브라우저에서 사용하는 **공개 웹 앱 설정**이며 빌드 결과에 포함됩니다. 서비스 계정 JSON, Admin SDK 개인 키, 비밀번호를 `VITE_` 변수에 넣지 마세요. `.env.local`은 Git에서 제외됩니다. 웹 API 키는 해당 프로젝트의 웹 앱 설정 값을 사용하세요. Firestore 접근 권한은 보안 규칙으로 제어합니다.

## 보안 규칙과 데이터

`posts/{id}`에 `body`, `authorId`, `authorName`, `createdAt` 및 `kind`, `originalId`, `tags`, `deleted`, 선택적 `updatedAt`을 저장합니다. 기존 글에 새 필드가 없어도 읽을 수 있으며 별도 일괄 마이그레이션은 필요하지 않습니다. 본문은 HTML로 해석하지 않고 일반 텍스트로 표시하며 이메일은 게시 데이터에 저장하지 않습니다.

- 읽기: 전체 공개. 작성·수정·삭제는 로그인과 작성자 UID로 검증합니다.
- 일반 글: 공백만 있는 본문 금지, 최대 2,000자, 닉네임 1~30자. 원 게시 시각·작성자 변경 금지.
- 삭제: 본문과 태그를 비우고 삭제 상태로 전환합니다. 참조와 권한 일관성을 위해 문서 ID·작성자·시각·반응 데이터는 남습니다. 모든 개인정보의 완전 삭제나 계정 탈퇴 기능은 아닙니다.
- 리포스트: `repost_{uid}_{originalId}` ID로 중복을 막으며 원문을 복사하지 않습니다. 원문이 삭제되면 원문 창에 내용이 표시되지 않습니다. 리포스트를 삭제한 후 다시 리포스트할 수 있습니다.
- 반응: `posts/{id}/reactions/{uid}`에 종류와 반응 당시 표시명을 보관합니다. 본인은 자기 반응을 단건 조회할 수 있고, 전체 목록은 글 작성자만 조회합니다. 제3자의 단건·목록 조회는 규칙에서 거절합니다. 작성자는 계정 ID로 동명이인을 구별할 수 있습니다.
- 합계: `posts/{id}/stats/reactions`는 공개입니다. 반응 변경과 카운터를 같은 트랜잭션으로 갱신하고 규칙에서 차이를 검증하여 임의 집계 변경을 거절합니다.

해시태그는 공백으로 구분된 `#태그`를 최대 10개 인식합니다. 한글·영문·숫자·밑줄을 지원하며 태그당 최대 30자입니다. 검색은 현재 불러온 글 안에서 수행되며 전체 DB 전문 검색은 아닙니다. `#태그`는 정확히 일치해야 하고 여러 검색어는 모두 일치해야 합니다. 리포스트의 검색 대상은 리포스트 작성자이며 원문 내용은 원 게시물에서 검색합니다. ‘더 불러오기’는 구독 범위를 50개씩 넓히므로 데이터가 늘면 읽기 사용량도 늘어납니다.

## GitHub Pages 배포

배포 주소는 `https://gitsbee.github.io/Postpost/`입니다. Vite의 `base`와 홈 링크는 `/Postpost/` 경로를 사용합니다. 로컬 개발·미리보기도 서버 주소 뒤에 `/Postpost/`를 붙여 접속하세요. About은 `/Postpost/About/`이며 빌드 때 정적 진입 HTML을 생성하므로 Pages에서 직접 열기·새로고침이 가능합니다. 글 상세 링크는 `#/posts/{id}`를 사용합니다.

1. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
2. **Settings → Secrets and variables → Actions**에서 위 네 가지 `VITE_FIREBASE_*` 값을 같은 이름으로 등록합니다. Repository secrets와 variables를 모두 지원하고, 같은 이름이면 secret을 우선합니다. 클라우드 환경 설정 값은 Actions로 자동 전달되지 않습니다.
3. Firebase Authentication의 **Authorized domains**에 `gitsbee.github.io`를 등록합니다. Firebase의 `authDomain` 값은 웹 앱 설정의 원래 값을 유지합니다.
4. `github-pages` 환경에 배포 브랜치 제한이 있다면 `beta`를 허용합니다.
5. 변경 사항을 `beta`에 push하면 `.github/workflows/deploy-pages.yml`이 설치 → 테스트 → 빌드 → Pages 배포를 수행합니다. Actions에서 수동 실행할 때도 `beta`를 선택해야 합니다. 다른 브랜치에서는 배포 작업을 건너뜁니다. 워크플로가 기본 브랜치에도 있어야 GitHub UI의 수동 실행 버튼이 표시될 수 있습니다.

워크플로는 데모 에뮬레이터의 규칙·브라우저 검증 후 Node.js 24에서 `npm ci`, `npm test`, 환경 변수 존재 검사, `npm run build`를 실행하고 `dist`만 Pages 아티팩트로 업로드합니다. 필수 변수가 비어 있으면 값은 출력하지 않고 빌드를 중단합니다. Pages 배포 권한은 배포 작업에만 부여합니다. Vite는 **빌드 시** 환경 변수를 번들에 반영하므로 값을 변경한 뒤에는 다시 빌드·배포해야 합니다.

## Firestore 보안 규칙 게시

**이번 버전 적용 시 아래 새 규칙을 Firebase 콘솔에 반드시 게시하세요.** 이전 규칙에는 반응·리포스트·수정·삭제 권한이 없습니다. 기존 생성·읽기를 지원하므로 새 규칙을 먼저 게시해도 기존 텍스트 앱과 호환됩니다. GitHub Pages 워크플로는 규칙을 검증하지만 Firestore 규칙을 운영 DB에 배포하지 않습니다. Firebase 콘솔의 Rules 편집기에서 `firestore.rules`를 직접 게시하거나 본인 환경에서 다음 명령을 사용하세요. `YOUR_PROJECT_ID`는 실제 프로젝트 ID로 바꿉니다.

```sh
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project YOUR_PROJECT_ID
```

Firebase 서비스 계정이나 배포 토큰은 GitHub Pages 배포에 필요하지 않습니다. 저장소의 `firebase.json`에 남아 있는 Firebase Hosting 설정은 GitHub Pages에는 적용되지 않습니다.

## 연결 후 기능 확인

Actions의 빌드·배포 성공 후 Pages 주소에서 화면과 CSS가 표시되는지, 로고 클릭과 새로고침 후에도 `/Postpost/`에 머무는지 확인하세요. 실제 Firebase 프로젝트 연결 및 규칙 배포 후 다음을 확인하세요. 키가 없는 상태의 빌드와 입력 검증 테스트만으로 Firebase 연동 성공을 판단할 수 없습니다.

1. 새 이메일로 가입하고 닉네임이 표시되는지 확인합니다.
2. 글을 게시하고 새로고침 후에도 로그인 상태와 글이 유지되는지 확인합니다.
3. 로그아웃한 상태에서 글 목록은 보이고 글 작성은 로그인으로 안내되는지 확인합니다.
4. 다른 브라우저에서 로그인해 글을 추가하고 첫 브라우저 목록에 실시간 반영되는지 확인합니다.
5. 다른 계정으로 좋아요 → 싫어요 → 취소를 수행하고, 작성자에게만 반응자 목록이 보이는지 확인합니다.
6. 리포스트에서 원문 창을 열고, 원문 삭제 후 내용이 숨겨지는지 확인합니다.
7. 본인 수정·삭제는 성공하고 다른 계정의 수정·삭제는 거절되는지 확인합니다.
8. `#태그`와 본문 검색, 내 글, About 직접 접근·새로고침, 모바일 200% 확대를 확인합니다.
9. `npm run test:rules`로 작성자 위조·반응자 정보 노출·카운터 변조 거절도 확인합니다.

## 클라우드 작업

체크아웃 경로는 `/workspace/Postpost`입니다. 각 클라우드 작업은 격리되므로 기존 체크아웃을 사용하고, 명시적 요청 없이 별도 Git worktree를 만들지 마세요. 의존성은 `npm ci`, 개발 서버는 해당 경로에서 `npm run dev`로 실행합니다. Firebase 환경 변수는 환경 설정에 입력할 수도 있습니다. 프로세스는 새 작업에서 다시 실행해야 합니다.
