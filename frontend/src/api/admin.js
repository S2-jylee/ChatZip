import { api, isLive, USE_MOCK } from './client';
import { itemsOf } from './adapt';
import { clearEstatesCache, loadAll } from './estates';
import * as mock from './mock';

/**
 * 관리자 — 단지(estate) 등록 · 수정 · 삭제, 회원 관리
 *  실서버(VITE_LIVE_API 에 estates): GET /api/estates (+ 최근 거래가는 /api/trades)
 *    TODO 백엔드: 등록·수정·삭제 API 확정되면 주소 맞추기 (지금은 REST 관례로 POST/PUT/DELETE /api/estates)
 *  그 외: 목업 매물 중 아파트 매매를 단지로 보고 이 브라우저(localStorage)에 저장
 * 단지 모양(백엔드 Estate 와 같은 이름): estIdx, estName, estAddress, city, district, dong, builtYear
 *  + 화면용 price(최근 거래가, 만원) · areaM2 · dealDate
 */

const live = () => isLive('estates');
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 무시 */ }
};
const httpError = (status, message) => {
  const err = new Error(message);
  err.response = { status, data: { message } };
  return err;
};

// "성남시 분당구" → { city: '성남시', district: '분당구' }
const splitGu = (gu = '') => {
  const [city = '', district = ''] = String(gu).split(' ');
  return { city, district };
};

// ---- 목업 저장소 ----
const KEY = 'mock.admin.estates';
function seed() {
  const seen = new Set();
  return mock.mockApartments()
    .filter((a) => a.type === 'apt' && (a.dealType ?? 'sale') === 'sale')
    .filter((a) => (seen.has(a.name) ? false : seen.add(a.name)))
    .map((a) => ({
      estIdx: a.aptId,
      estName: a.name,
      estAddress: a.address,
      ...splitGu(a.gu),
      dong: a.dong,
      builtYear: a.builtYear,
      price: a.price,
      areaM2: a.areaM2,
      dealDate: a.dealDate,
    }));
}
let estates = null;
const mockList = () => {
  if (!estates) estates = load(KEY, null) ?? seed();
  return estates;
};
const persist = () => save(KEY, estates);

const fromListing = (l, e) => ({
  estIdx: l.estIdx,
  estName: l.name,
  estAddress: l.address,
  city: e?.city ?? splitGu(l.gu).city,
  district: e?.district ?? splitGu(l.gu).district,
  dong: l.dong,
  builtYear: l.builtYear ?? null,
  price: l.price,
  areaM2: l.areaM2,
  dealDate: l.dealDate,
});

async function allEstates() {
  if (live()) {
    const { listings, estateById } = await loadAll();
    return listings.map((l) => fromListing(l, estateById.get(l.estIdx)));
  }
  await delay();
  return [...mockList()];
}

/** 단지 목록 — { city, district, q, page(0부터), size } → { content, totalElements, totalPages, page } */
export async function listEstates({ city = '', district = '', q = '', page = 0, size = 10 } = {}) {
  const word = String(q).trim();
  const list = (await allEstates())
    .filter((e) => (!city || e.city === city) && (!district || e.district === district)
      && (!word || [e.estName, e.estAddress, e.dong].some((x) => x?.includes(word))))
    .sort((a, b) => b.estIdx - a.estIdx);
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(Math.max(0, Number(page) || 0), totalPages - 1);
  return { content: list.slice(p * size, p * size + size), totalElements: list.length, totalPages, page: p };
}

export async function getEstate(estIdx) {
  if (live()) {
    const { data } = await api.get(`/api/estates/${estIdx}`);
    return data;
  }
  await delay(120);
  const e = mockList().find((x) => x.estIdx === Number(estIdx));
  if (!e) throw httpError(404, '단지를 찾을 수 없습니다.');
  return { ...e };
}

const body = (f) => ({
  estName: f.estName.trim(),
  estAddress: f.estAddress.trim(),
  city: f.city,
  district: f.district,
  dong: f.dong.trim(),
  builtYear: f.builtYear ? Number(f.builtYear) : null,
});

export async function createEstate(form) {
  if (live()) {
    const { data } = await api.post('/api/estates', body(form)); // 좌표(gpsX·gpsY)는 서버가 주소로 변환
    clearEstatesCache();
    return data;
  }
  await delay();
  const list = mockList();
  if (list.some((x) => x.estName === form.estName.trim())) throw httpError(409, '같은 이름의 단지가 이미 있습니다.');
  const e = { ...body(form), estIdx: Math.max(0, ...list.map((x) => x.estIdx)) + 1, price: null, areaM2: null, dealDate: null };
  list.push(e);
  persist();
  return e;
}

export async function updateEstate(estIdx, form) {
  if (live()) {
    const { data } = await api.put(`/api/estates/${estIdx}`, body(form));
    clearEstatesCache();
    return data;
  }
  await delay();
  const e = mockList().find((x) => x.estIdx === Number(estIdx));
  if (!e) throw httpError(404, '단지를 찾을 수 없습니다.');
  Object.assign(e, body(form));
  persist();
  return { ...e };
}

export async function deleteEstate(estIdx) {
  if (live()) {
    await api.delete(`/api/estates/${estIdx}`);
    clearEstatesCache();
    return;
  }
  await delay();
  estates = mockList().filter((x) => x.estIdx !== Number(estIdx));
  persist();
}

/** 대시보드 숫자 */
export async function getSummary() {
  const list = await allEstates();
  const byCity = {};
  list.forEach((e) => { byCity[e.city] = (byCity[e.city] ?? 0) + 1; });
  return { total: list.length, noPrice: list.filter((e) => !e.price).length, byCity };
}

/**
 * 대시보드 한 번에 (기획안 '26.11.25 관리자 대시보드 — 04 관리자 API 설계 제안 · 05 응답 명세)
 *  GET /api/admin/dashboard → { summary, statusCounts, dailySignups, regionCounts, topFavorites, recentSales }
 *  실서버 연결: VITE_LIVE_API 에 admin 추가. 그 전엔 목업(시연용 가상 값)
 */
export async function getDashboard() {
  if (!USE_MOCK || isLive('admin')) {
    const { data } = await api.get('/api/admin/dashboard');
    return data;
  }
  return mock.adminDashboard();
}

// ---- 회원 관리 ----
// TODO 백엔드: 회원 목록 · 권한 변경 · 삭제 API 생기면 주소 맞추기 (지금은 GET /api/admin/members · PATCH …/{id}/role · DELETE …/{id} 로 가정)
const toMember = (m) => ({
  userId: m.memberIdx ?? m.userId,
  name: m.nickname ?? m.name,
  email: m.email ?? m.loginId,
  role: String(m.role ?? 'USER').replace(/^ROLE_/, ''),
  provider: m.provider ?? 'local',
  createdAt: m.createdAt ?? null,
});

/** 회원 목록 — { q(이름·이메일), role, page, size } */
export async function listMembers({ q = '', role = '', page = 0, size = 10 } = {}) {
  const all = USE_MOCK ? await mock.adminListMembers() : itemsOf((await api.get('/api/admin/members')).data);
  const word = String(q).trim().toLowerCase();
  const list = all.map(toMember)
    .filter((m) => (!role || m.role === role) && (!word || [m.name, m.email].some((x) => String(x ?? '').toLowerCase().includes(word))))
    .sort((a, b) => b.userId - a.userId);
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(Math.max(0, Number(page) || 0), totalPages - 1);
  return { content: list.slice(p * size, p * size + size), totalElements: list.length, totalPages, page: p, all: all.map(toMember) };
}

export async function setMemberRole(userId, role) {
  if (USE_MOCK) return toMember(await mock.adminSetRole(userId, role));
  const { data } = await api.patch(`/api/admin/members/${userId}/role`, { role });
  return toMember(data);
}

export async function deleteMember(userId) {
  if (USE_MOCK) return mock.adminDeleteMember(userId);
  await api.delete(`/api/admin/members/${userId}`);
}
