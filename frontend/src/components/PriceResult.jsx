import { Link } from 'react-router-dom';
import { MAP_PATH } from '../constants/menus';
import { formatArea, formatPrice, perPyeong } from '../utils/format';
import Disclaimer from './Disclaimer';

/** 가격 예측 결과. guAvg = 같은 구 실거래 평균 평당가 */
export default function PriceResult({ input, price, guAvg }) {
  const myPerPyeong = perPyeong(price, input.areaM2);
  const vsGu = guAvg ? ((myPerPyeong - guAvg) / guAvg) * 100 : null;
  const area = Number(input.areaM2);
  const mapLink = `${MAP_PATH}?gu=${encodeURIComponent(input.gu)}&minArea=${Math.floor(area - 10)}&maxArea=${Math.ceil(area + 10)}`;

  return (
    <section className="card result">
      {/* 머리 줄: 왼쪽 제목, 오른쪽 다음 행동 버튼 (아래는 예상가 → 요약 숫자 → 참고용 안내로 끊김 없이) */}
      <div className="card-head">
        <span className="result-title">
          <span className="eyebrow">AI 예상가</span>
          <span className="tag-ai">AI</span>
        </span>
        <Link to={mapLink} className="btn btn-ghost btn-sm result-action">비슷한 면적 매물 지도에서 보기</Link>
      </div>
      <p className="result-price">{formatPrice(price)}</p>
      <p className="muted">
        {input.gu}, {formatArea(input.areaM2)}, {input.floor}층, {input.builtYear}년 준공
      </p>

      <div className="detail-kpis">
        <div className="kpi">
          <span>예상 평당가</span>
          <strong>{formatPrice(myPerPyeong)}</strong>
        </div>
        <div className="kpi">
          <span>{input.gu} 실거래 평균</span>
          <strong>{guAvg ? formatPrice(guAvg) : '—'}</strong>
        </div>
        <div className="kpi">
          <span>평균 대비</span>
          <strong className={vsGu === null ? '' : vsGu > 0 ? 'text-up' : 'text-down'}>
            {vsGu === null ? '—' : `${vsGu > 0 ? '+' : ''}${vsGu.toFixed(1)}%`}
          </strong>
        </div>
      </div>

      <Disclaimer />
    </section>
  );
}
