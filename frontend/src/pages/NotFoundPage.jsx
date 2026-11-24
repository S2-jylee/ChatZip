import { Link } from 'react-router-dom';
import { Empty } from '../components/Status';
import { useTitle } from '../utils/useTitle';

export default function NotFoundPage() {
  useTitle('페이지를 찾을 수 없음');
  return (
    <div className="container section">
      <Empty title="페이지를 찾을 수 없습니다">
        <Link to="/">홈으로 돌아가기</Link>
      </Empty>
    </div>
  );
}
