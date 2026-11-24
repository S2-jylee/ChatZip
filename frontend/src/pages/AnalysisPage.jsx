import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Empty, ErrorBox, Loading } from '../components/Status';
import { getGuDetail, getGuStats } from '../api/stats';
import { errorMessage } from '../api/client';
import { DATA_SOURCE, REGIONS } from '../constants/regions';
import { MAP_PATH } from '../constants/menus';
import { formatDate, formatPrice, formatPriceCompact } from '../utils/format';
import { useDetailHref } from '../utils/detailLink';
import { scrollBehavior } from '../utils/motion';
import { useTitle } from '../utils/useTitle';
import './AnalysisPage.css';

// [키, 탭 글자, 기준 이름, 뜻 풀이] — 뜻 풀이는 PC 왼쪽 세로 메뉴에만 보임
const RANK_SORTS = [
  ['avgPerPyeong', '평당가순', '평당가', '3.3㎡(1평)당 가격 기준'],
  ['avgPrice', '평균가순', '평균 거래가', '거래 1건의 평균 금액'],
  ['count', '거래량순', '거래량', '최근 12개월 거래 건수'],
];

/** "성남시 분당구" → 작은 "성남시" + 굵은 "분당구" (공백 없는 이름은 굵게만) */
function GuName({ gu }) {
  const i = gu.lastIndexOf(' ');
  if (i < 0) return <span className="an-rank-gu"><b>{gu}</b></span>;
  return <span className="an-rank-gu"><small>{gu.slice(0, i)}</small><b>{gu.slice(i + 1)}</b></span>;
}


/** "성남시 분당구" → "분당구" */
const shortGu = (gu = '') => gu.slice(gu.lastIndexOf(' ') + 1);
/** 받침 있으면 "은", 없으면 "는" (분당구 → 는) */
function topicParticle(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return '는';
  return code % 28 ? '은' : '는';
}

/** 가로 막대 한 줄 (값은 텍스트로도 표시 — 색만으로 구분하지 않음) */
function Bar({ label, value, max, text, sub }) {
  return (
    <div className="an-bar">
      <span className="an-bar-label">{label}</span>
      <div className="an-bar-track"><div style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} /></div>
      <span className="an-bar-value">{text}{sub && <small>{sub}</small>}</span>
    </div>
  );
}

function GuDetail({ gu }) {
  const detailHref = useDetailHref();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setD(null);
    setError('');
    getGuDetail(gu)
      .then((x) => { if (!cancelled) setD(x); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, '통계를 불러오지 못했습니다.')); });
    return () => { cancelled = true; };
  }, [gu, reloadKey]);

  if (error) return <ErrorBox message={error} onRetry={() => setReloadKey((n) => n + 1)} />;
  if (!d) return <Loading />;

  // 전체 평균이 0이면 비교 불가(null), 구간 데이터가 비면 막대 기준 1 → NaN · Infinity 방지
  const gap = d.seoulAvgPerPyeong ? Math.round(((d.avgPerPyeong - d.seoulAvgPerPyeong) / d.seoulAvgPerPyeong) * 100) : null;
  const maxOf = (rows) => Math.max(1, ...(rows ?? []).map((b) => b.avgPerPyeong || 0));
  const maxArea = maxOf(d.byArea);
  const maxAge = maxOf(d.byAge);

  return (
    <div className="an-detail">
      <div className="an-detail-head">
        <div>
          <h2>{d.gu} 아파트 시세</h2>
        </div>
        <Link to={`${MAP_PATH}?gu=${encodeURIComponent(d.gu)}`} className="btn btn-ghost btn-sm">지도에서 보기</Link>
      </div>

      {/* 요약 숫자: 가장 중요한 평균 평당가를 크게, 나머지 3개는 옆에 작게 한 줄 */}
      <div className="an-kpis">
        <div className="an-kpi an-kpi-main"><span>평균 평당가</span><strong>{formatPriceCompact(d.avgPerPyeong)}</strong>
          {gap !== null && <small className={gap >= 0 ? 'up' : 'down'}>전체 지역 평균 대비 {gap >= 0 ? '+' : ''}{gap}%</small>}</div>
        <div className="an-kpi-sub">
          <div className="an-kpi"><span>평균 거래가</span><strong>{formatPriceCompact(d.avgPrice)}</strong>
            <small>{formatPriceCompact(d.minPrice)} ~ {formatPriceCompact(d.maxPrice)}</small></div>
          <div className="an-kpi"><span>거래 건수</span><strong>{d.count.toLocaleString()}<em>건</em></strong><small>최근 12개월</small></div>
          <div className="an-kpi"><span>평당가 순위</span><strong>{d.rank}<em>위</em></strong><small>{d.totalGu}개 구 중</small></div>
        </div>
      </div>

      <div className="an-split">
        <section className="an-chart">
          <h3>면적대별 평균 평당가</h3>
          <p className="an-chart-sub">전용면적으로 나눴어요</p>
          {!d.byArea?.length && <p className="muted small">면적대별 거래가 없습니다.</p>}
          {(d.byArea ?? []).map((b) => (
            <Bar key={b.label} label={b.label} value={b.avgPerPyeong} max={maxArea}
              text={b.count ? formatPriceCompact(b.avgPerPyeong) : '거래 없음'} sub={b.count ? `${b.count}건` : ''} />
          ))}
        </section>
        <section className="an-chart">
          <h3>준공 연식별 평균 평당가</h3>
          <p className="an-chart-sub">지은 지 몇 년 됐는지로 나눴어요</p>
          {!d.byAge?.length && <p className="muted small">연식별 거래가 없습니다.</p>}
          {(d.byAge ?? []).map((b) => (
            <Bar key={b.label} label={b.label} value={b.avgPerPyeong} max={maxAge}
              text={b.count ? formatPriceCompact(b.avgPerPyeong) : '거래 없음'} sub={b.count ? `${b.count}건` : ''} />
          ))}
          <p className="muted small">평균 준공연도 {d.avgBuiltYear ? `${d.avgBuiltYear}년` : '정보 없음'}</p>
        </section>
      </div>

      <section>
        <h3>최근 거래</h3>
        {!d.recent?.length && <p className="muted small">최근 거래가 없습니다.</p>}
        <ol className="recent-list">
          {(d.recent ?? []).map((apt, i) => {
            const row = (
              <>
                <span className="rank-no">{i + 1}</span>
                <span className="recent-info">
                  <strong>{apt.name}</strong>
                  <span className="muted small">{apt.dong} · 전용 {Math.round(apt.areaM2)}㎡ · {apt.floor}층</span>
                </span>
                <span className="recent-date muted small">{formatDate(apt.dealDate)}</span>
                <span className="recent-price">{formatPrice(apt.price)}</span>
              </>
            );
            // 실거래는 등록 매물이 아닐 수 있음 → 매물 번호가 있을 때만 상세로 이동
            return (
              <li key={`${apt.aptId ?? ''}-${apt.dealDate}-${i}`}>
                {apt.aptId != null
                  ? <Link to={detailHref(apt.aptId)} className="recent-row">{row}</Link>
                  : <div className="recent-row">{row}</div>}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/** 지역별분석 — 구별 시세 랭킹(GET /api/stats/gu) + 선택한 구 상세(GET /api/stats/gu/{gu}) */
export default function AnalysisPage() {
  const [params, setParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState('avgPerPyeong');
  useTitle(params.get('gu') ? `${params.get('gu')} 시세 · 지역별분석` : '지역별분석');

  const load = () => {
    setError('');
    setStats(null);
    getGuStats().then(setStats).catch((err) => setError(errorMessage(err, '구별 통계를 불러오지 못했습니다.')));
  };
  useEffect(load, []);

  const sorted = useMemo(() => [...(stats ?? [])].sort((a, b) => b[sortKey] - a[sortKey]), [stats, sortKey]);
  const max = sorted[0]?.[sortKey] ?? 1;
  const selected = params.get('gu') || stats?.[0]?.gu;
  // 위 칩에서 고르면 그 자리 그대로, 아래 비교 목록에서 고르면 상세 맨 위로 올라감
  const select = (gu, scroll = false) => {
    setParams({ gu }, { replace: true });
    if (scroll) document.querySelector('.an-picker')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  };
  // 위쪽 칩: 시별로 묶기 ("성남시 분당구" → 성남 [분당구]) — 서비스 지역 순서(REGIONS) 기준, 목록에 없는 구는 뒤에
  const groups = useMemo(() => {
    const names = (stats ?? []).map((st) => st.gu);
    const ordered = [...REGIONS.filter((g) => names.includes(g)), ...names.filter((g) => !REGIONS.includes(g))];
    const by = new Map();
    ordered.forEach((g) => {
      const i = g.lastIndexOf(' ');
      const city = i < 0 ? '기타' : g.slice(0, i);
      by.set(city, [...(by.get(city) ?? []), g]);
    });
    return [...by];
  }, [stats]);
  const valueText = (s) => (sortKey === 'count' ? `${s.count}건` : formatPriceCompact(s[sortKey]));
  // 왼쪽 칸 한 줄: "분당구는 평당가 기준 10개 구 중 1위예요"
  const selectedRank = sorted.findIndex((st) => st.gu === selected) + 1;
  const sortName = RANK_SORTS.find(([k]) => k === sortKey)?.[2] ?? '';

  let content;
  if (error) content = <ErrorBox message={error} onRetry={load} />;
  else if (!stats) content = <Loading />;
  else if (!stats.length) content = <Empty title="통계 데이터가 없습니다" />;
  else {
    content = (
      <>
        {/* 1. 구 고르기 (시별로 묶은 칩) */}
        <nav className="card an-picker" aria-label="구 선택">
          {groups.map(([city, list]) => (
            <div key={city} className="an-picker-group" role="group" aria-label={city}>
              <span className="an-picker-city">{city.replace(/시$/, '')}</span>
              <div className="chips">
                {list.map((g) => (
                  <button key={g} type="button" className={`chip${g === selected ? ' on' : ''}`} aria-pressed={g === selected} onClick={() => select(g)}>
                    {g.slice(g.lastIndexOf(' ') + 1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* 2. 고른 구 상세 (화면 전체 폭) */}
        <div className="card an-main">{selected && <GuDetail gu={selected} />}</div>

        {/* 3. 다른 구와 비교 — 고른 구를 강조, 누르면 그 구로 바꾸고 위로 */}
        <section className="card an-compare" aria-labelledby="an-compare-title">
          {/* PC: 왼쪽 칸 = 제목 · 세로 기준 메뉴(뜻 풀이) · 고른 구 순위 / 태블릿 · 휴대폰: 제목 · 가로 탭 */}
          <div className="an-compare-head">
            <div>
              <h2 id="an-compare-title">다른 구와 비교</h2>
              <p className="muted small">구를 누르면 위에서 그 구의 시세를 볼 수 있어요.</p>
            </div>
            {/* PC 전용: 지도 매매 · 전세 · 월세 탭을 세로로 세운 모양 — 회색 틀 안에서 주황 표시가 위아래로 이동 (좁은 화면에선 숨김 → 아래 가로 탭) */}
            <div
              className="an-sort-menu"
              role="group"
              aria-label="순위 기준"
              style={{ '--n': RANK_SORTS.length, '--i': Math.max(0, RANK_SORTS.findIndex(([k]) => k === sortKey)) }}
            >
              <span className="an-sort-thumb" aria-hidden="true" />
              {RANK_SORTS.map(([k, l, , desc]) => (
                <button key={k} type="button" aria-pressed={sortKey === k} className={`an-sort-opt${sortKey === k ? ' on' : ''}`} onClick={() => setSortKey(k)}>
                  <strong>{l}</strong>
                  <span>{desc}</span>
                </button>
              ))}
            </div>
            {/* 태블릿 · 휴대폰 전용: 지도 매매 · 전세 · 월세 탭과 같은 부품 (PC 에선 숨김) */}
            <div
              className="deal-tabs an-seg"
              role="group"
              aria-label="순위 기준"
              style={{ '--n': RANK_SORTS.length, '--i': Math.max(0, RANK_SORTS.findIndex(([k]) => k === sortKey)) }}
            >
              <span className="deal-thumb" aria-hidden="true" />
              {RANK_SORTS.map(([k, l]) => (
                <button key={k} type="button" aria-pressed={sortKey === k} className={`deal-tab${sortKey === k ? ' on' : ''}`} onClick={() => setSortKey(k)}>{l}</button>
              ))}
            </div>
            {selectedRank > 0 && (
              <p className="an-callout" aria-live="polite">
                <b>{shortGu(selected)}</b>{topicParticle(shortGu(selected))} {sortName} 기준<br />
                {sorted.length}개 구 중 <b>{selectedRank}위</b>예요.
              </p>
            )}
          </div>
          <ol className="an-rank-list">
            {sorted.map((st, i) => (
              <li key={st.gu}>
                <button type="button" className={`an-rank-row${st.gu === selected ? ' on' : ''}`} onClick={() => select(st.gu, true)} aria-pressed={st.gu === selected}>
                  <span className="rank-no">{i + 1}</span>
                  <GuName gu={st.gu} />
                  <span className="an-rank-bar" aria-hidden="true"><span style={{ width: `${(st[sortKey] / max) * 100}%` }} /></span>
                  <span className="an-rank-val">{valueText(st)}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </>
    );
  }

  return (
    <div className="container section">
      <header className="page-head">
        <h1>지역별분석</h1>
        <p className="muted">성남, 용인, 수원의 구별 아파트 실거래 시세를 비교하고, 구를 골라 면적별, 연식별 시세를 확인하세요.</p>
      </header>
      {content}
      <p className="muted small source">데이터 출처: {DATA_SOURCE} · 평당가 = 거래가 ÷ (전용면적 ÷ 3.3058)</p>
    </div>
  );
}
