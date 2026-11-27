import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ListingModal from '../../components/detail/ListingModal';
import { useDetailHref } from '../../utils/detailLink';
import { getDashboard } from '../../api/admin';
import { USE_MOCK, errorMessage, isLive } from '../../api/client';
import { Empty, ErrorBox, Loading } from '../../components/Status';
import { useTitle } from '../../utils/useTitle';

/**
 * 관리자 대시보드 — 기획안(관리자페이지_대시보드_기획_261125) 02 화면 그대로
 *  상단 카드 4 · 매물 상태 현황(도넛) · 최근 7일 신규 회원(꺾은선) · 지역별 매물 현황(막대)
 *  · 관심매물 TOP 5 · 최근 등록 매물 5건
 * 데이터: GET /api/admin/dashboard 한 번 (api/admin.js getDashboard)
 */

// 매물 상태 코드 → 이름 · 색 (실제 코드가 정해지면 여기만 맞춤 — 기획안 05 "실제 코드 매핑 필요")
const STATUS = {
  REGISTERED: { label: '등록', color: 'var(--chart-1)' },
  PENDING: { label: '대기', color: 'var(--chart-2)' },
  COMPLETED: { label: '완료', color: 'var(--chart-3)' },
  CANCELED: { label: '취소', color: 'var(--chart-muted)' },
};
const statusInfo = (code) => STATUS[code] ?? { label: code, color: 'var(--chart-muted)' };
const num = (n) => Number(n ?? 0).toLocaleString();
const mmdd = (d) => { const [, m, day] = String(d ?? '').slice(0, 10).split('-'); return m ? `${Number(m)}/${Number(day)}` : '-'; };
const cityShort = (c) => String(c ?? '').replace(/시$/, '');

/* ---------- 매물 상태 현황: 도넛 + 범례(이름 · 건수 · 비율) ---------- */
function StatusDonut({ items }) {
  const total = items.reduce((n, x) => n + x.count, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  const GAP = total && items.filter((x) => x.count).length > 1 ? 2 : 0; // 조각 사이 2px 틈
  let offset = 0;
  return (
    <div className="dash-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={`매물 상태: ${items.map((x) => `${statusInfo(x.status).label} ${x.count}건`).join(', ')}`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--bg)" strokeWidth="22" />
        {total > 0 && items.map((x) => {
          const len = (x.count / total) * C;
          const seg = (
            <circle
              key={x.status}
              cx="70" cy="70" r={R} fill="none"
              stroke={statusInfo(x.status).color} strokeWidth="22"
              strokeDasharray={`${Math.max(0, len - GAP)} ${C}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            >
              <title>{`${statusInfo(x.status).label} ${num(x.count)}건 (${Math.round((x.count / total) * 100)}%)`}</title>
            </circle>
          );
          offset += len;
          return seg;
        })}
        <text x="70" y="66" textAnchor="middle" className="dash-donut-total">{num(total)}</text>
        <text x="70" y="86" textAnchor="middle" className="dash-donut-unit">전체 건</text>
      </svg>
      <ul className="dash-legend">
        {items.map((x) => (
          <li key={x.status}>
            <i style={{ background: statusInfo(x.status).color }} aria-hidden="true" />
            <span>{statusInfo(x.status).label}</span>
            <b>{num(x.count)}</b>
            <small>{total ? Math.round((x.count / total) * 100) : 0}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- 최근 7일 신규 회원: 꺾은선 (빈 날짜는 0) ---------- */
function SignupLine({ items }) {
  const W = 300; const H = 160; const L = 44; const Rr = 16; const T = 16; const B = 28;
  const max = Math.max(4, ...items.map((x) => x.count));
  const top = Math.ceil(max / 2) * 2; // 눈금이 짝수로 떨어지게
  const PAD = 12; // 첫 점 값 글자가 왼쪽 눈금 숫자와 겹치지 않게 띄움
  const x = (i) => L + PAD + (i * (W - L - PAD - Rr)) / Math.max(1, items.length - 1);
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const ticks = [0, top / 2, top];
  const sum = items.reduce((n, d) => n + d.count, 0);
  const peak = items.reduce((best, d, i) => (d.count > items[best].count ? i : best), 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dash-line" role="img" aria-label={`최근 7일 신규 회원 ${sum}명: ${items.map((d) => `${mmdd(d.date)} ${d.count}명`).join(', ')}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - Rr} y1={y(t)} y2={y(t)} className="dash-grid" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" className="dash-axis">{t}</text>
        </g>
      ))}
      <polyline points={items.map((d, i) => `${x(i)},${y(d.count)}`).join(' ')} className="dash-line-path" />
      {items.map((d, i) => (
        <g key={d.date} className="dash-pt">
          <rect x={x(i) - 18} y={T - 8} width="36" height={H - T - B + 16} fill="transparent" />
          <circle cx={x(i)} cy={y(d.count)} r="4.5" />
          {/* 숫자는 가장 많은 날과 오늘만 (나머지는 마우스를 올리면 보임) */}
          {(i === peak || i === items.length - 1) && <text x={x(i)} y={y(d.count) - 10} textAnchor="middle" className="dash-pt-val">{d.count}</text>}
          <text x={x(i)} y={H - 8} textAnchor="middle" className="dash-axis">{mmdd(d.date)}</text>
          <title>{`${mmdd(d.date)} 신규 ${d.count}명`}</title>
        </g>
      ))}
    </svg>
  );
}

/* ---------- 지역별 매물 현황: 가로 막대 ---------- */
function RegionBars({ items }) {
  const max = Math.max(1, ...items.map((x) => x.count));
  return (
    <ul className="dash-bars">
      {items.map((r) => (
        <li key={r.city} title={`${r.city} ${num(r.count)}건`}>
          <span>{cityShort(r.city)}</span>
          <span className="dash-bar" aria-hidden="true"><i style={{ width: `${(r.count / max) * 100}%` }} /></span>
          <b>{num(r.count)}</b>
        </li>
      ))}
    </ul>
  );
}

export default function AdminDashboard() {
  useTitle('관리자');
  // 목록을 누르면 ?detail={매물 번호} → 서비스 화면과 같은 상세 모달 (뒤로 가기 = 닫기)
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const detailHref = useDetailHref();
  const detailId = params.get('detail');
  const closeDetail = useCallback(() => navigate({ search: '' }), [navigate]);
  const [state, setState] = useState({ loading: true, data: null, error: null });

  const load = () => {
    setState({ loading: true, data: null, error: null });
    getDashboard()
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((err) => setState({ loading: false, data: null, error: errorMessage(err, '대시보드를 불러오지 못했습니다.') }));
  };
  useEffect(load, []);

  if (state.loading) return <div className="admin-page"><Loading /></div>;
  if (state.error) return <div className="admin-page"><ErrorBox message={state.error} onRetry={load} /></div>;

  const { summary = {}, statusCounts = [], dailySignups = [], regionCounts = [], topFavorites = [], recentSales = [] } = state.data ?? {};
  const isSample = USE_MOCK && !isLive('admin');
  const cards = [
    { label: '전체 회원', value: summary.members, unit: '명', to: 'members' },
    { label: '오늘 신규', value: summary.todaySignups, unit: '명', to: 'members' },
    { label: '전체 등록 매물', value: summary.sales, unit: '건' },
    { label: '관심 등록', value: summary.favorites, unit: '건' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-head">
        <h1>대시보드</h1>
        {isSample && <span className="dash-sample">시연용 가상 값</span>}
      </div>

      <div className="admin-stats dash-stats">
        {cards.map((c) => {
          const body = (
            <>
              <span>{c.label}</span>
              <strong>{num(c.value)}<small>{c.unit}</small></strong>
            </>
          );
          return c.to
            ? <Link key={c.label} to={c.to} className="admin-card admin-stat">{body}</Link>
            : <div key={c.label} className="admin-card admin-stat is-static">{body}</div>;
        })}
      </div>

      <div className="dash-row3">
        <section className="admin-card admin-panel">
          <h2>매물 상태 현황</h2>
          {statusCounts.length ? <StatusDonut items={statusCounts} /> : <Empty title="매물이 없습니다" />}
        </section>
        <section className="admin-card admin-panel">
          <h2>최근 7일 신규 회원</h2>
          {dailySignups.length ? <SignupLine items={dailySignups} /> : <Empty title="가입 기록이 없습니다" />}
        </section>
        <section className="admin-card admin-panel">
          <h2>지역별 매물 현황</h2>
          {regionCounts.length ? <RegionBars items={regionCounts} /> : <Empty title="매물이 없습니다" />}
        </section>
      </div>

      <div className="admin-split">
        <section className="admin-card admin-panel">
          <h2>관심매물 TOP 5</h2>
          {topFavorites.length ? (
            <ol className="dash-rank">
              {topFavorites.map((f, i) => (
                <li key={f.salesIdx}>
                  <Link to={detailHref(f.salesIdx)} className="dash-row-link" aria-label={`${f.estName} 상세 보기`}>
                    <span className="dash-rank-no">{i + 1}</span>
                    <strong>{f.estName}</strong>
                    {f.city && <small>{cityShort(f.city)}</small>}
                    <b>{num(f.count)}<em>건</em></b>
                  </Link>
                </li>
              ))}
            </ol>
          ) : <Empty title="관심 등록이 없습니다" />}
        </section>
        <section className="admin-card admin-panel">
          <h2>최근 등록 매물 {recentSales.length}건</h2>
          {recentSales.length ? (
            <ul className="admin-loglist dash-recent">
              {recentSales.map((s) => (
                <li key={s.salesIdx}>
                  <Link to={detailHref(s.salesIdx)} className="dash-row-link" aria-label={`${s.estName} 상세 보기`}>
                    <strong>{s.estName}</strong>
                    {s.city && <span className="admin-tag">{cityShort(s.city)}</span>}
                    <time dateTime={s.salesDate}>{mmdd(s.salesDate)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty title="최근 등록 매물이 없습니다" />}
        </section>
      </div>
      {detailId && <ListingModal key={detailId} id={detailId} onClose={closeDetail} />}
    </div>
  );
}
