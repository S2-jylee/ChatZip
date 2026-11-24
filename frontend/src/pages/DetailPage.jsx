import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AptInfo from '../components/AptInfo';
import PriceCompare from '../components/PriceCompare';
import FavoriteButton from '../components/FavoriteButton';
import AptListItem from '../components/AptListItem';
import MapView from '../components/map/MapView';
import { Empty, ErrorBox, Loading } from '../components/Status';
import { getApartment, searchApartments } from '../api/apartments';
import { predictPrice } from '../api/predict';
import { errorMessage, statusOf } from '../api/client';
import { statsByGu } from '../utils/format';
import { MAP_PATH } from '../constants/menus';
import { useTitle } from '../utils/useTitle';

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // 공유 링크로 바로 들어온 경우(앱 안 이전 기록 없음) 뒤로 가기 대신 지도로
  const goBack = () => (location.key === 'default' ? navigate(MAP_PATH) : navigate(-1));
  const [apt, setApt] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | notfound | error
  const [error, setError] = useState('');
  const [prediction, setPrediction] = useState({ loading: false, value: null, error: '' });
  const [sameGu, setSameGu] = useState([]);
  useTitle(apt?.name ?? (state === 'notfound' ? '없는 매물' : '매물 상세'));

  const loadApt = useCallback(() => {
    let cancelled = false;
    setState('loading');
    getApartment(id)
      .then((data) => { if (!cancelled) { setApt(data); setState('ok'); } })
      .catch((err) => {
        if (cancelled) return;
        if (statusOf(err) === 404) setState('notfound');
        else { setError(errorMessage(err, '매물 정보를 불러오지 못했습니다.')); setState('error'); }
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => loadApt(), [loadApt]);

  // 매물 정보가 오면 같은 조건으로 AI 예상가 요청
  const loadPrediction = useCallback(() => {
    if (!apt) return undefined;
    let cancelled = false;
    setPrediction({ loading: true, value: null, error: '' });
    predictPrice({ gu: apt.gu, areaM2: apt.areaM2, floor: apt.floor, builtYear: apt.builtYear })
      .then((value) => { if (!cancelled) setPrediction({ loading: false, value, error: '' }); })
      .catch((err) => {
        if (!cancelled) setPrediction({ loading: false, value: null, error: errorMessage(err, 'AI 예상가를 불러오지 못했습니다.') });
      });
    return () => { cancelled = true; };
  }, [apt]);

  useEffect(() => loadPrediction(), [loadPrediction]);

  // 같은 구 매물 → 구 평균 평당가 · 비슷한 매물
  useEffect(() => {
    if (!apt) return undefined;
    let cancelled = false;
    searchApartments({ gu: apt.gu })
      .then((list) => { if (!cancelled) setSameGu(list); })
      .catch(() => { if (!cancelled) setSameGu([]); });
    return () => { cancelled = true; };
  }, [apt]);

  const guAvg = useMemo(() => statsByGu(sameGu)[0]?.avgPerPyeong ?? null, [sameGu]);
  const similar = useMemo(() => {
    if (!apt) return [];
    return sameGu
      .filter((a) => a.aptId !== apt.aptId)
      .sort((a, b) => Math.abs(a.areaM2 - apt.areaM2) - Math.abs(b.areaM2 - apt.areaM2))
      .slice(0, 3);
  }, [sameGu, apt]);
  const mapItems = useMemo(() => (apt ? [apt] : []), [apt]);

  if (state === 'loading') return <div className="container section"><Loading /></div>;
  if (state === 'notfound') {
    return (
      <div className="container section">
        <Empty title="존재하지 않는 매물입니다">
          <Link to={MAP_PATH}>지도 검색으로 돌아가기</Link>
        </Empty>
      </div>
    );
  }
  if (state === 'error') return <div className="container section"><ErrorBox message={error} onRetry={loadApt} /></div>;

  return (
    <div className="container section">
      <button type="button" className="back-link" onClick={goBack}>← 목록으로</button>
      <div className="detail-grid">
        <div className="detail-col">
          <AptInfo apt={apt} guAvg={guAvg} />
          <section className="card card-flush">
            <div className="card-pad">
              <h2 className="card-title">위치</h2>
              <p className="muted small">{apt.address}</p>
            </div>
            <MapView className="detail-map" apartments={mapItems} selectedId={apt.aptId} maxZoom={16} />
          </section>
        </div>
        <div className="detail-col">
          <PriceCompare
            actual={apt.price}
            predicted={prediction.value}
            loading={prediction.loading}
            error={prediction.error}
            onRetry={loadPrediction}
          />
          <FavoriteButton aptId={apt.aptId} />
          {similar.length > 0 && (
            <section>
              <h2 className="list-title">{apt.gu}의 비슷한 면적 매물</h2>
              <ul className="apt-list">
                {similar.map((a) => <AptListItem key={a.aptId} apt={a} />)}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
