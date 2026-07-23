# 내가 방문한 음식점

## 실행

터미널 두 개가 필요합니다.

```bash
npm start
```

```bash
npm run dev
```

`npm start`는 `db.json`을 API 서버(3000번)로 띄우고, `npm run dev`는 화면(5173번)을 띄웁니다.

## 평점은 어떻게 정해지나

가게의 평점과 리뷰수는 **저장된 값이 아니라 리뷰에서 계산**됩니다
(`src/stats.ts`). 리뷰를 등록·삭제하면 평점, 리뷰수, 정렬 순서가 곧바로
따라 바뀝니다. 리뷰가 하나도 없으면 평점은 `–`로 표시됩니다.

## 네이버 API 설정 (선택)

없어도 앱은 정상 동작합니다. 설정하면 가게 정보와 위치를 자동으로 채울 수 있습니다.

`.env.example`을 복사해 `.env`를 만들고 값을 채운 뒤 개발 서버를 다시 시작하세요.

| 키 | 발급처 | 쓰이는 곳 |
|---|---|---|
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | [developers.naver.com](https://developers.naver.com) → 애플리케이션 등록 → **검색** API 추가 | 정보 채우기 스크립트, 등록 화면의 가게 검색 |

검색 API의 Secret은 노출되면 안 되므로 개발 서버가 대신 호출합니다
(`vite.config.ts`의 `/naver-api` 프록시).

## 메뉴와 가게 설명

**메뉴는 네이버 API로 가져올 수 없습니다.** 네이버 플레이스 안에만 있는 정보라
공개 API에 없습니다. 그래서 메뉴는 **직접 적는 방식**입니다 — 등록·수정 화면의
메뉴 편집기에서 이름과 가격을 한 줄씩 추가하면 상세 화면에 표시됩니다.

설명을 적을 때 참고하도록, 정보 채우기 스크립트가 가게마다 블로그 글 3건을
`scripts/fill-info-report.json`에 모아 둡니다. 다만 **검색어만 스쳐 간 다른 가게 글이
섞이므로** 자동으로 채우지 않고 읽을거리로만 둡니다.

API로 자동으로 채워지는 항목은 주소·좌표·카테고리·홈페이지 주소입니다.
전화번호는 네이버가 빈 값으로 내려주어 채울 수 없습니다.

### 가게 정보 한 번에 채우기

```bash
npm run fill-info
```

`db.json`의 모든 가게를 네이버 지역검색으로 찾아 **주소·좌표**를 채우고(카테고리는
`미분류`인 곳만), 이미지 검색으로 **사진 후보**를 뽑아 `scripts/fill-info-report.json`에
저장합니다.

- 기본은 **비어 있는 항목만** 채웁니다. 이미 넣은 값을 덮어쓰려면 `-- --force`
- **사진은 기본으로 건드리지 않습니다.** 검색 결과라 검수가 필요하고, 일부러
  비워 둔 사진이 다시 채워지면 곤란하기 때문입니다. 채우려면 `-- --images`
  (후보 목록은 플래그와 상관없이 항상 리포트에 남습니다)
- 실제로 바꾸기 전에 확인만 하려면 `-- --dry`
- 실행 전 `npm start`는 꺼두세요 (같은 파일을 동시에 쓰지 않도록)

엉뚱한 가게가 들어가지 않도록 세 가지를 검사합니다. 하나라도 걸리면 채우지 않고
"직접 입력 필요"로 표시합니다.

1. 상호가 충분히 비슷한가
2. 서현역에서 3km 안인가 (`BASE` / `MAX_KM` 상수로 조절)
3. 음식점 업종인가 (관공서·병원 등 제외)

**전화번호는 채울 수 없습니다.** 네이버 지역검색이 `telephone`을 빈 값으로 내려줍니다.

사진은 이미지 검색 결과라 **엉뚱한 가게가 섞일 수 있습니다.** 앱의 수정 화면에
미리보기가 있으니 확인하고, 아니면 리포트의 다른 후보 주소로 바꿔 주세요.

### 직접 찍은 사진 쓰기

`public/images/`에 파일을 넣고 사진 주소에 `/images/파일명.jpg`를 입력하면 됩니다.

## 다른 사람이 등록하게 하려면 (같은 와이파이)

내 PC를 서버로 두고 친구들이 폰·노트북으로 접속하는 방식입니다.
**내 키와 내 `db.json`을 그대로 씁니다.** 접속하는 사람은 아무 설정도 필요 없습니다.

터미널 두 개를 `:lan` 버전으로 띄웁니다.

```bash
npm run start:lan
```

```bash
npm run dev:lan
```

`npm run dev:lan`이 출력하는 **Network 주소**(예: `http://192.168.0.5:5173`)를
같은 와이파이의 다른 기기에서 열면 됩니다.

- 리뷰·등록·찜 모두 내 `db.json` 한 곳에 쌓입니다
- 가게 검색은 내 PC의 프록시가 **내 네이버 키로** 대신 호출합니다
- 처음 접속이 안 되면 윈도우 방화벽에서 Node의 사설 네트워크 접근을 허용해 주세요

### 인터넷에 배포하려면

위 방법은 같은 네트워크 안에서만 됩니다. 쿠버네티스에 올리는 방법은
**[deploy/README.md](deploy/README.md)** 에 정리해 두었습니다.

빌드 결과물에는 개발 서버의 프록시가 없으므로, 배포 환경에서는 nginx가 같은 일을
대신합니다 — 정적 파일을 서빙하면서 `/api`는 json-server로, `/naver-api`는 네이버로
넘기고 시크릿 키를 헤더에 붙입니다. 데이터(`db.json`)는 볼륨에 두어 재배포해도 남습니다.

GitHub에 밀면 Actions가 이미지를 빌드하고, ArgoCD가 클러스터에 반영합니다.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
