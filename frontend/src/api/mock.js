// VITE_USE_MOCK=true 일 때만 쓰이는 가짜 서버입니다.
// 실제 API와 같은 응답 형태 · 같은 상태코드(401/404/409)를 흉내 냅니다.

const GU_CENTERS = {
  // [위도, 경도, ㎡당 가격(만원)]
  강남구: [37.4979, 127.0476, 2200],
  서초구: [37.4837, 127.0124, 2100],
  송파구: [37.5045, 127.1059, 1750],
  용산구: [37.5326, 126.9906, 1800],
  성동구: [37.5534, 127.0367, 1500],
  마포구: [37.5563, 126.9219, 1350],
  영등포구: [37.5214, 126.9062, 1150],
  양천구: [37.5270, 126.8655, 1150],
  강서구: [37.5559, 126.8395, 900],
  동작구: [37.5024, 126.9393, 1200],
  광진구: [37.5428, 127.0821, 1250],
  노원구: [37.6542, 127.0568, 700],
  은평구: [37.6027, 126.9291, 800],
  관악구: [37.4784, 126.9516, 800],
};
const NAMES = ['래미안', '자이', '힐스테이트', '푸르지오', '아이파크', 'e편한세상', '롯데캐슬', '더샵', '센트럴', '파크뷰'];
const AREAS = [39.6, 49.94, 59.97, 74.89, 84.97, 101.9, 114.7];

// 같은 결과가 나오도록 시드 고정 난수
let seed = 20261112;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const APARTMENTS = [];
let id = 1;
for (const [gu, [lat, lng, perM2]] of Object.entries(GU_CENTERS)) {
  for (let i = 0; i < 4; i += 1) {
    const area = AREAS[Math.floor(rand() * AREAS.length)];
    const builtYear = 1990 + Math.floor(rand() * 34);
    const floor = 1 + Math.floor(rand() * 25);
    const age = 2026 - builtYear;
    const price = Math.round((area * perM2 * (1.15 - age * 0.008) * (0.92 + rand() * 0.18)) / 10) * 10;
    const dong = `${gu.replace('구', '')}${i + 1}동`;
    APARTMENTS.push({
      aptId: id,
      type: 'apt',
      name: `${dong.replace(/\d동$/, '')} ${NAMES[Math.floor(rand() * NAMES.length)]}${i > 1 ? ` ${i}차` : ''}`,
      address: `서울특별시 ${gu} ${dong} ${100 + Math.floor(rand() * 900)}`,
      gu,
      dong,
      areaM2: area,
      floor,
      builtYear,
      price,
      dealDate: `2026-${String(1 + Math.floor(rand() * 10)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 27)).padStart(2, '0')}`,
      lat: +(lat + (rand() - 0.5) * 0.03).toFixed(6),
      lng: +(lng + (rand() - 0.5) * 0.03).toFixed(6),
    });
    id += 1;
  }
}

// 아파트 외 매물 종류 (직방 메뉴) — 가격은 아파트 ㎡당 가격 × factor
const OTHER_TYPES = {
  villa: { names: ['빌라', '하우스', '빌', '맨션'], areas: [33.1, 42.5, 49.8, 59.4, 66.2], factor: 0.45, maxFloor: 5, from: 1995 },
  oneroom: { names: ['원룸', '스튜디오', '하우스'], areas: [16.5, 19.8, 23.1, 26.4, 29.7], factor: 0.4, maxFloor: 5, from: 2000 },
  officetel: { names: ['오피스텔', '시티', '타워', '스위트'], areas: [23.1, 28.9, 33.0, 42.3, 59.5], factor: 0.6, maxFloor: 20, from: 2000 },
  store: { names: ['프라자', '빌딩', '타워', '스퀘어'], areas: [33.0, 49.6, 66.1, 99.2, 132.2], factor: 0.8, maxFloor: 10, from: 1990 },
};
// 목업 가격대 (만원) — utils/format.js 의 PRICE_TIERS 기준
const TIER_RANGES = [[18000, 58000], [62000, 118000], [125000, 195000], [205000, 320000]];
// 빌라·원룸은 실제 가격대가 낮아 사이드바 가격 칩(constants/propertyTypes.js) 구간에 고르게 배정
const TYPE_RANGES = {
  villa: [[12000, 19500], [20500, 29500], [31000, 49000], [52000, 90000]],
  oneroom: [[7000, 9800], [10200, 14800], [15200, 19800], [20500, 30000]],
};
// 전세 보증금 · 월세(보증금 + 월세) 목업 구간 — 사이드바 칩 구간에 고르게 (만원)
const RENT_RANGES = {
  villa: {
    jeonse: [[6000, 9800], [10500, 19500], [20500, 29500], [31000, 45000]],
    deposit: [[300, 1000], [1500, 3000], [3500, 8000]],
    rent: [[35, 50], [55, 78], [82, 120]],
  },
  oneroom: {
    jeonse: [[3000, 4900], [5200, 9800], [10200, 14800], [15200, 22000]],
    deposit: [[100, 500], [600, 1000], [1500, 3000]],
    rent: [[30, 40], [42, 58], [62, 78], [82, 100]],
  },
};
// 구별 가까운 지하철역 (목업). 실제는 백엔드가 공공 역 좌표 데이터로 직선거리 계산
const GU_STATIONS = {
  강남구: ['강남역', '역삼역', '선릉역'], 서초구: ['교대역', '서초역', '방배역'], 송파구: ['잠실역', '석촌역', '송파역'],
  용산구: ['용산역', '이태원역', '숙대입구역'], 성동구: ['왕십리역', '성수역', '뚝섬역'], 마포구: ['망원역', '합정역', '홍대입구역'],
  영등포구: ['영등포구청역', '당산역', '문래역'], 양천구: ['목동역', '오목교역', '신정역'], 강서구: ['화곡역', '까치산역', '발산역'],
  동작구: ['노량진역', '사당역', '상도역'], 광진구: ['건대입구역', '구의역', '군자역'], 노원구: ['노원역', '상계역', '공릉역'],
  은평구: ['연신내역', '불광역', '응암역'], 관악구: ['서울대입구역', '봉천역', '신림역'],
};
const pick = (ranges, n) => { const [lo, hi] = ranges[n % ranges.length]; return lo + rand() * (hi - lo); };
const RENT_TYPES = new Set(['villa', 'oneroom']);

for (const [type, t] of Object.entries(OTHER_TYPES)) {
  const deals = RENT_TYPES.has(type) ? ['sale', 'jeonse', 'monthly'] : ['sale'];
  for (const dealType of deals) {
    let typeCount = 0;
    for (const [gu, [lat, lng]] of Object.entries(GU_CENTERS)) {
      for (let i = 0; i < 3; i += 1) {
        const area = t.areas[Math.floor(rand() * t.areas.length)];
        const builtYear = t.from + Math.floor(rand() * (2025 - t.from));
        // ※ 목업 전용: 가격을 칩 구간(또는 마커 가격대 4단계)에 고르게 배정
        let price;
        let rent;
        if (dealType === 'jeonse') price = Math.round(pick(RENT_RANGES[type].jeonse, typeCount) / 100) * 100;
        else if (dealType === 'monthly') {
          price = Math.round(pick(RENT_RANGES[type].deposit, typeCount) / 100) * 100;
          rent = Math.round(pick(RENT_RANGES[type].rent, typeCount + i));
        } else price = Math.round(pick(TYPE_RANGES[type] ?? TIER_RANGES, typeCount) / 10) * 10;
        typeCount += 1;
        const dong = `${gu.replace('구', '')}${i + 1}동`;
        const apt = {
          aptId: id,
          type,
          dealType,
          name: `${dong.replace(/\d동$/, '')} ${t.names[Math.floor(rand() * t.names.length)]}${i ? ` ${i + 1}` : ''}`,
          address: `서울특별시 ${gu} ${dong} ${100 + Math.floor(rand() * 900)}`,
          gu,
          dong,
          areaM2: area,
          floor: 1 + Math.floor(rand() * t.maxFloor),
          builtYear,
          price,
          dealDate: `2026-${String(1 + Math.floor(rand() * 10)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 27)).padStart(2, '0')}`,
          lat: +(lat + (rand() - 0.5) * 0.03).toFixed(6),
          lng: +(lng + (rand() - 0.5) * 0.03).toFixed(6),
        };
        if (rent != null) apt.rent = rent;
        if (RENT_TYPES.has(type)) {
          const st = GU_STATIONS[gu] ?? ['서울역'];
          apt.nearestStation = { name: st[Math.floor(rand() * st.length)], distanceM: Math.round(150 + rand() * 1350) };
        }
        if (type === 'villa') {
          apt.landAreaM2 = +(area * (0.3 + rand() * 0.3)).toFixed(2); // 대지권 면적
          const v = rand();
          apt.violation = v < 0.1 ? true : v < 0.15 ? null : false; // 건축물대장 위반건축물 여부 (null = 확인 불가)
        }
        APARTMENTS.push(apt);
        id += 1;
      }
    }
  }
}

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const httpError = (status, message) => {
  const err = new Error(message);
  err.response = { status, data: { message } };
  return err;
};

// ---- 저장소 (새로고침해도 유지되도록 localStorage, 실패해도 동작) ----
const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 무시 */ }
};
const users = load('mock.users', [{ userId: 1, loginId: 'test', password: 'test1234', name: '테스트', role: 'USER' }]);
let session = load('mock.session', null);
let favorites = load('mock.favorites', []); // { favoriteId, userId, aptId, createdAt }

const publicUser = (u) => ({ userId: u.userId, loginId: u.loginId, name: u.name, role: u.role });
const requireLogin = () => {
  if (!session) throw httpError(401, '로그인이 필요합니다.');
  return session;
};

// ---- 매물 ----
export async function searchApartments(f) {
  await delay();
  const type = f.type || 'apt';
  const deal = f.deal || (type === 'oneroom' ? 'monthly' : 'sale');
  const walk = (a) => Math.ceil((a.nearestStation?.distanceM ?? Infinity) * 1.3 / 80);
  return APARTMENTS.filter((a) =>
    a.type === type
    && (a.dealType ?? 'sale') === deal
    && (!f.minRent || (a.rent ?? 0) >= Number(f.minRent))
    && (!f.maxRent || (a.rent ?? 0) <= Number(f.maxRent))
    && (!f.maxWalk || walk(a) <= Number(f.maxWalk))
    && (!f.gu || a.gu === f.gu)
    && (!f.minPrice || a.price >= Number(f.minPrice))
    && (!f.maxPrice || a.price <= Number(f.maxPrice))
    && (!f.minArea || a.areaM2 >= Number(f.minArea))
    && (!f.maxArea || a.areaM2 <= Number(f.maxArea)));
}

export async function getApartment(aptId) {
  await delay();
  const apt = APARTMENTS.find((a) => a.aptId === Number(aptId));
  if (!apt) throw httpError(404, '존재하지 않는 매물입니다.');
  return apt;
}

// 최근 1년 실거래 내역 — 매물 id 로 시드를 고정해 항상 같은 그래프
export async function getDeals(aptId, months = 12) {
  await delay(200);
  const apt = APARTMENTS.find((a) => a.aptId === Number(aptId));
  if (!apt) throw httpError(404, '존재하지 않는 매물입니다.');
  let s = apt.aptId * 7919;
  const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const base = new Date('2026-11-13');
  const trend = 0.04 + r() * 0.06; // 1년간 4~10% 상승
  const monthly = apt.dealType === 'monthly';
  const deals = [];
  for (let m = months - 1; m >= 0; m -= 1) {
    if (r() < 0.3) continue; // 거래 없는 달
    const d = new Date(base.getFullYear(), base.getMonth() - m, 1 + Math.floor(r() * 27));
    const t = (months - 1 - m) / (months - 1);
    const k = (1 - trend + trend * t) * (0.96 + r() * 0.08);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const floor = 1 + Math.floor(r() * Math.max(apt.floor + 5, 5));
    // 월세는 보증금은 그대로 두고 월세가 오르내림
    if (monthly) deals.push({ dealDate: ymd, price: apt.price, rent: Math.round(apt.rent * k), floor });
    else deals.push({ dealDate: ymd, price: Math.round((apt.price * k) / 10) * 10, floor });
  }
  deals.push({ dealDate: apt.dealDate, price: apt.price, ...(monthly ? { rent: apt.rent } : {}), floor: apt.floor });
  deals.sort((a, b) => a.dealDate.localeCompare(b.dealDate));
  return { baseDate: '2026-11-13', deals };
}

// 전세가율 — 같은 건물·비슷한 면적의 최근 1년 매매 · 전세 실거래 중간값 비교 (목업은 시드 고정 비율)
export async function getJeonseRatio(aptId) {
  await delay(150);
  const apt = APARTMENTS.find((a) => a.aptId === Number(aptId));
  if (!apt) throw httpError(404, '존재하지 않는 매물입니다.');
  if (apt.dealType === 'monthly') throw httpError(404, '전세가율을 계산할 거래가 없습니다.');
  let s = apt.aptId * 31337;
  const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const ratio = 0.55 + r() * 0.4; // 55~95%
  const salePrice = apt.dealType === 'jeonse' ? Math.round(apt.price / ratio / 100) * 100 : apt.price;
  const jeonsePrice = apt.dealType === 'jeonse' ? apt.price : Math.round((apt.price * ratio) / 100) * 100;
  return {
    salePrice,
    jeonsePrice,
    ratio: Math.round((jeonsePrice / salePrice) * 1000) / 10,
    saleCount: 2 + Math.floor(r() * 5),
    jeonseCount: 2 + Math.floor(r() * 6),
    baseDate: '2026-11-13',
  };
}

// 단지 영역 — 매물 좌표를 둘러싼 불규칙 다각형 (반경 약 120~200m, 시드 고정)
export async function getBoundary(aptId) {
  await delay(120);
  const apt = APARTMENTS.find((a) => a.aptId === Number(aptId));
  if (!apt) throw httpError(404, '존재하지 않는 매물입니다.');
  let s = apt.aptId * 104729;
  const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const n = 7 + Math.floor(r() * 3);
  const base = 0.0011 + r() * 0.0007; // 위도 기준 반경
  const ring = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + r() * 0.3;
    const rad = base * (0.75 + r() * 0.45);
    ring.push([+(apt.lng + (Math.cos(a) * rad) / 0.79).toFixed(6), +(apt.lat + Math.sin(a) * rad).toFixed(6)]);
  }
  ring.push(ring[0]); // 닫힌 고리
  return { type: 'Polygon', coordinates: [ring] };
}

export async function getRecommendations(c) {
  await delay(400);
  const budget = Number(c.maxPrice) || Infinity;
  return APARTMENTS
    .filter((a) => a.type === 'apt'
      && (!c.gu || a.gu === c.gu)
      && a.price <= budget
      && (!c.minArea || a.areaM2 >= Number(c.minArea))
      && (!c.minBuiltYear || a.builtYear >= Number(c.minBuiltYear)))
    .map((a) => {
      const priceScore = Number.isFinite(budget) ? (1 - (budget - a.price) / budget) * 50 : 25;
      const newScore = Math.max(0, (a.builtYear - 1990) / 36) * 30;
      const areaScore = Math.min(a.areaM2 / 115, 1) * 20;
      return { ...a, score: Math.round(priceScore + newScore + areaScore) };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, 10);
}

// ---- 인증 ----
export async function me() {
  await delay(100);
  return requireLogin();
}

export async function login(loginId, password) {
  await delay();
  const u = users.find((x) => x.loginId === loginId && x.password === password);
  if (!u) throw httpError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
  session = publicUser(u);
  save('mock.session', session);
  return session;
}

export async function signup({ loginId, password, name }) {
  await delay();
  if (users.some((x) => x.loginId === loginId)) throw httpError(409, '이미 사용 중인 아이디입니다.');
  const u = { userId: users.length + 1, loginId, password, name, role: 'USER' };
  users.push(u);
  save('mock.users', users);
  return publicUser(u);
}

export async function logout() {
  await delay(100);
  session = null;
  save('mock.session', null);
}

// ---- 관심 매물 ----
export async function getFavorites() {
  await delay();
  const { userId } = requireLogin();
  return favorites
    .filter((f) => f.userId === userId)
    .map((f) => ({ favoriteId: f.favoriteId, createdAt: f.createdAt, apartment: APARTMENTS.find((a) => a.aptId === f.aptId) }))
    .filter((f) => f.apartment);
}

export async function addFavorite(aptId) {
  await delay(150);
  const { userId } = requireLogin();
  if (favorites.some((f) => f.userId === userId && f.aptId === Number(aptId))) {
    throw httpError(409, '이미 관심 매물에 저장되어 있습니다.');
  }
  const fav = { favoriteId: Date.now(), userId, aptId: Number(aptId), createdAt: new Date().toISOString() };
  favorites.push(fav);
  save('mock.favorites', favorites);
  return fav;
}

export async function removeFavorite(aptId) {
  await delay(150);
  const { userId } = requireLogin();
  favorites = favorites.filter((f) => !(f.userId === userId && f.aptId === Number(aptId)));
  save('mock.favorites', favorites);
}

// ---- AI 예측 (FastAPI 흉내) ----
export async function predict({ gu, area_m2, floor, built_year }) {
  await delay(300);
  if (!gu || !area_m2 || !built_year || Number.isNaN(floor)) {
    throw httpError(422, '필수 입력값이 누락되었습니다.');
  }
  const perM2 = GU_CENTERS[gu]?.[2] ?? 2600;
  const age = 2026 - built_year;
  const floorBonus = 1 + Math.min(floor, 20) * 0.004;
  // 같은 입력 → 같은 결과 (기획서 12.1 QA)
  return { predicted_price: Math.round((area_m2 * perM2 * (1.15 - age * 0.008) * floorBonus) / 10) * 10 };
}
