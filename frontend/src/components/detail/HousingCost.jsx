import { useState } from 'react';
import { formatPrice } from '../../utils/format';

const DEFAULT_RATE = 5.5; // 전월세 전환율 (연 %). 지역·시기마다 달라 사용자가 바꿀 수 있게

/**
 * 원룸 월 주거비 + 보증금↔월세 환산
 *  - 월 주거비 = 월세 + 관리비 (관리비는 매물 등록 정보가 있을 때만 → 지금은 월세만)
 *  - 환산: 월세 변화 = 보증금 변화 × 전환율 ÷ 12
 */
export default function HousingCost({ apt }) {
  const monthly = apt.dealType === 'monthly';
  const [rate, setRate] = useState(String(DEFAULT_RATE));
  const [delta, setDelta] = useState('1000'); // 보증금을 얼마나 올릴지 (만원, 음수면 내림)

  const r = Number(rate) / 100;
  const d = Number(delta) || 0;
  const rentChange = Math.round((d * r) / 12 * 10) / 10; // 만원/월, 소수 1자리
  const fee = apt.maintenanceFee; // 아직 데이터 없음 (매물 등록 정보)

  // 전세 → 같은 조건의 월세로 바꾸면: 보증금을 1,000만원만 남기고 나머지를 월세로
  const keep = Math.min(1000, apt.price);
  const jeonseAsRent = Math.round(((apt.price - keep) * r) / 12);

  return (
    <section className="modal-section">
      <h3 className="modal-h">월 주거비</h3>
      {monthly ? (
        <div className="cost-total">
          <span>매달 내는 돈</span>
          <strong>{fee != null ? `${(apt.rent + fee).toLocaleString('ko-KR')}만원` : `${apt.rent.toLocaleString('ko-KR')}만원 + 관리비`}</strong>
          <small className="muted">{fee != null ? `월세 ${apt.rent}만원 + 관리비 ${fee}만원` : '관리비 정보가 없어 월세만 표시합니다.'}</small>
        </div>
      ) : (
        <div className="cost-total">
          <span>월세로 바꾸면 (보증금 {formatPrice(keep)} 기준)</span>
          <strong>월 약 {jeonseAsRent.toLocaleString('ko-KR')}만원</strong>
          <small className="muted">전세 보증금 {formatPrice(apt.price)} 중 {formatPrice(apt.price - keep)}을 전환율 {rate}%로 환산</small>
        </div>
      )}

      <div className="calc">
        <strong className="calc-title">보증금 ↔ 월세 환산</strong>
        <div className="calc-row">
          <label>
            보증금을
            <input type="number" step="100" value={delta} onChange={(e) => setDelta(e.target.value)} aria-label="바꿀 보증금 (만원)" />
            만원 {d >= 0 ? '올리면' : '내리면'}
          </label>
          <span className="calc-out">월세 <b>{Math.abs(rentChange).toLocaleString('ko-KR')}만원</b> {rentChange >= 0 ? '↓ 줄어듦' : '↑ 늘어남'}</span>
        </div>
        <label className="calc-rate">
          전환율 (연)
          <input type="number" step="0.1" min="0" value={rate} onChange={(e) => setRate(e.target.value)} aria-label="전월세 전환율 (%)" />%
        </label>
        <p className="muted small">전월세 전환율은 지역·시기마다 다릅니다. 계산은 참고용입니다.</p>
      </div>
    </section>
  );
}
