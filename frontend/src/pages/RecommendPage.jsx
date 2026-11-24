import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConditionForm from '../components/ConditionForm';
import AptListItem from '../components/AptListItem';
import MapView from '../components/map/MapView';
import { Empty, ErrorBox, Loading } from '../components/Status';
import { getRecommendations } from '../api/apartments';
import { errorMessage } from '../api/client';
import { useDetailHref } from '../utils/detailLink';
import { useViewed } from '../utils/viewed';

/** 맞춤 추천 — 매물찾기 화면의 "맞춤 추천" 탭 (embedded) */
export default function RecommendPage({ embedded = false }) {
  const [results, setResults] = useState(null); // null = 아직 검색 전
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastConditions, setLastConditions] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const navigate = useNavigate();
  const detailHref = useDetailHref();
  const viewedIds = useViewed();

  const run = async (conditions) => {
    setLoading(true);
    setError('');
    setLastConditions(conditions);
    try {
      const data = await getRecommendations(conditions);
      setResults(data.slice(0, 10));
    } catch (err) {
      setError(errorMessage(err, '추천 결과를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  let content;
  if (loading) content = <Loading text="조건에 맞는 매물을 찾는 중…" />;
  else if (error) content = <ErrorBox message={error} onRetry={() => run(lastConditions)} />;
  else if (results === null) content = <Empty title="조건을 입력해 주세요">예산과 원하는 조건으로 상위 10건을 추천해 드려요.</Empty>;
  else if (!results.length) content = <Empty>예산을 늘리거나 조건을 줄여 보세요.</Empty>;
  else {
    content = (
      <>
        <MapView
          className="result-map"
          apartments={results}
          activeId={activeId}
          onSelect={(apt) => navigate(detailHref(apt.aptId))}
          viewedIds={viewedIds}
        />
        <ul className="apt-list">
          {results.map((apt, i) => (
            <AptListItem key={apt.aptId} apt={apt} rank={i + 1} active={apt.aptId === activeId} onHover={setActiveId} />
          ))}
        </ul>
      </>
    );
  }

  const body = (
      <div className="two-col">
        <ConditionForm onSubmit={run} loading={loading} />
        <section>
          {results && !loading && !error && <h2 className="list-title">추천 결과 {results.length}건</h2>}
          {content}
        </section>
      </div>
  );
  if (embedded) return body;
  return (
    <div className="container section">
      <header className="page-head">
        <h1>맞춤 추천</h1>
        <p className="muted">조건 입력 한 번으로 내게 맞는 매물 10건을 추천받으세요.</p>
      </header>
      {body}
    </div>
  );
}
