import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import QuickLinks from '../components/QuickLinks';
import { Loading } from '../components/Status';
import { searchApartments } from '../api/apartments';
import { DATA_SOURCE } from '../constants/regions';
import { formatArea, formatDate, formatPrice, perPyeong, statsByGu, tierOf } from '../utils/format';

export default function HomePage() {
  const [apartments, setApartments] = useState(null);

  useEffect(() => {
    let cancelled = false;
    searchApartments({})
      .then((data) => { if (!cancelled) setApartments(data); })
      .catch(() => { if (!cancelled) setApartments([]); });
    return () => { cancelled = true; };
  }, []);

  const guStats = useMemo(() => statsByGu(apartments ?? []), [apartments]);
  const recent = useMemo(
    () => [...(apartments ?? [])].sort((a, b) => String(b.dealDate).localeCompare(String(a.dealDate))).slice(0, 6),
    [apartments],
  );
  const maxAvg = guStats[0]?.avgPerPyeong ?? 1;

  return (
    <>
      {/* ---------- 히어로: 가로로 넓은 검색 ---------- */}
      <section className="hero">
        <div className="container hero-wide">
          <div className="hero-copy">
            <span className="hero-badge">AI 부동산 매물 추천</span>
            <h1 className="hero-title">
              첫 집 찾기, <span className="text-gradient">데이터로 확인하고</span> 고르세요
            </h1>
            <p className="hero-sub">실거래가 지도 검색 · 조건 맞춤 추천 · AI 적정가 비교를 ChatZip 한 곳에서</p>
            <SearchBar />
            <div className="hero-stats">
              <div><strong>{apartments ? apartments.length.toLocaleString() : '—'}</strong><span>실거래 매물</span></div>
              <div><strong>{guStats.length || '—'}</strong><span>서울 자치구</span></div>
              <div><strong>±5%</strong><span>AI 적정가 판정</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 이용 방법 ---------- */}
      <section className="container section">
        <div className="section-head">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>찾고, 판단하고, 모으기</h2>
        </div>
        <QuickLinks />
      </section>

      {/* ---------- 구별 평균 시세 ---------- */}
      <section className="section section-tinted">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">MARKET</span>
            <h2>구별 평균 평당가</h2>
            <p className="muted">구를 누르면 해당 지역 매물을 지도에서 볼 수 있어요.</p>
          </div>
          {!apartments ? <Loading /> : (
            <div className="gu-grid">
              {guStats.map((s, i) => (
                <Link key={s.gu} to={`/apartment?gu=${encodeURIComponent(s.gu)}`} className="gu-card">
                  <div className="gu-card-top">
                    <span className="gu-rank">{i + 1}</span>
                    <strong>{s.gu}</strong>
                    <span className="muted small">{s.count}건</span>
                  </div>
                  <p className="gu-price">평당 {formatPrice(s.avgPerPyeong)}</p>
                  <div className="gu-bar"><div style={{ width: `${(s.avgPerPyeong / maxAvg) * 100}%` }} /></div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- 최근 실거래 ---------- */}
      <section className="container section">
        <div className="section-head row">
          <div>
            <span className="eyebrow">RECENT DEALS</span>
            <h2>최근 실거래</h2>
          </div>
          <Link to="/apartment" className="btn btn-ghost btn-sm">전체 보기 →</Link>
        </div>
        {!apartments ? <Loading /> : (
          <div className="card-grid">
            {recent.map((apt) => (
              <Link key={apt.aptId} to={`/apartments/${apt.aptId}`} className="apt-card">
                <div className="apt-card-top">
                  <span className={`tier-tag tier-${tierOf(apt.price)}`}>{apt.gu}</span>
                  <span className="muted small">{formatDate(apt.dealDate)}</span>
                </div>
                <strong className="apt-card-name">{apt.name}</strong>
                <span className="muted small">{formatArea(apt.areaM2)} · {apt.floor}층 · {apt.builtYear}년</span>
                <div className="apt-card-bottom">
                  <span className="apt-price">{formatPrice(apt.price)}</span>
                  <span className="muted small">평당 {formatPrice(perPyeong(apt.price, apt.areaM2))}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <p className="muted small source">데이터 출처: {DATA_SOURCE}</p>
      </section>
    </>
  );
}
