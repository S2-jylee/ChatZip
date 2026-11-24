import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import FavoriteButton from '../components/FavoriteButton';
import Icon from '../components/Icon';
import { Empty, ErrorBox, Loading } from '../components/Status';
import { getPopular, searchApartments } from '../api/apartments';
import { DATA_SOURCE, REGIONS } from '../constants/regions';
import { formatDate, formatPrice, statsByGu } from '../utils/format';
import { useDetailHref } from '../utils/detailLink';
import { photoOf } from '../utils/photo';
import { useTitle } from '../utils/useTitle';
import { ANALYSIS_PATH, FAVORITES_PATH, SEARCH_PATH } from '../constants/menus';

export default function HomePage() {
  const detailHref = useDetailHref();
  const [apartments, setApartments] = useState(null);
  const [popular, setPopular] = useState(null);
  const [aptError, setAptError] = useState(false);
  const [popError, setPopError] = useState(false);
  useTitle(''); // 홈은 기본 제목

  // 섹션별로 따로 불러오고, 실패하면 그 섹션에만 "다시 시도"
  const loadApartments = useCallback(() => {
    let cancelled = false;
    setApartments(null);
    setAptError(false);
    searchApartments({})
      .then((data) => { if (!cancelled) setApartments(data); })
      .catch(() => { if (!cancelled) setAptError(true); });
    return () => { cancelled = true; };
  }, []);
  const loadPopular = useCallback(() => {
    let cancelled = false;
    setPopular(null);
    setPopError(false);
    getPopular(5)
      .then((data) => { if (!cancelled) setPopular(data); })
      .catch(() => { if (!cancelled) setPopError(true); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => loadApartments(), [loadApartments]);
  useEffect(() => loadPopular(), [loadPopular]);

  const guStats = useMemo(() => statsByGu(apartments ?? []), [apartments]);
  const recent = useMemo(
    () => [...(apartments ?? [])].sort((a, b) => String(b.dealDate).localeCompare(String(a.dealDate))).slice(0, 5),
    [apartments],
  );
  const maxAvg = guStats[0]?.avgPerPyeong ?? 1;

  return (
    <>
      {/* ---------- 히어로: 왼쪽 정렬 검색 + 지역 바로가기 + 출처 ---------- */}
      <section className="hero">
        <div className="container home-hero">
          <div className="hero-copy">
            <p className="hero-eyebrow">경기 성남 · 용인 · 수원 아파트</p>
            <h1 className="hero-title">실거래가로 확인하는<br />우리 동네 아파트 시세</h1>
            <p className="hero-sub">국토교통부 공개 데이터를 바탕으로 매물을 찾고, 비교하고, 시세를 확인하세요.</p>
            <SearchBar />
            <div className="hero-quick">
              <span className="hero-quick-label">지역 바로 보기</span>
              <ul className="hero-chips">
                {REGIONS.map((g) => (
                  <li key={g}>
                    <Link to={`${SEARCH_PATH}?gu=${encodeURIComponent(g)}`} className="chip">
                      {g.replace('시 ', ' ')}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <p className="hero-trust muted small">
              데이터 출처: {DATA_SOURCE}
              {recent[0] && <> · 최근 거래 {formatDate(recent[0].dealDate)}</>}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- 실시간 인기 매물 TOP 5 ---------- */}
      <section className="container section">
        <div className="section-head row">
          <div>
            <h2>실시간 인기 매물 TOP 5</h2>
            <p className="muted">지금 가장 많이 보고 있는 매물을 확인해보세요.</p>
          </div>
          <Link to={SEARCH_PATH} className="section-link">전체 매물 보기 <Icon name="arrowRight" /></Link>
        </div>
        {popError ? <ErrorBox message="인기 매물을 불러오지 못했습니다." onRetry={loadPopular} />
          : !popular ? <Loading />
          : !popular.length ? <Empty title="아직 인기 매물이 없습니다" />
          : (
          <ol className="pop-grid">
            {popular.map((apt, i) => (
              <li key={apt.aptId} className="pop-card">
                <Link to={detailHref(apt.aptId)} className="pop-link">
                  <div className="pop-thumb">
                    <img src={photoOf(apt, i)} alt="" className="pop-art" loading="lazy" />
                  </div>
                  <div className="pop-body">
                    <span className="pop-title">
                      <span className="pop-rank">{i + 1}</span>
                      <strong className="pop-name">{apt.name}</strong>
                    </span>
                    <span className="muted small">{apt.gu} {apt.dong} · 아파트</span>
                    <span className="muted small">전용 {Math.round(apt.areaM2)}㎡ · {apt.floor}층</span>
                    <div className="pop-bottom">
                      <span className="pop-price">{formatPrice(apt.price)}</span>
                      <span className="deal-chip">매매</span>
                    </div>
                  </div>
                </Link>
                <div className="pop-fav"><FavoriteButton aptId={apt.aptId} icon /></div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ---------- 최근 실거래 TOP 5 | 구별 평균 평당가 (PC 좌우, 휴대폰 위아래) ---------- */}
      <section className="section market-section">
        <div className="container market-row">
          <div className="market-col">
            <div className="section-head">
              <div className="panel-title">
                <h2>최근 실거래 TOP 5</h2>
                <Link to={SEARCH_PATH} className="section-link">전체 보기 <Icon name="arrowRight" /></Link>
              </div>
              <p className="muted">가장 최근에 거래된 매물이에요. <b className="term">전용면적</b>은 현관 안쪽 실제 생활 공간 넓이예요 (84㎡ ≈ 25평).</p>
            </div>
            {aptError ? <ErrorBox message="최근 실거래를 불러오지 못했습니다." onRetry={loadApartments} />
              : !apartments ? <Loading />
              : !recent.length ? <Empty title="최근 거래가 없습니다" />
              : (
              <ol className="recent-list">
                {recent.map((apt, i) => (
                  <li key={apt.aptId}>
                    <Link to={detailHref(apt.aptId)} className="recent-row">
                      <span className="rank-no">{i + 1}</span>
                      <span className="recent-info">
                        <strong>{apt.name}</strong>
                        <span className="muted small">{apt.gu} {apt.dong} · 전용 {Math.round(apt.areaM2)}㎡</span>
                      </span>
                      <span className="recent-date muted small">{formatDate(apt.dealDate)}</span>
                      <span className="recent-price">{formatPrice(apt.price)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="market-col">
            <div className="section-head">
              <div className="panel-title">
                <h2>구별 평균 평당가</h2>
                <Link to={ANALYSIS_PATH} className="section-link">지역별 분석 <Icon name="arrowRight" /></Link>
              </div>
              <p className="muted"><b className="term">평당가</b>는 3.3㎡(1평)당 가격이라 넓이가 달라도 비교할 수 있어요. 구를 누르면 자세한 시세를 볼 수 있어요.</p>
            </div>
            {aptError ? <ErrorBox message="구별 시세를 불러오지 못했습니다." onRetry={loadApartments} />
              : !apartments ? <Loading />
              : !guStats.length ? <Empty title="시세 데이터가 없습니다" />
              : (
              /* 가로 막대 목록: 구 이름 · 막대 · 값을 한 줄에 (색만으로 뜻을 전하지 않게 값은 글자로) */
              <ol className="gu-bars">
                {guStats.map((s, i) => (
                  <li key={s.gu}>
                    <Link to={`${ANALYSIS_PATH}?gu=${encodeURIComponent(s.gu)}`} className="gu-bar-row">
                      <span className="rank-no">{i + 1}</span>
                      <span className="gu-bar-name">
                        <strong>{s.gu}</strong>
                        <span className="muted small">{s.count}건</span>
                      </span>
                      <span className="gu-bar-track" aria-hidden="true">
                        <span style={{ width: `${(s.avgPerPyeong / maxAvg) * 100}%` }} />
                      </span>
                      <span className="gu-bar-value">평당 {formatPrice(s.avgPerPyeong)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* ---------- 아파트 비교: 찜하기 → 고르기 → 비교 순서 안내 ---------- */}
      <section className="container section compare-section">
        <div className="compare-final">
          <div className="compare-final-head">
            <p className="compare-eyebrow">비교하고 고르기</p>
            <h2>마음에 드는 곳을 골라 나란히 비교해보세요</h2>
            <p className="muted">실거래가, 평당가, 준공연도를 한 화면에서 비교할 수 있어요.</p>
          </div>
          <ol className="compare-steps">
            <li>
              <span className="compare-step-icon" aria-hidden="true"><Icon name="heart" size={20} /></span>
              <span className="compare-step-text"><b>찜하기</b><span className="muted small">매물의 하트를 눌러 관심 매물에 담아요</span></span>
            </li>
            <li>
              <span className="compare-step-icon" aria-hidden="true"><Icon name="check" size={20} /></span>
              <span className="compare-step-text"><b>2~3개 고르기</b><span className="muted small">관심 매물에서 비교할 곳을 선택해요</span></span>
            </li>
            <li>
              {/* 저울 선 아이콘 (지도 화면 매물 종류 탭과 같은 모양) */}
              <span className="compare-step-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v16M8 20h8M5 7h14" />
                  <path d="M5 7l-3 6a3 3 0 0 0 6 0L5 7zM19 7l-3 6a3 3 0 0 0 6 0l-3-6z" />
                </svg>
              </span>
              <span className="compare-step-text"><b>한눈에 비교</b><span className="muted small">가격과 조건을 나란히 놓고 봐요</span></span>
            </li>
          </ol>
          <Link to={FAVORITES_PATH} className="btn btn-primary compare-final-btn">관심 매물에서 비교하기</Link>
        </div>
      </section>
    </>
  );
}
