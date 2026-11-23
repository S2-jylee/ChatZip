import { HAS_KAKAO_KEY, loadKakaoMap } from '../utils/kakaoLoader';
import { placeKind } from '../constants/placeKinds';
import { api, USE_MOCK } from './client';

/**
 * 지도 화면 영역 안의 주변 시설 검색.
 *  - 버스정류장: 카카오에 데이터가 없음 → 백엔드 GET /api/places/bus-stops (공공데이터) · MOCK 이면 예시
 *  - 나머지: 카카오 키가 있으면 카카오 로컬(Places) 검색, 없으면 예시 데이터 (isSample: true)
 * bounds = { south, west, north, east }
 * 반환: [{ id, kind, name, lat, lng, address?, isSample? }]
 */
export async function searchPlaces(kinds, bounds) {
  if (!kinds.length || !bounds) return [];
  const others = kinds.filter((k) => k !== 'bus');
  const [bus, rest] = await Promise.all([
    kinds.includes('bus') ? busStops(bounds) : [],
    searchOthers(others, bounds),
  ]);
  return [...bus, ...rest];
}

/**
 * GET /api/places/bus-stops?south=&west=&north=&east=
 * 응답: [{ stopId, name, lat, lng }]
 * 백엔드: 경기데이터드림 "경기도 버스정류소 현황" 또는 공공데이터포털 TAGO 정류소 API 를 DB 에 적재 후 범위 조회
 */
async function busStops(b) {
  if (!USE_MOCK) {
    try {
      const { data } = await api.get('/api/places/bus-stops', { params: b });
      return data.map((s) => ({ id: `bus-${s.stopId}`, kind: 'bus', name: s.name, lat: s.lat, lng: s.lng }));
    } catch { /* 백엔드 준비 전 → 예시 */ }
  }
  return samplePlaces('bus', b);
}

async function searchOthers(kinds, bounds) {
  if (!kinds.length) return [];
  if (HAS_KAKAO_KEY) {
    try {
      const kakao = await loadKakaoMap();
      // 카카오는 검색 1번에 최대 45개 → 넓은 화면은 최대 4×4 칸으로 나눠 검색 후 중복 제거
      const tiles = splitBounds(bounds, 0.08, 4);
      const lists = await Promise.all(kinds.flatMap((k) => tiles.map((t) => kakaoSearch(kakao, k, t))));
      return [...new Map(lists.flat().map((p) => [p.id, p])).values()];
    } catch {
      /* 카카오 실패 시 예시 데이터 */
    }
  }
  return kinds.flatMap((k) => samplePlaces(k, bounds));
}

function splitBounds(b, size, max) {
  const ny = Math.min(max, Math.max(1, Math.ceil((b.north - b.south) / size)));
  const nx = Math.min(max, Math.max(1, Math.ceil((b.east - b.west) / size)));
  const tiles = [];
  for (let i = 0; i < ny; i += 1) {
    for (let j = 0; j < nx; j += 1) {
      tiles.push({
        south: b.south + ((b.north - b.south) * i) / ny,
        north: b.south + ((b.north - b.south) * (i + 1)) / ny,
        west: b.west + ((b.east - b.west) * j) / nx,
        east: b.west + ((b.east - b.west) * (j + 1)) / nx,
      });
    }
  }
  return tiles;
}

// 카카오 로컬: 한 번에 15개 × 최대 3페이지 (카카오 제한 45개)
function kakaoSearch(kakao, key, b) {
  const kind = placeKind(key);
  const ps = new kakao.maps.services.Places();
  const rect = new kakao.maps.LatLngBounds(new kakao.maps.LatLng(b.south, b.west), new kakao.maps.LatLng(b.north, b.east));
  const out = [];
  return new Promise((resolve) => {
    const done = (data, status, pagination) => {
      if (status === kakao.maps.services.Status.OK) {
        data.forEach((p) => {
          // 환승역은 노선마다 따로 나오므로("강남역 2호선", "강남역 신분당선") 역 이름 하나로 합침
          const station = key === 'subway' ? p.place_name.split(' ')[0] : null;
          out.push({
            id: station ? `subway-${station}` : `${key}-${p.id}`,
            kind: key,
            name: station ?? p.place_name,
            lat: Number(p.y),
            lng: Number(p.x),
            address: p.road_address_name || p.address_name,
          });
        });
        if (pagination?.hasNextPage && pagination.current < 3) { pagination.nextPage(); return; }
      }
      resolve(out);
    };
    if (kind.code) ps.categorySearch(kind.code, done, { bounds: rect });
    else ps.keywordSearch(kind.keyword, done, { bounds: rect });
  });
}

// ---- 예시 데이터: 위경도 격자마다 고정된 위치 (지도를 움직여도 같은 자리) ----
const CELL = 0.006; // 약 600m
const PER_CELL = { subway: 0.25, bus: 3, school: 0.6, store: 3, mart: 0.6, cafe: 3, food: 4, hospital: 1.2, pharmacy: 1, bank: 0.7, kids: 1, academy: 1.5, culture: 0.3, univ: 0.04 };

function hash(...nums) {
  let h = 2166136261;
  nums.forEach((n) => { h ^= Math.round(n * 1000); h = Math.imul(h, 16777619); });
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

function samplePlaces(key, b) {
  const kind = placeKind(key);
  const rate = PER_CELL[key] ?? 1;
  const out = [];
  const salt = key.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  for (let y = Math.floor(b.south / CELL); y <= Math.floor(b.north / CELL); y += 1) {
    for (let x = Math.floor(b.west / CELL); x <= Math.floor(b.east / CELL); x += 1) {
      const r = hash(x, y, salt);
      const n = Math.floor(rate) + (r() < rate % 1 ? 1 : 0);
      for (let i = 0; i < n; i += 1) {
        const lat = (y + r()) * CELL;
        const lng = (x + r()) * CELL;
        if (lat < b.south || lat > b.north || lng < b.west || lng > b.east) continue;
        out.push({ id: `${key}-${x}-${y}-${i}`, kind: key, name: `${kind.label} (예시)`, lat, lng, isSample: true });
      }
    }
  }
  return out.slice(0, 200);
}
