# 핸들 로그인 서버

`resolveHandleLogin`은 공개 핸들에서 내부 UID를 확인하고 Admin SDK로 이메일을 조회한 뒤, Firebase Auth의 이메일·비밀번호 인증이 성공한 경우에만 해당 이메일을 반환합니다. 브라우저는 그 이메일·비밀번호로 표준 Firebase 로그인을 완료합니다. 이메일 매핑을 Firestore 공개 문서에 저장하지 않으며 잘못된 비밀번호, 없는 계정, 정지 계정, MFA 미완료에는 이메일을 반환하지 않습니다. 비밀번호·토큰은 저장하거나 코드에서 로그로 출력하지 않습니다.

## 운영 배포

Firebase Functions 운영 배포에는 **Blaze 요금제와 배포 권한**이 필요합니다. GitHub Pages 배포만으로 이 서버는 배포되지 않습니다. 서비스 계정 JSON을 프런트엔드나 GitHub Pages 시크릿에 넣을 필요는 없습니다. 런타임의 Admin SDK는 Firebase가 제공하는 서비스 계정으로 동작합니다.

1. 같은 Firebase 프로젝트에서 Functions를 사용할 수 있도록 요금제와 배포 권한을 준비합니다. 함수의 런타임 서비스 계정에는 Auth 사용자 조회와 Firestore 읽기·쓰기 권한이 필요합니다. 기본 계정에 권한이 없다면 해당 프로젝트의 `Firebase Authentication Viewer`와 `Cloud Datastore User` 등 필요한 역할을 부여하세요.
2. `npm --prefix functions ci`를 실행합니다.
3. `.env.example`을 `functions/.env.YOUR_PROJECT_ID`로 복사하고 `AUTH_WEB_API_KEY`를 채웁니다. 이 값은 **같은 프로젝트의 Firebase Auth를 호출할 수 있는 API 키**입니다. 기존 웹 앱 `apiKey`를 쓸 수 있지만, HTTP 리퍼러 제한이 있는 웹 키는 서버에서 사용할 수 없으므로 해당 경우 서버용 키를 별도로 생성하고 Identity Toolkit API로 사용 API를 제한합니다. 값을 채팅이나 Git 커밋에 넣지 마세요.
4. 본인 환경에서 Firebase CLI로 로그인하고 배포합니다.

```sh
npx firebase-tools@15.35.0 login
npx firebase-tools@15.35.0 deploy --only functions:resolveHandleLogin,firestore:rules --project YOUR_PROJECT_ID
```

함수 지역은 `asia-northeast3`이며 프런트엔드도 같은 지역으로 연결합니다. `AUTH_WEB_API_KEY`는 Functions용 설정이고 GitHub Actions에 이미 등록한 `VITE_FIREBASE_API_KEY`와 별개로 배포할 때 전달해야 합니다. `FIREBASE_` 접두사는 Functions 예약 이름이므로 설정 이름에 사용할 수 없습니다.

서버를 아직 배포하지 않은 경우 이메일 로그인은 계속 사용할 수 있지만 핸들 로그인은 서버 연결 안내를 표시합니다. 운영 배포 및 실제 계정 로그인은 별도로 확인해야 합니다.

## 요청 제한·검증

- 요청 IP의 해시마다 15분에 최대 30회의 검증을 허용합니다. Firebase Auth 자체의 제한도 유지합니다.
- `loginAttempts` 문서는 서버만 읽고 쓰며 클라이언트 규칙은 모든 접근을 거절합니다. IP 원문, 비밀번호, 이메일, 토큰을 저장하지 않습니다. `expiresAt`에 Firestore TTL을 설정하면 만료 기록을 자동 정리할 수 있습니다. TTL을 설정하지 않아도 시간 창이 지나면 다음 요청에서 카운터가 초기화됩니다.
- 앱의 모든 공격·비용을 막는 제한은 아니므로 사용량과 오류를 관찰합니다. 최대 인스턴스 수는 5입니다. 공개 확대 시 App Check 적용도 별도 검토할 수 있습니다.
- 유효한 비밀번호라도 MFA가 필요한 계정은 이 경로에서 허용하지 않습니다. 현재 앱에는 MFA UI가 없습니다.
- 성공 시 표준 이메일 로그인을 한 번 더 수행하므로, Auth 비밀번호 검증 요청이 두 번 발생합니다. 로그인 세션은 표준 Firebase SDK가 관리하며 별도 커스텀 토큰 서명 권한은 필요하지 않습니다.

```sh
npm run test:functions
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

통합 테스트는 데모 Auth·Firestore·Functions 에뮬레이터로 서버까지 실행해 잘못된 비밀번호 거부와 실제 핸들 로그인을 검증합니다. 현재 클라우드의 Node 24에서 에뮬레이터를 검증하며 운영 런타임 설정은 Node 22입니다. 운영 IAM, 리전 연결, 실제 메일 전송·비밀번호 저장 관리자 자체의 브라우저별 동작까지 검증한 결과는 아닙니다.
