# ChatZip Frontend

React 18 + Vite · React Router · Axios · 카카오맵 JavaScript SDK

## 실행

```bash
cd frontend
npm install
cp .env.example .env   # 이미 있으면 생략. 값 채우기
npm run dev            # http://localhost:5173
```

### .env

| 키 | 설명 |
| --- | --- |
| `VITE_API_URL` | Spring Boot 주소 (기본 `http://localhost:8080`) |
| `VITE_KAKAO_MAP_KEY` | 카카오 **JavaScript 키**. 콘솔 > 플랫폼 > Web 에 `http://localhost:5173` 등록 필수. 비워두거나 로드에 실패하면 Leaflet + Esri 도로 지도로 자동 대체 (`src/components/map/MapView.jsx`) |
| `VITE_USE_MOCK` | `true` 면 서버 없이 가짜 데이터로 동작 (테스트 계정 `test@chatzip.kr` / `test1234`) |

`.env` 는 `.gitignore` 에 들어 있어 GitHub에 올라가지 않습니다. 키는 공유 드라이브로 전달하세요.

## 라우트 (기획서 10.1)

| 라우트 | 페이지 | 컴포넌트 | API | 담당 |
| --- | --- | --- | --- | --- |
| `/` | HomePage | SearchBar, QuickLinks | — | B |
| `/apartment` `/villa` `/oneroom` `/officetel` `/store` | MapPage (`type` 별) | KakaoMap, FilterPanel, AptListItem | `GET /api/apartments` | B |
| `/apartments/:id` | DetailPage | AptInfo, PriceCompare, FavoriteButton | `GET /api/apartments/{id}`, `POST /predict` | B |
| `/recommend` | RecommendPage | ConditionForm, AptListItem | `GET /api/recommend` | C |
| `/predict` | PredictPage | PredictForm, PriceResult | `POST /predict` | C |
| `/favorites` 🔒 | FavoritesPage | AptListItem, 삭제 버튼 | `GET · DELETE /api/favorites` | C |
| `/login` · `/signup` | Login · SignupPage | AuthForm | `POST /api/auth/*` | C |
| 공통 | App | Header, ProtectedRoute | `GET /api/auth/me` | B |

## 폴더 구조

```
src/
  api/          서버 호출 (client.js 에서 주소·withCredentials 한 곳 관리, mock.js · mockSales.js(매물 샘플 50건) 는 MOCK 모드 전용)
  components/   재사용 컴포넌트
  pages/        라우트별 페이지
  context/      AuthContext (로그인 상태)
  utils/        가격·면적 포맷, 카카오 SDK 로더
  constants/    서비스 지역(성남 · 용인 · 수원 10개 구), 데이터 출처
```

## API 계약 (`1120_ChatZip_전체_API_정리본.xlsx` 기준)

프론트는 **Spring 만 호출**합니다 (AI 는 React → Spring → FastAPI). 가격은 전부 **만원 정수**, 면적은 **㎡**.
정리본에는 응답 필드 이름이 없어서, 서버 응답 ↔ 화면 모양 변환은 **`src/api/adapt.js` 한 곳**에서 후보 이름을 차례로 확인합니다
(예: 매물 번호 `salesIdx` → 화면 `aptId`). 백엔드 D 와 필드 이름이 확정되면 `adapt.js` 만 고치면 됩니다.

| 화면 기능 | 메서드 · 경로 | 프론트 함수 |
| --- | --- | --- |
| 지도 · 메인 매물 목록 | `GET /api/sales` (`propertyType, transactionType, keyword, district, 매매가·보증금·월세·면적 범위, page, size`) → `{ items, totalCount }` | `apartments.searchApartments` |
| 매물찾기 (정렬 · 페이지) | `GET /api/sales` (위 조건 + `sort, page, size`) | `apartments.searchPaged` |
| 매물 상세 | `GET /api/sales/{salesIdx}` · 없으면 **404** | `apartments.getApartment` |
| 실거래 그래프 · 전세가율 | `GET /api/trades?estIdx=&transactionType=&startDate=&endDate=&minArea=&maxArea=` | `apartments.getDeals` · `getJeonseRatio` |
| 인기 매물 | `GET /api/sales/popular?limit=5` | `apartments.getPopular` |
| 맞춤 추천 | `POST /api/recommendations` → 매물 ID · 점수 · 추천 이유 | `apartments.getRecommendations` |
| AI 예상가 | `POST /api/price-estimates` `{ region, area, floor, year }` → 예상가 · 단위 · 기준일 | `predict.predictPrice` |
| 지역별분석 | `GET /api/stats/regions` + `GET /api/trades?district=` | `stats.getGuStats` · `getGuDetail` |
| 로그인 | `POST /api/auth/login` `{ email, password }` · 실패 **401** | `auth.login` |
| 회원가입 | `POST /api/members` `{ email, password, nickname }` → 201 · 중복 **409** | `auth.signup` |
| 내 정보 · 로그아웃 | `GET /api/members/me` (비로그인 **401**) · `POST /api/auth/logout` | `auth.fetchMe` · `logout` |
| 카카오 로그인 | `GET /oauth2/authorization/kakao` | `auth.kakaoLogin` |
| 관심목록 | `GET /api/favorites` → `{ items, totalCount }` · `POST /api/favorites { salesIdx }` · `DELETE /api/favorites/{salesIdx}` | `favorites.*` |

정리본에 **없는** API (백엔드와 협의 필요): `GET /api/places/bus-stops` (버스정류장). 없으면 예시 데이터로 대체합니다.

### 단지 테두리 (서버 없이 정적 파일)

매물을 누르면 그리는 필지 테두리는 `public/data/boundaries.json` 에서 읽습니다 (`apartments.getBoundary`).
연속지적도에서 **매물 좌표가 속한 필지만** 뽑아 만든 파일이라, 매물이 바뀌면 다시 만들어야 합니다.

1. [V-World](https://www.vworld.kr) → 공간정보 다운로드 → "연속지적도" → 성남 · 용인 · 수원 10개 구 (`LSMD_CONT_LDREG_*.zip`)
2. 저장소 **밖** 폴더에 구마다 압축 해제 (예: `../../지적도/LSMD_CONT_LDREG_경기_성남시_분당구/…shp`) — 원본은 수백 MB 라 커밋하지 않음
3. `frontend` 폴더에서 실행 (설치할 패키지 없음):
   ```bash
   python -I scripts/build_boundaries.py ../매물_50건_수정샘플.csv ../../지적도
   ```
   매물 CSV 의 `no` 가 키. 파일에 없는 매물은 테두리 없이 표시됩니다.

오류 응답 본문은 `{ "message": "..." }` 형식이면 화면에 그대로 표시됩니다.

### 백엔드에 꼭 필요한 설정

- CORS: `http://localhost:5173` 허용 + **`allowCredentials(true)`** (세션 쿠키 전송)
- CSRF: 쿠키 인증 변경 요청은 `CookieCsrfTokenRepository.withHttpOnlyFalse()` — 프론트가 `XSRF-TOKEN` 쿠키를 `X-XSRF-TOKEN` 헤더로 보냄
- `/api/sales` 결과가 수천 건이면 지도가 느려지므로 프론트는 `size=500` 으로 요청

## 프론트 QA 체크 (기획서 12.1)

- [x] 모든 메뉴 이동 정상 — Header NavLink, 404 페이지
- [x] 빈 입력·잘못된 입력 안내 — 각 폼 검증 메시지
- [x] 로딩 · 결과 없음 표시 — `components/Status.jsx`
- [x] 가격 표기 형식 통일 — `utils/format.js` 의 `formatPrice` 만 사용
- [x] AI 예상가 "참고용" 문구 + 데이터 출처 — `components/Disclaimer.jsx`
