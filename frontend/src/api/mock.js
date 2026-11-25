// VITE_USE_MOCK=true 일 때만 쓰이는 가짜 서버입니다.
// 실제 API와 같은 응답 형태 · 같은 상태코드(401/404/409)를 흉내 냅니다.
// 매물 = 백엔드 공유 샘플 50건 (mockSales.js, 경기도 성남·용인·수원) + 같은 모양으로 만든 300건 (GENERATED)
import { SAMPLE_SALES } from './mockSales';

// 서비스 지역 구별 [대표 위도, 경도, 아파트 ㎡당 매매가(만원), 동] — AI 예측 · 지역별분석 실거래 흉내에만 사용
const GU_INFO = {
  '성남시 분당구': [37.3827, 127.1189, 1500, ['서현동', '정자동', '수내동', '야탑동']],
  '성남시 수정구': [37.4504, 127.1458, 900, ['신흥동', '태평동', '양지동']],
  '성남시 중원구': [37.4305, 127.1371, 800, ['성남동', '금광동', '상대원동']],
  '용인시 수지구': [37.3221, 127.0975, 1000, ['풍덕천동', '동천동', '죽전동']],
  '용인시 기흥구': [37.2803, 127.1146, 850, ['구갈동', '보정동', '신갈동']],
  '용인시 처인구': [37.2343, 127.2017, 500, ['김량장동', '삼가동', '역북동']],
  '수원시 영통구': [37.2596, 127.0465, 900, ['영통동', '망포동', '매탄동']],
  '수원시 팔달구': [37.2826, 127.0198, 700, ['인계동', '매교동', '화서동']],
  '수원시 권선구': [37.2578, 126.9719, 650, ['권선동', '세류동', '금곡동']],
  '수원시 장안구': [37.3040, 127.0101, 650, ['정자동', '조원동', '율전동']],
};
const NAMES = ['래미안', '자이', '힐스테이트', '푸르지오', '아이파크', 'e편한세상', '롯데캐슬', '더샵', '센트럴', '파크뷰'];
const AREAS = [39.6, 49.94, 59.97, 74.89, 84.97, 101.9, 114.7];

// 같은 결과가 나오도록 시드 고정 난수
let seed = 20261112;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

// 구별 가까운 지하철역 (목업). 실제는 백엔드가 공공 역 좌표 데이터로 직선거리 계산
const GU_STATIONS = {
  '성남시 분당구': ['서현역', '정자역', '판교역', '야탑역', '수내역'],
  '성남시 수정구': ['신흥역', '수진역', '태평역', '산성역'],
  '성남시 중원구': ['모란역', '단대오거리역', '남한산성입구역'],
  '용인시 수지구': ['동천역', '수지구청역', '성복역', '상현역'],
  '용인시 기흥구': ['기흥역', '구성역', '신갈역', '보정역'],
  '용인시 처인구': ['용인중앙시장역', '김량장역', '운동장·송담대역'],
  '수원시 영통구': ['영통역', '망포역', '청명역'],
  '수원시 팔달구': ['수원역', '매교역', '수원시청역'],
  '수원시 권선구': ['세류역', '오목천역', '고색역'],
  '수원시 장안구': ['성균관대역', '화서역'],
};
const stationById = (gu, aptId) => {
  const st = GU_STATIONS[gu] ?? ['수원역'];
  return { name: st[aptId % st.length], distanceM: 150 + ((aptId * 397) % 1350) };
};

// 샘플 50건만으로는 화면이 비어 보여서, 같은 모양의 매물을 구마다 더 만듦 (generated: true · 번호 10001부터)
// 가격 = 구별 아파트 ㎡당 매매가 × 종류별 비율. 옵션 · 관리비 · 방 수는 샘플의 종류별 값에 맞춤
const span = (lo, hi) => lo + rand() * (hi - lo);
const round = (v, unit) => Math.max(unit, Math.round(v / unit) * unit);
const GEN_TYPES = {
  apt: {
    names: NAMES, areas: AREAS, factor: 1, floors: 25, from: 1990, fee: [12, 28],
    options: ['시스템에어컨', '붙박이장', '공동현관보안', '엘리베이터'],
    deals: { sale: 4, jeonse: 3, monthly: 3 }, jeonse: [0.55, 0.7], deposit: [3000, 20000], rent: [60, 250],
  },
  villa: {
    names: ['라온빌라', '해오름빌리지', '청솔빌리지', '하늘채빌라'], areas: [36.1, 42.5, 49.8, 54.2, 59.4], factor: 0.45, floors: 5, from: 2000, fee: [5, 15],
    options: ['에어컨', '냉장고', '세탁기', '가스레인지'],
    deals: { sale: 2, jeonse: 2, monthly: 2 }, jeonse: [0.7, 0.85], deposit: [500, 3000], rent: [40, 90],
  },
  oneroom: {
    names: ['다온원룸', '리빙빌', '청춘하우스', '스테이원룸'], areas: [17.6, 19.8, 23.1, 26.4, 31.1], factor: 0.5, floors: 8, from: 2008, fee: [5, 8],
    options: ['에어컨', '냉장고', '세탁기', '인덕션'],
    deals: { sale: 1, jeonse: 1, monthly: 3 }, jeonse: [0.7, 0.85], deposit: [300, 1000], rent: [35, 70],
  },
  officetel: {
    names: ['스마트타워', '센트럴시티오피스텔', '로얄팰리스오피스텔', '파크뷰오피스텔'], areas: [25.5, 29.8, 33.1, 42.3, 52.3], factor: 0.7, floors: 20, from: 2005, fee: [10, 30],
    options: ['에어컨', '냉장고', '세탁기', '인덕션', '엘리베이터'],
    deals: { sale: 2, jeonse: 1, monthly: 2 }, jeonse: [0.7, 0.85], deposit: [500, 3000], rent: [50, 110],
  },
  store: {
    names: ['센트럴상가', '한빛프라자', '메트로상가', '중앙프라자'], areas: [39.7, 49.6, 66.1, 86.4, 99.2], factor: 1.2, floors: 5, from: 2000, fee: [15, 20],
    options: ['냉난방기', '급배수시설', '엘리베이터'],
    deals: { sale: 1, jeonse: 1, monthly: 2 }, jeonse: [0.6, 0.8], deposit: [2000, 10000], rent: [100, 500],
  },
};
const DIRECTIONS = ['남', '동', '서', '북'];
const GENERATED = [];
let genId = 10001;
for (const [gu, [lat, lng, perM2, dongs]] of Object.entries(GU_INFO)) {
  for (const [type, t] of Object.entries(GEN_TYPES)) {
    for (const [dealType, count] of Object.entries(t.deals)) {
      for (let i = 0; i < count; i += 1) {
        const dong = dongs[Math.floor(rand() * dongs.length)];
        const area = t.areas[Math.floor(rand() * t.areas.length)];
        const builtYear = t.from + Math.floor(rand() * (2025 - t.from));
        const sale = area * perM2 * t.factor * (1.15 - (2026 - builtYear) * 0.008) * span(0.9, 1.1);
        let price;
        let rent;
        if (dealType === 'sale') price = round(sale, 10);
        else if (dealType === 'jeonse') price = round(sale * span(...t.jeonse), 100);
        else {
          price = round(span(...t.deposit), 100);
          rent = Math.round(span(...t.rent));
        }
        const rooms = type === 'apt' ? (area < 60 ? 2 : area < 100 ? 3 : 4) : type === 'store' ? 0 : type === 'villa' ? 2 : area > 40 ? 2 : 1;
        const apt = {
          aptId: genId,
          type,
          dealType,
          name: `${dong.replace(/동$/, '')} ${t.names[Math.floor(rand() * t.names.length)]}`,
          address: `경기도 ${gu} ${dong} ${100 + Math.floor(rand() * 900)}`,
          gu,
          dong,
          areaM2: area,
          floor: 1 + Math.floor(rand() * t.floors),
          builtYear,
          price,
          dealDate: `2026-${String(8 + Math.floor(rand() * 4)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 27)).padStart(2, '0')}`,
          lat: +(lat + (rand() - 0.5) * 0.05).toFixed(6),
          lng: +(lng + (rand() - 0.5) * 0.05).toFixed(6),
          mgmtFee: Math.round(span(...t.fee)),
          direction: DIRECTIONS[Math.floor(rand() * DIRECTIONS.length)],
          rooms,
          baths: type === 'store' ? 0 : rooms >= 3 ? 2 : 1,
          optionNames: t.options,
          generated: true,
        };
        if (rent != null) apt.rent = rent;
        GENERATED.push(apt);
        genId += 1;
      }
    }
  }
}

const APARTMENTS = [...SAMPLE_SALES, ...GENERATED].map((a) => ({ ...a, nearestStation: stationById(a.gu, a.aptId) }));
/** 관리자 화면(단지 관리) 처음 데이터용 — 목업 매물 전체 */
export const mockApartments = () => APARTMENTS;

// 상세 필터용 정보 — 샘플에 있는 옵션(엘리베이터 · 가전)은 그대로 쓰고,
// 샘플에 없는 값(구조 · 주차 · 반려동물 · 업종 · 권리금)은 목업 전용으로 id 로 정함
const pickBy = (n, list) => list[n % list.length];
const FULL_OPTION = ['냉장고', '세탁기'];
APARTMENTS.forEach((a) => {
  const h = (a.aptId * 2654435761) % 4294967296;
  const bit = (k) => ((h >> k) & 1) === 1;
  const has = (name) => a.optionNames.includes(name);
  const opts = [];
  if (bit(3)) opts.push('parking');
  if (has('엘리베이터')) opts.push('elevator');
  if (bit(7)) opts.push('pet');
  if (a.dealType === 'jeonse' && !bit(9)) opts.push('loan');
  if ((a.type === 'oneroom' || a.type === 'officetel') && FULL_OPTION.every(has)) opts.push('full');
  if (a.type === 'oneroom') a.structure = pickBy(h, ['open', 'split', 'open', 'duplex']);
  if (a.type === 'officetel') a.structure = pickBy(h, ['open', 'split', 'two', 'open', 'duplex']);
  if (a.type === 'store') {
    a.subType = bit(2) ? 'office' : 'store';
    a.bizTypes = a.subType === 'office' ? ['office'] : [pickBy(h, ['food', 'cafe', 'retail', 'academy', 'medical']), pickBy(h >> 4, ['cafe', 'retail', 'food'])];
    a.rightsFee = a.subType === 'office' || bit(4) ? 0 : 1000 + (h % 40) * 250; // 권리금 (만원)
    if (bit(6)) opts.push('corner');
    if (bit(8)) opts.push('vacant');
    if (!a.rightsFee) opts.push('norights');
  }
  a.options = opts;
});

// 지역별분석용 아파트 매매 실거래 (목업) — 실거래는 등록 매물과 다른 데이터(국토부)라 따로 만듦. 구마다 8건
const TRADES = [];
for (const [gu, [lat, lng, perM2, dongs]] of Object.entries(GU_INFO)) {
  for (let i = 0; i < 8; i += 1) {
    const area = AREAS[Math.floor(rand() * AREAS.length)];
    const builtYear = 1990 + Math.floor(rand() * 34);
    const dong = dongs[i % dongs.length];
    TRADES.push({
      type: 'apt',
      dealType: 'sale',
      name: `${dong.replace(/동$/, '')} ${NAMES[Math.floor(rand() * NAMES.length)]}`,
      gu,
      dong,
      areaM2: area,
      floor: 1 + Math.floor(rand() * 25),
      builtYear,
      price: Math.round((area * perM2 * (1.15 - (2026 - builtYear) * 0.008) * (0.92 + rand() * 0.18)) / 10) * 10,
      dealDate: `2026-${String(1 + Math.floor(rand() * 10)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 27)).padStart(2, '0')}`,
      lat: +(lat + (rand() - 0.5) * 0.03).toFixed(6),
      lng: +(lng + (rand() - 0.5) * 0.03).toFixed(6),
    });
  }
}

// 매매만 쓰는 곳(인기 · 추천 · 매물찾기)용
const isAptSale = (a) => a.type === 'apt' && (a.dealType ?? 'sale') === 'sale';

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
// 테스트 계정: test@chatzip.kr = 관리자(ADMIN) · user@chatzip.kr = 일반 회원(USER)
const SEED_USERS = [
  { userId: 1, loginId: 'test', password: 'test1234', name: '관리자', role: 'ADMIN', email: 'test@chatzip.kr', createdAt: '2026-03-02' },
  { userId: 2, loginId: 'user', password: 'user1234', name: '일반회원', role: 'USER', email: 'user@chatzip.kr', createdAt: '2026-11-25' },
];
const users = load('mock.users', SEED_USERS.map((u) => ({ ...u })));
// 예전에 저장된 목록도 맞춤: test 는 관리자로, 일반 회원 계정이 없으면 추가
SEED_USERS.forEach((seed) => {
  const u = users.find((x) => x.email === seed.email);
  if (!u) users.push({ ...seed, userId: Math.max(0, ...users.map((x) => x.userId)) + 1 });
  else if (seed.role === 'ADMIN') Object.assign(u, { role: 'ADMIN', name: seed.name });
});
save('mock.users', users);
let session = load('mock.session', null);
if (session) {
  const u = users.find((x) => x.userId === session.userId);
  if (u && (u.role !== session.role || u.name !== session.name)) { session = { ...session, role: u.role, name: u.name }; save('mock.session', session); }
}
let favorites = load('mock.favorites', []); // { favoriteId, userId, aptId, createdAt }

const publicUser = (u) => ({
  userId: u.userId, loginId: u.loginId, name: u.name, role: u.role,
  email: u.email ?? null, createdAt: u.createdAt ?? '2026-03-02', provider: u.provider ?? 'local',
});
const requireLogin = () => {
  if (!session) throw httpError(401, '로그인이 필요합니다.');
  return session;
};

// ---- 매물 ----
export async function searchApartments(f) {
  await delay();
  const type = f.type || 'apt';
  const deal = f.deal || (['oneroom', 'officetel', 'store'].includes(type) ? 'monthly' : 'sale');
  const list = (v) => (v ? String(v).split(',') : []);
  const floorOk = (a) => list(f.floor).length === 0 || list(f.floor).some((k) => ({
    low: a.floor <= 5, mid: a.floor >= 6 && a.floor <= 15, high: a.floor >= 16,
    semi: a.floor !== 0, ground: a.floor === 1, upper: a.floor >= 2, b1: a.floor < 0, 1: a.floor === 1, 2: a.floor >= 2,
  }[k]));
  const walk = (a) => Math.ceil((a.nearestStation?.distanceM ?? Infinity) * 1.3 / 80);
  return APARTMENTS.filter((a) =>
    a.type === type
    && (a.dealType ?? 'sale') === deal
    && (!f.minRent || (a.rent ?? 0) >= Number(f.minRent))
    && (!f.maxRent || (a.rent ?? 0) <= Number(f.maxRent))
    && (!f.maxWalk || walk(a) <= Number(f.maxWalk))
    && (!f.gu || a.gu === f.gu)
    && (!f.q || [a.name, a.address, a.gu, a.dong].some((x) => x?.includes(String(f.q).trim())))
    && (!f.minPrice || a.price >= Number(f.minPrice))
    && (!f.maxPrice || a.price <= Number(f.maxPrice))
    && (!f.minArea || a.areaM2 >= Number(f.minArea))
    && (!f.maxArea || a.areaM2 <= Number(f.maxArea))
    // 상세 필터
    && (!f.sub || a.subType === f.sub)
    && (!f.struct || list(f.struct).includes(a.structure))
    && floorOk(a)
    && (!f.maxAge || 2026 - a.builtYear <= Number(f.maxAge))
    && (!f.maxFee || (a.mgmtFee ?? 0) <= Number(f.maxFee))
    && (!f.biz || list(f.biz).some((b) => a.bizTypes?.includes(b)))
    && list(f.opts).every((o) => a.options?.includes(o)));
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

export async function getRecommendations(c) {
  await delay(400);
  const budget = Number(c.maxPrice) || Infinity;
  return APARTMENTS
    .filter((a) => isAptSale(a)
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
  // 실제 서버는 이메일로 로그인 — 목업은 예전 아이디(test)도 받음
  const u = users.find((x) => (x.loginId === loginId || x.email === loginId) && x.password === password);
  if (!u) throw httpError(401, '이메일 또는 비밀번호가 올바르지 않습니다.');
  session = publicUser(u);
  save('mock.session', session);
  return session;
}

export async function signup({ loginId, password, name }) {
  await delay();
  if (users.some((x) => x.loginId === loginId || x.email === loginId)) throw httpError(409, '이미 가입된 이메일입니다.');
  const u = { userId: Math.max(0, ...users.map((x) => x.userId)) + 1, loginId, password, name, role: 'USER', email: loginId, createdAt: new Date().toISOString().slice(0, 10) };
  users.push(u);
  save('mock.users', users);
  return publicUser(u);
}

export async function kakaoLogin() {
  await delay();
  let u = users.find((x) => x.provider === 'kakao');
  if (!u) {
    u = { userId: Math.max(0, ...users.map((x) => x.userId)) + 1, loginId: 'kakao_1', password: null, name: '카카오', role: 'USER', provider: 'kakao', email: 'kakao@example.com', createdAt: new Date().toISOString().slice(0, 10) };
    users.push(u);
    save('mock.users', users);
  }
  session = publicUser(u);
  save('mock.session', session);
  return session;
}

export async function logout() {
  await delay(100);
  session = null;
  save('mock.session', null);
}

// ---- 관리자: 회원 관리 ----
const requireAdmin = () => {
  const s = requireLogin();
  if (s.role !== 'ADMIN') throw httpError(403, '관리자만 할 수 있습니다.');
  return s;
};
export async function adminListMembers() {
  await delay();
  requireAdmin();
  return users.map(publicUser);
}
export async function adminSetRole(userId, role) {
  await delay();
  const me = requireAdmin();
  if (me.userId === Number(userId)) throw httpError(400, '내 권한은 바꿀 수 없습니다.');
  const u = users.find((x) => x.userId === Number(userId));
  if (!u) throw httpError(404, '회원을 찾을 수 없습니다.');
  u.role = role;
  save('mock.users', users);
  return publicUser(u);
}
export async function adminDeleteMember(userId) {
  await delay();
  const me = requireAdmin();
  if (me.userId === Number(userId)) throw httpError(400, '내 계정은 삭제할 수 없습니다.');
  const i = users.findIndex((x) => x.userId === Number(userId));
  if (i < 0) throw httpError(404, '회원을 찾을 수 없습니다.');
  users.splice(i, 1);
  save('mock.users', users);
  favorites = favorites.filter((f) => f.userId !== Number(userId));
  save('mock.favorites', favorites);
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
  const perM2 = GU_INFO[gu]?.[2] ?? 800;
  const age = 2026 - built_year;
  const floorBonus = 1 + Math.min(floor, 20) * 0.004;
  // 같은 입력 → 같은 결과 (기획서 12.1 QA)
  return { predicted_price: Math.round((area_m2 * perM2 * (1.15 - age * 0.008) * floorBonus) / 10) * 10 };
}

// 실시간 인기 매물 (목업): 아파트 중 id 로 정한 가짜 조회 수 순
export async function getPopular(limit = 5) {
  await delay(200);
  return APARTMENTS
    .filter(isAptSale)
    .map((a) => ({ ...a, viewCount: (a.aptId * 7919) % 1000 }))
    .sort((x, y) => y.viewCount - x.viewCount)
    .slice(0, limit);
}

// ---- 마이페이지 (선호 조건 · 내 등록매물) ----
const DEFAULT_PREFS = { type: 'apt', deal: 'sale', gus: ['성남시 분당구', '용인시 수지구'], minPrice: 90000, maxPrice: 120000, minArea: 60, maxArea: 85, maxWalk: 10 };
export async function getPreferences() {
  await delay(150);
  const { userId } = requireLogin();
  return load(`mock.prefs.${userId}`, DEFAULT_PREFS);
}
export async function savePreferences(prefs) {
  await delay(200);
  const { userId } = requireLogin();
  save(`mock.prefs.${userId}`, prefs);
  return prefs;
}
export async function getMyListings() {
  await delay(200);
  requireLogin();
  return [
    { listingId: 101, name: '서현 시범한양', address: '경기도 성남시 분당구 서현동 301', type: 'apt', areaM2: 84.9, floor: 12, dealType: 'sale', price: 164000, status: 'PUBLISHED', createdAt: '2026-11-02' },
    { listingId: 102, name: '풍덕천 e편한세상', address: '경기도 용인시 수지구 풍덕천동 1001', type: 'apt', areaM2: 84.8, floor: 9, dealType: 'sale', price: 98000, status: 'PENDING', createdAt: '2026-11-15' },
    { listingId: 103, name: '영통 파크뷰자이', address: '경기도 수원시 영통구 영통동 385', type: 'apt', areaM2: 59.8, floor: 11, dealType: 'sale', price: 72000, status: 'REJECTED', createdAt: '2026-11-10' },
  ];
}

// ---- 지역별분석 (구별 통계 — 위 TRADES 실거래 목업) ----
const PY = 3.3058;
const ppy = (a) => a.price / (a.areaM2 / PY);
const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);
function guSummary(gu, list) {
  const prices = list.map((a) => a.price);
  return {
    gu, count: list.length, avgPrice: avg(prices), avgPerPyeong: avg(list.map(ppy)),
    minPrice: Math.min(...prices), maxPrice: Math.max(...prices),
  };
}
export async function getGuStats() {
  await delay(200);
  const by = new Map();
  TRADES.forEach((a) => by.set(a.gu, [...(by.get(a.gu) ?? []), a]));
  return [...by].map(([gu, list]) => guSummary(gu, list)).sort((x, y) => y.avgPerPyeong - x.avgPerPyeong);
}
const AREA_BANDS = [['60㎡ 이하', 0, 60], ['60~85㎡', 60, 85], ['85~102㎡', 85, 102], ['102㎡ 초과', 102, Infinity]];
const AGE_BANDS = [['5년 이내', 0, 5], ['6~10년', 6, 10], ['11~20년', 11, 20], ['20년 초과', 21, Infinity]];
export async function getGuDetail(gu) {
  await delay(250);
  const all = TRADES;
  const list = all.filter((a) => a.gu === gu);
  if (!list.length) throw httpError(404, '해당 구의 거래가 없습니다.');
  const ranking = (await getGuStats()).map((s) => s.gu);
  const band = (rows, pick) => rows.map(([label, lo, hi]) => {
    const xs = list.filter((a) => pick(a) >= lo && pick(a) <= hi);
    return { label, count: xs.length, avgPrice: avg(xs.map((a) => a.price)), avgPerPyeong: avg(xs.map(ppy)) };
  });
  return {
    ...guSummary(gu, list),
    rank: ranking.indexOf(gu) + 1,
    totalGu: ranking.length,
    avgBuiltYear: avg(list.map((a) => a.builtYear)),
    seoulAvgPerPyeong: avg(all.map(ppy)),
    byArea: band(AREA_BANDS, (a) => a.areaM2),
    byAge: band(AGE_BANDS, (a) => 2026 - a.builtYear),
    recent: [...list].sort((x, y) => String(y.dealDate).localeCompare(String(x.dealDate))).slice(0, 5),
  };
}

// ---- 매물찾기 (조건 검색 + 정렬 + 페이지) ----
const SORTS = {
  recent: (a, b) => String(b.dealDate).localeCompare(String(a.dealDate)),
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
  ppyAsc: (a, b) => ppy(a) - ppy(b),
  areaDesc: (a, b) => b.areaM2 - a.areaM2,
};
export async function searchPaged(f) {
  const list = (await searchApartments({ ...f, type: 'apt', deal: 'sale' }))
    .filter((a) => (!f.minBuiltYear || a.builtYear >= Number(f.minBuiltYear))
      && (!f.q || a.name.includes(f.q) || a.dong.includes(f.q)))
    .sort(SORTS[f.sort] ?? SORTS.recent);
  const size = Number(f.size) || 10;
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  const page = Math.min(Number(f.page) || 0, totalPages - 1);
  return { content: list.slice(page * size, page * size + size), totalElements: list.length, totalPages, page, size };
}
