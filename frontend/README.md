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
| `VITE_AI_URL` | FastAPI 주소 (기본 `http://localhost:8000`) |
| `VITE_KAKAO_MAP_KEY` | 카카오 **JavaScript 키**. 콘솔 > 플랫폼 > Web 에 `http://localhost:5173` 등록 필수. 비워두거나 로드에 실패하면 Leaflet + Esri 도로 지도로 자동 대체 (`src/components/map/MapView.jsx`) |
| `VITE_USE_MOCK` | `true` 면 서버 없이 가짜 데이터로 동작 (테스트 계정 `test` / `test1234`) |

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
  api/          서버 호출 (client.js 에서 주소·withCredentials 한 곳 관리, mock.js 는 MOCK 모드 전용)
  components/   재사용 컴포넌트
  pages/        라우트별 페이지
  context/      AuthContext (로그인 상태)
  utils/        가격·면적 포맷, 카카오 SDK 로더
  constants/    서울 25개 구, 데이터 출처
```

## API 계약 (백엔드 D · AI E 와 확정 필요)

**JSON 필드는 camelCase 로 통일** (Spring 기본). FastAPI 만 학습 컬럼명(snake_case)을 그대로 쓰고,
변환은 `src/api/predict.js` 한 곳에서만 합니다. 가격은 전부 **만원 정수**, 면적은 **㎡**.

### Apartment

```json
{
  "aptId": 1, "name": "래미안 ○○", "address": "서울특별시 강남구 ...",
  "gu": "강남구", "dong": "역삼동", "areaM2": 84.97, "floor": 12, "builtYear": 2008,
  "price": 245000, "dealDate": "2026-05-14", "lat": 37.49, "lng": 127.03
}
```

| 메서드 · 경로 | 요청 | 응답 |
| --- | --- | --- |
| `GET /api/apartments` | 쿼리 `type, gu, minPrice, maxPrice, minArea, maxArea` (모두 선택, `type` = `apt`·`villa`·`oneroom`·`officetel`·`store`, 없으면 `apt`) | `Apartment[]` |
| `GET /api/apartments/{id}` | — | `Apartment` · 없으면 **404** |
| `GET /api/apartments/{id}/deals` | 쿼리 `months` (기본 12) | `{ baseDate, deals: [{ dealDate, price, floor }] }` · 같은 단지·면적 최근 실거래, 날짜 오름차순 |
| `GET /api/recommend` | 쿼리 `maxPrice`(필수), `gu, minArea, minBuiltYear` | `(Apartment & { score })[]` 상위 10건 |
| `POST /api/auth/signup` | `{ loginId, password, name }` | 사용자 · 아이디 중복 **409** |
| `POST /api/auth/login` | `{ loginId, password }` | `{ userId, loginId, name, role }` · 실패 **401** |
| `POST /api/auth/logout` | — | 200 |
| `GET /api/auth/me` | — | 사용자 · 비로그인 **401** |
| `GET /api/favorites` | — | `[{ favoriteId, createdAt, apartment: Apartment }]` · 비로그인 **401** |
| `POST /api/favorites` | `{ aptId }` | 200 · 중복 **409** |
| `DELETE /api/favorites/{aptId}` | — | 200 |
| `POST /predict` (FastAPI) | `{ gu, area_m2, floor, built_year }` | `{ predicted_price }` (만원) · 입력 누락 422 |

오류 응답 본문은 `{ "message": "..." }` 형식이면 화면에 그대로 표시됩니다.

### 백엔드에 꼭 필요한 설정

- CORS: `http://localhost:5173` 허용 + **`allowCredentials(true)`** (세션 쿠키 전송) — Spring, FastAPI 둘 다 origin 허용
- `/api/apartments` 결과가 수천 건이면 지도가 느려지므로 최대 건수 제한(예: 500) 권장

## 프론트 QA 체크 (기획서 12.1)

- [x] 모든 메뉴 이동 정상 — Header NavLink, 404 페이지
- [x] 빈 입력·잘못된 입력 안내 — 각 폼 검증 메시지
- [x] 로딩 · 결과 없음 표시 — `components/Status.jsx`
- [x] 가격 표기 형식 통일 — `utils/format.js` 의 `formatPrice` 만 사용
- [x] AI 예상가 "참고용" 문구 + 데이터 출처 — `components/Disclaimer.jsx`
