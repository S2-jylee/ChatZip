import { DATA_SOURCE } from '../constants/regions';

/** AI 예상가는 "참고용" 문구와 데이터 출처를 항상 표기 (기획서 3.4). source 로 매물 종류별 출처 지정 */
export default function Disclaimer({ source = DATA_SOURCE }) {
  return (
    <p className="disclaimer">
      AI 예상가는 과거 실거래 데이터로 학습한 모델의 <b>참고용</b> 추정치이며 실제 시세와 다를 수 있습니다.
      <br />데이터 출처: {source}
    </p>
  );
}
