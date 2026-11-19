import { Link } from 'react-router-dom';
import {
  AI_BADGE, dealLabel, formatArea, formatDate, formatDealPrice, formatPriceCompact, isNewBuild, stationText,
} from '../utils/format';
import { useDetailHref } from '../utils/detailLink';
import { useViewed } from '../utils/viewed';

/**
 * 매물 한 줄 — 지도 목록 · 추천 결과 · 관심 목록에서 공통 사용. 누르면 상세 모달
 * variant="card": 관심매물용 카드 (면적 ㎡ 정수, "13억 5,000" 가격 + 거래일, AI 판정 배지 aiKind = fair|low|high)
 */
export default function AptListItem({ apt, rank, active, onHover, actions, leading, variant, aiKind }) {
  const detailHref = useDetailHref();
  const viewed = useViewed().has(apt.aptId);
  const card = variant === 'card';
  const area = card ? `${Math.round(Number(apt.areaM2))}㎡` : formatArea(apt.areaM2);
  const price = card && apt.dealType !== 'monthly' ? formatPriceCompact(apt.price) : formatDealPrice(apt);
  return (
    <li
      className={`apt-item${card ? ' apt-fav' : ''}${active ? ' active' : ''}${viewed ? ' viewed' : ''}`}
      onMouseEnter={onHover ? () => onHover(apt.aptId) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
    >
      {leading && <div className="apt-item-leading">{leading}</div>}
      <Link to={detailHref(apt.aptId)} className="apt-item-link">
        {rank && <span className="apt-rank">{rank}</span>}
        <div className="apt-item-body">
          <div className="apt-item-top">
            <strong className="apt-name">{apt.name}</strong>
            {isNewBuild(apt.builtYear) && <span className="new-badge">신축</span>}
            {aiKind && <span className={`ai-badge ai-${aiKind}`}>{AI_BADGE[aiKind]}</span>}
            {!card && viewed && <span className="viewed-badge">본 매물</span>}
            {apt.score !== undefined && <span className="badge">적합도 {apt.score}</span>}
          </div>
          <span className="apt-meta">
            {apt.gu} {apt.dong} · {area} · {apt.floor}층 · {apt.builtYear}년
          </span>
          {apt.nearestStation && <span className="apt-station">{stationText(apt.nearestStation)}</span>}
          <div className="apt-item-bottom">
            <span className="apt-price">
              {apt.dealType && <small className="deal-tag">{dealLabel(apt.dealType)}</small>}
              {price}
            </span>
            <span className="apt-date">거래 {formatDate(apt.dealDate)}</span>
          </div>
        </div>
      </Link>
      {actions && <div className="apt-item-actions">{actions}</div>}
    </li>
  );
}
