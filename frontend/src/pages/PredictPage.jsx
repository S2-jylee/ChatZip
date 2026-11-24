import { useState } from 'react';
import PredictForm from '../components/PredictForm';
import PriceResult from '../components/PriceResult';
import { Empty, ErrorBox, Loading } from '../components/Status';
import { predictPrice } from '../api/predict';
import { searchApartments } from '../api/apartments';
import { errorMessage } from '../api/client';
import { statsByGu } from '../utils/format';
import { useTitle } from '../utils/useTitle';

export default function PredictPage() {
  const [result, setResult] = useState(null); // { input, price, guAvg }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastInput, setLastInput] = useState(null); // 다시 시도용
  useTitle('AI 가격 예측');

  const run = async (input) => {
    setLastInput(input);
    setLoading(true);
    setError('');
    try {
      // 예측과 구 평균 조회를 동시에. 구 평균은 실패해도 예측 결과는 보여줌
      const [price, sameGu] = await Promise.all([
        predictPrice(input),
        searchApartments({ gu: input.gu }).catch(() => []),
      ]);
      setResult({ input, price, guAvg: statsByGu(sameGu)[0]?.avgPerPyeong ?? null });
    } catch (err) {
      setResult(null);
      setError(errorMessage(err, '예측 서버에서 결과를 받지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  let content;
  if (loading) content = <Loading text="AI가 가격을 예측하는 중…" />;
  else if (error) content = <ErrorBox message={error} onRetry={lastInput ? () => run(lastInput) : undefined} />;
  else if (result) content = <PriceResult input={result.input} price={result.price} guAvg={result.guAvg} />;
  else content = <Empty title="결과가 여기에 표시됩니다">아파트 정보를 입력하고 예측해 보세요.</Empty>;

  return (
    <div className="container section">
      <header className="page-head">
        <h1>AI 가격 예측</h1>
        <p className="muted">조건을 직접 입력하면 실거래 데이터로 학습한 모델이 예상가를 알려드려요.</p>
      </header>
      {/* 위쪽 입력 바 + 아래 결과 (매물찾기 · 맞춤 추천과 같은 배치) */}
      <PredictForm onSubmit={run} loading={loading} />
      <section className="predict-results">{content}</section>
    </div>
  );
}
