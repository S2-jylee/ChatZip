import { Link } from 'react-router-dom';
import { Empty } from '../components/Status';

export default function NotFoundPage() {
  return (
    <div className="container section">
      <Empty title="페이지를 찾을 수 없습니다">
        <Link to="/">홈으로 돌아가기</Link>
      </Empty>
    </div>
  );
}
